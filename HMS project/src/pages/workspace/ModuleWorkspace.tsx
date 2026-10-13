import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Eye, Pencil, Download, CreditCard, Printer } from "lucide-react";
import { useHospitalRpc } from "../../features/access/rpc";
import { useAccess } from "../../features/access/useAccess";
import { useRecordStore } from "../../data/recordStore";
import {
  moduleDefinitions,
  moduleStore,
  fieldLabels,
} from "../../data/moduleRegistry";
import type { ModuleRow } from "../../data/moduleRegistry";
import { usePatients, useWards } from "../../data/activityStore";
import { useDoctors } from "../../data/departmentStore";
import {
  Page,
  Card,
  Field,
  Table,
  Stats,
  Badge,
  ErrorMessage,
  keys,
  useRecords,
  rowClass,
  cellClass,
  buttonClass,
  money,
  today,
  downloadCsv,
} from "../../components/administration/shared";
import type {
  StaffRecord,
  PaymentRecord,
} from "../../data/administrationModel";
import { patientInitials, fullTime } from "../../data/activityModel";
import { decimalToPaisa, assertUnchangedRecord } from "../../data/recordCore";
import {
  SearchField,
  RefreshButton,
  EmptyState,
  WorkspaceDialog,
  secondaryButton,
} from "../../components/common/WorkspaceControls";
import { getSupabase } from "../../lib/supabaseClient";

export default function ModuleWorkspace({
  module,
  onLogout,
}: {
  module: string;
  onLogout: () => void;
}) {
  const definition = moduleDefinitions[module],
    access = useAccess(),
    state = useRecordStore(moduleStore(module));
  const hospital = useHospitalRpc<{
    name: string;
    address: string;
    phone: string;
  }>("hms_hospital_settings");
  const [voidInvoice, setVoidInvoice] = useState<ModuleRow | null>(null),
    [voidReason, setVoidReason] = useState("");
  const displayStatus = (row: ModuleRow) =>
    module === "billing"
      ? row.voided
        ? "Voided"
        : Number(row.paid) === Number(row.amount)
          ? "Paid"
          : Number(row.paid) > 0
            ? "Partial"
            : "Unpaid"
      : module === "wards" &&
          row.status !== "Maintenance" &&
          Number(row.actualOccupied ?? row.occupied) >= Number(row.capacity)
        ? "Full"
        : String(row.status || "Available");
  const patients = usePatients(),
    doctors = useDoctors(),
    wards = useWards(),
    staff = useRecords<StaffRecord>(keys.staff);
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || ""),
    [filter, setFilter] = useState("All");
  const [editor, setEditor] = useState<ModuleRow | "new" | null>(null),
    [form, setForm] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<ModuleRow | null>(null),
    [payment, setPayment] = useState<ModuleRow | null>(null),
    [paymentAmount, setPaymentAmount] = useState(""),
    [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<ModuleRow | null>(null),
    [report, setReport] = useState<File | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const records = state.records;
  const rows = records.filter(
    (row) =>
      (filter === "All" || displayStatus(row) === filter) &&
      JSON.stringify(row).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const fields =
    module === "laboratory" && access.role === "doctor"
      ? ["patientRef", "test", "urgent"]
      : module === "patients" && access.role === "ward_incharge"
        ? ["status", "wardId"]
        : module === "appointments" && access.role === "doctor"
          ? ["status"]
          : module === "laboratory" && access.role === "lab_staff"
            ? ["sampleStatus", "status", "result"]
            : module === "wards" && access.role === "ward_incharge"
              ? ["occupied", "status"]
              : definition.fields;
  const set = (key: string, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));
  function open(row?: ModuleRow) {
    setError("");
    setReport(null);
    setEditor(row || "new");
    const initial: Record<string, string> = {
      date: today(),
      time: "09:00",
      duration: "30",
      status:
        module === "patients"
          ? "Outpatient"
          : module === "appointments"
            ? "Confirmed"
            : module === "laboratory"
              ? "Pending"
              : module === "wards"
                ? "Available"
                : module === "operation-theater"
                  ? "Scheduled"
                  : module === "attendance"
                    ? "Present"
                    : "Active",
      sampleStatus: "Pending",
      checkIn: "09:00",
      checkOut: "",
      quantity: "0",
      reorderLevel: "10",
      capacity: "1",
      occupied: "0",
      gender: "Other",
      urgent: "false",
      nextDay: "false",
    };
    if (row)
      for (const key of definition.fields)
        initial[key] = String(row[key] ?? "");
    if (module === "billing" && row) {
      initial.patientId = String(row.patientId);
    }
    setForm(initial);
  }
  function candidate(old: ModuleRow | null): ModuleRow {
    const now = new Date().toISOString(),
      id = old?.id || crypto.randomUUID(),
      get = (key: string) => form[key]?.trim() || "";
    let row: ModuleRow = { ...old, id };
    for (const key of fields)
      row[key] = [
        "age",
        "quantity",
        "reorderLevel",
        "capacity",
        "occupied",
        "duration",
        "amount",
      ].includes(key)
        ? Number(form[key])
        : ["urgent", "nextDay"].includes(key)
          ? form[key] === "true"
          : get(key);
    const p = patients.records.find(
        (patient) =>
          patient.id === (form.patientRef || "") ||
          patient.patientId === form.patientId,
      ),
      d = doctors.records.find((doctor) => doctor.id === form.doctorRef);
    if (module === "patients") {
      if (access.role !== "ward_incharge")
        Object.assign(row, {
          patientId: get("patientId") || `HMS-${id.slice(0, 8).toUpperCase()}`,
          doctor: d?.name || old?.doctor || "",
          department: d?.department || old?.department || "",
          initials: patientInitials(get("name")),
          notes: old?.notes || "",
          registeredAt: old?.registeredAt || now,
        });
      Object.assign(row, {
        updatedAt: now,
        admittedAt:
          row.status === "Admitted" && old?.status !== "Admitted"
            ? now
            : old?.admittedAt || null,
      });
      if (row.status !== "Admitted") delete row.wardId;
    }
    if (module === "doctors") row.photo = old?.photo || "";
    if (module === "appointments" && access.role !== "doctor")
      Object.assign(row, {
        patient: p?.name || "",
        doctor: d?.name || "",
        department: d?.department || "",
        initials: patientInitials(p?.name || ""),
        appointmentId:
          old?.appointmentId || `APT-${id.slice(0, 8).toUpperCase()}`,
      });
    if (module === "laboratory") {
      row.status = row.status || form.status || "Pending";
      if (access.role !== "lab_staff")
        Object.assign(row, {
          patient: p?.name || "",
          requestedAt: old?.requestedAt || now,
        });
      if (row.status === "Completed") row.completedAt = old?.completedAt || now;
    }
    if (module === "operation-theater")
      Object.assign(row, { patient: p?.name || "", surgeon: d?.name || "" });
    if (module === "pharmacy" && !row.expiry) delete row.expiry;
    if (module === "attendance") {
      row.name =
        staff.records.find((item) => item.id === form.staffId)?.name || "";
      if (row.status !== "Present")
        Object.assign(row, { checkIn: "", checkOut: "", nextDay: false });
    }
    if (module === "billing")
      Object.assign(row, {
        patient: p?.name || old?.patient || "",
        paid: old?.paid || 0,
        openingPaid: old?.openingPaid || 0,
        payments: old?.payments || [],
        voided: old?.voided || false,
      });
    return row;
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const old = editor && editor !== "new" ? editor : null;
      const row = candidate(old);
      if (report) {
        if (report.type !== "application/pdf" || report.size > 10 * 1024 * 1024)
          throw new Error("Choose a PDF report up to 10 MB.");
        const path = `${row.id}/${crypto.randomUUID()}.pdf`;
        const { error: failure } = await getSupabase()
          .storage.from("hms-lab-reports")
          .upload(path, report, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (failure)
          throw new Error(
            "Report could not be uploaded. Check the private report storage setup.",
          );
        row.reportPath = path;
      }
      await moduleStore(module).update((current) => {
        if (old) assertUnchangedRecord(current, old);
        return old
          ? current.map((item) => (item.id === old.id ? row : item))
          : [...current, row];
      });
      setEditor(null);
      setReport(null);
      setNotice("Record saved.");
      state.refresh();
      patients.refresh();
      wards.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Record could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!payment || busy) return;
    setBusy(true);
    setError("");
    try {
      const amount = decimalToPaisa(paymentAmount);
      if (
        amount <= 0 ||
        amount >
          Math.round((Number(payment.amount) - Number(payment.paid)) * 100)
      )
        throw new Error("Enter a payment within the outstanding amount.");
      const entries = (payment.payments || []) as PaymentRecord[];
      const row = {
        ...payment,
        openingPaid:
          payment.openingPaid ?? (!payment.payments ? payment.paid : 0),
        payments: [
          ...entries,
          {
            id: crypto.randomUUID(),
            amount,
            receivedAt: new Date().toISOString(),
            reference: reference.trim(),
          },
        ],
        paid: (Math.round(Number(payment.paid) * 100) + amount) / 100,
      };
      await moduleStore(module).update((current) => {
        assertUnchangedRecord(current, payment);
        return current.map((item) => (item.id === row.id ? row : item));
      });
      setPayment(null);
      setReceipt(row);
      setNotice("Payment received and dated receipt saved.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Payment could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function voidUnpaid(event: FormEvent) {
    event.preventDefault();
    if (!voidInvoice || busy) return;
    setBusy(true);
    setError("");
    try {
      await moduleStore(module).update((current) => {
        assertUnchangedRecord(current, voidInvoice);
        return current.map((row) =>
          row.id === voidInvoice.id
            ? { ...row, voided: true, voidReason: voidReason.trim() }
            : row,
        );
      });
      setVoidInvoice(null);
      setNotice("Invoice void recorded.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Invoice could not be voided.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function openReport(row: ModuleRow) {
    const result = await getSupabase()
      .storage.from("hms-lab-reports")
      .createSignedUrl(String(row.reportPath), 60);
    if (result.error) {
      setError("Report is unavailable or your account cannot open it.");
      return;
    }
    window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
  }
  const options = (field: string) => {
    if (field === "status")
      return module === "patients"
        ? ["Admitted", "Outpatient", "Discharged"]
        : module === "appointments"
          ? ["Confirmed", "Waiting", "Completed", "Cancelled"]
          : module === "laboratory"
            ? ["Pending", "In Progress", "Completed", "Cancelled"]
            : module === "wards"
              ? ["Available", "Maintenance"]
              : module === "operation-theater"
                ? ["Scheduled", "In Progress", "Completed", "Cancelled"]
                : module === "attendance"
                  ? ["Present", "Absent", "Leave"]
                  : ["Active", "Inactive"];
    if (field === "gender") return ["Female", "Male", "Other"];
    if (field === "sampleStatus")
      return ["Pending", "Collected", "Received", "Rejected"];
    return null;
  };
  return (
    <Page
      path={`/${module}`}
      title={definition.title}
      subtitle={`${access.label} workspace${access.department ? ` · ${access.department}` : ""}`}
      onLogout={onLogout}
    >
      <Stats
        items={[
          {
            label:
              module === "patients"
                ? "Patients in your scope"
                : "Visible records",
            value: records.length,
          },
          {
            label:
              module === "billing" ? "Active invoices" : "Active / pending",
            value:
              module === "billing"
                ? records.filter((row) => !row.voided).length
                : module === "wards"
                  ? records
                      .filter((row) => row.status !== "Maintenance")
                      .reduce(
                        (sum, row) =>
                          sum +
                          Math.max(
                            0,
                            Number(row.capacity) -
                              Number(row.actualOccupied ?? row.occupied),
                          ),
                        0,
                      )
                  : records.filter((row) =>
                      [
                        "Active",
                        "Admitted",
                        "Confirmed",
                        "Waiting",
                        "Pending",
                        "In Progress",
                        "Scheduled",
                        "Present",
                      ].includes(String(row.status)),
                    ).length,
          },
          {
            label:
              module === "billing"
                ? "Outstanding (PKR)"
                : module === "pharmacy"
                  ? "Low stock batches"
                  : "Completed / inactive",
            value:
              module === "billing"
                ? money(
                    records
                      .filter((row) => !row.voided)
                      .reduce(
                        (sum, row) =>
                          sum + Number(row.amount) - Number(row.paid),
                        0,
                      ),
                  )
                : module === "pharmacy"
                  ? records.filter(
                      (row) => Number(row.quantity) <= Number(row.reorderLevel),
                    ).length
                  : records.filter((row) =>
                      [
                        "Inactive",
                        "Completed",
                        "Discharged",
                        "Cancelled",
                      ].includes(String(row.status)),
                    ).length,
          },
          { label: "Access", value: access.department || access.label },
        ]}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={`Search ${definition.title.toLowerCase()}…`}
          />
          {(module === "billing" || records.some((row) => row.status)) && (
            <select
              className="hms-patient-status-filter"
              aria-label="Filter status"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              {["All", ...new Set(records.map(displayStatus))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <RefreshButton
              refresh={() => {
                void state.refresh();
              }}
              loading={state.loading}
            />
            {access.can(module, "export") && (
              <button
                type="button"
                className={secondaryButton}
                onClick={() =>
                  downloadCsv(`${module}.csv`, [
                    definition.columns.map((key) => fieldLabels[key] || key),
                    ...rows.map((row) =>
                      definition.columns.map((key) =>
                        key === "status"
                          ? displayStatus(row)
                          : key === "occupied"
                            ? String(row.actualOccupied ?? row.occupied)
                            : String(row[key] ?? ""),
                      ),
                    ),
                  ])
                }
              >
                <Download size={15} />
                Export CSV
              </button>
            )}
            {access.can(module, "add") && (
              <button
                type="button"
                className={buttonClass}
                onClick={() => open()}
              >
                <Plus size={15} className="mr-2 inline" />
                Add{" "}
                {module === "patients"
                  ? "patient"
                  : module === "billing"
                    ? "invoice"
                    : "record"}
              </button>
            )}
          </div>
        </div>
      </Card>
      <ErrorMessage
        message={state.error || (!editor && !payment ? error : "")}
      />
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-500"
        >
          {notice}
        </p>
      )}
      <Table
        headers={[
          ...definition.columns.map((key) => fieldLabels[key] || key),
          "Actions",
        ]}
        empty={!rows.length && !state.loading}
      >
        {rows.map((row) => (
          <tr key={row.id} className={rowClass}>
            {definition.columns.map((key, index) => (
              <td
                key={key}
                className={`${cellClass} ${index === 0 ? "font-semibold" : ""}`}
              >
                {key === "status" ? (
                  <Badge>{displayStatus(row)}</Badge>
                ) : ["amount", "paid"].includes(key) ? (
                  money(Number(row[key]))
                ) : (
                  String(
                    key === "occupied"
                      ? (row.actualOccupied ?? row.occupied ?? "—")
                      : (row[key] ?? "—"),
                  )
                )}
              </td>
            ))}
            <td className={cellClass}>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={secondaryButton}
                  aria-label={`View ${String(row.name || row.patient || row.id)}`}
                  onClick={() => setDetail(row)}
                >
                  <Eye size={14} />
                </button>
                {access.can(module, "edit") &&
                  !(
                    module === "billing" &&
                    (Number(row.paid) > 0 || row.voided)
                  ) && (
                    <button
                      type="button"
                      className={secondaryButton}
                      aria-label="Edit record"
                      onClick={() => open(row)}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                {module === "billing" &&
                  !row.voided &&
                  Number(row.paid) < Number(row.amount) &&
                  access.can(module, "edit") && (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => {
                        setError("");
                        setPayment(row);
                        setPaymentAmount("");
                        setReference("");
                      }}
                    >
                      <CreditCard size={14} />
                      Receive
                    </button>
                  )}
                {module === "billing" &&
                  access.isAdmin &&
                  !row.voided &&
                  Number(row.paid) === 0 && (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => {
                        setError("");
                        setVoidInvoice(row);
                        setVoidReason("");
                      }}
                    >
                      Void invoice
                    </button>
                  )}
                {module === "billing" && Number(row.paid) > 0 && (
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => setReceipt(row)}
                  >
                    <Printer size={14} />
                    Receipt
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>
      {state.loading && <EmptyState loading />}
      {module === "attendance" && access.can("approvals", "add") && (
        <Link className={`${secondaryButton} w-fit`} to="/approvals">
          Request attendance correction
        </Link>
      )}
      {module === "billing" && access.can("approvals", "add") && (
        <Link className={`${secondaryButton} w-fit`} to="/approvals">
          Request invoice void
        </Link>
      )}
      {editor && (
        <WorkspaceDialog
          busy={busy}
          title={`${editor === "new" ? "Add" : "Edit"} ${definition.title.toLowerCase()}`}
          onClose={() => setEditor(null)}
        >
          <form
            className="space-y-5"
            onSubmit={(event) => {
              void save(event);
            }}
          >
            <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
              {fields
                .filter(
                  (field) =>
                    !(field === "wardId" && form.status !== "Admitted") &&
                    !(
                      module === "attendance" &&
                      ["checkIn", "checkOut", "nextDay"].includes(field) &&
                      form.status !== "Present"
                    ),
                )
                .map((field) => {
                  const select = options(field);
                  const choices =
                    field === "patientRef"
                      ? patients.records.map((item) => ({
                          value: item.id,
                          label: `${item.name} · ${item.patientId}`,
                        }))
                      : field === "patientId" && module === "billing"
                        ? patients.records.map((item) => ({
                            value: item.patientId,
                            label: `${item.name} · ${item.patientId}`,
                          }))
                        : field === "doctorRef"
                          ? doctors.records
                              .filter((item) => item.status === "Active")
                              .map((item) => ({
                                value: item.id,
                                label: `${item.name} · ${item.department}`,
                              }))
                          : field === "wardId"
                            ? wards.records
                                .filter((item) => item.status !== "Maintenance")
                                .map((item) => ({
                                  value: item.id,
                                  label: item.name,
                                }))
                            : field === "staffId"
                              ? staff.records
                                  .filter((item) => item.status === "Active")
                                  .map((item) => ({
                                    value: item.id,
                                    label: `${item.name} · ${item.department}`,
                                  }))
                              : null;
                  return (
                    <Field
                      key={field}
                      label={
                        module === "wards" && field === "occupied"
                          ? "Unlinked occupied beds"
                          : fieldLabels[field] || field
                      }
                    >
                      {choices ? (
                        <select
                          required
                          className="hms-form-field"
                          value={form[field] || ""}
                          onChange={(event) => set(field, event.target.value)}
                        >
                          <option value="">Select {fieldLabels[field]}</option>
                          {choices.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      ) : select ? (
                        <select
                          className="hms-form-field"
                          value={form[field] || select[0]}
                          onChange={(event) => set(field, event.target.value)}
                        >
                          {select.map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      ) : ["urgent", "nextDay"].includes(field) ? (
                        <select
                          className="hms-form-field"
                          value={form[field] || "false"}
                          onChange={(event) => set(field, event.target.value)}
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      ) : ["result", "team"].includes(field) ? (
                        <textarea
                          maxLength={2000}
                          rows={4}
                          className="hms-form-field"
                          value={form[field] || ""}
                          onChange={(event) => set(field, event.target.value)}
                        />
                      ) : (
                        <input
                          required={
                            ![
                              "phone",
                              "experience",
                              "batch",
                              "expiry",
                              "patientId",
                              "checkOut",
                            ].includes(field) ||
                            (field === "patientId" && module === "billing")
                          }
                          type={
                            ["date", "expiry"].includes(field)
                              ? "date"
                              : ["time", "checkIn", "checkOut"].includes(field)
                                ? "time"
                                : [
                                      "age",
                                      "quantity",
                                      "reorderLevel",
                                      "capacity",
                                      "occupied",
                                      "duration",
                                      "amount",
                                    ].includes(field)
                                  ? "number"
                                  : field === "phone"
                                    ? "tel"
                                    : "text"
                          }
                          min={
                            [
                              "age",
                              "quantity",
                              "reorderLevel",
                              "occupied",
                            ].includes(field)
                              ? 0
                              : ["capacity", "duration", "amount"].includes(
                                    field,
                                  )
                                ? 1
                                : undefined
                          }
                          max={field === "age" ? 130 : undefined}
                          step={field === "amount" ? "0.01" : undefined}
                          maxLength={2000}
                          className="hms-form-field"
                          value={form[field] || ""}
                          onChange={(event) => set(field, event.target.value)}
                        />
                      )}
                    </Field>
                  );
                })}
              {module === "laboratory" &&
                editor !== "new" &&
                ["admin", "lab_staff"].includes(access.role) && (
                  <Field label="Attach PDF report (up to 10 MB)">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hms-form-field py-2"
                      onChange={(event) =>
                        setReport(event.target.files?.[0] || null)
                      }
                    />
                  </Field>
                )}
              <div className="sm:col-span-2">
                <ErrorMessage
                  message={
                    error ||
                    patients.error ||
                    doctors.error ||
                    wards.error ||
                    staff.error
                  }
                />
              </div>
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </button>
                <button className={buttonClass}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </fieldset>
          </form>
        </WorkspaceDialog>
      )}
      {detail && (
        <WorkspaceDialog
          title={String(detail.name || detail.patient || definition.title)}
          onClose={() => setDetail(null)}
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            {Object.entries(detail)
              .filter(
                ([key, value]) =>
                  ![
                    "id",
                    "patientRef",
                    "doctorRef",
                    "staffId",
                    "wardId",
                    "payments",
                    "reportPath",
                  ].includes(key) &&
                  typeof value !== "object" &&
                  String(value ?? "") !== "",
              )
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-[var(--hms-text-muted)]">
                    {fieldLabels[key] || key.replace(/([A-Z])/g, " $1")}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">
                    {String(value)}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            {module === "patients" &&
              ["clinical", "prescriptions", "vitals"]
                .filter((kind) => access.can(kind))
                .map((kind) => (
                  <Link
                    key={kind}
                    className={secondaryButton}
                    to={`/${kind}?patient=${detail.id}`}
                  >
                    {kind === "clinical"
                      ? "Clinical notes"
                      : kind === "prescriptions"
                        ? "Prescriptions"
                        : "Vital signs"}
                  </Link>
                ))}
            {module === "laboratory" && !!detail.reportPath && (
              <button
                type="button"
                className={secondaryButton}
                onClick={() => void openReport(detail)}
              >
                Open PDF report
              </button>
            )}
          </div>
        </WorkspaceDialog>
      )}
      {payment && (
        <WorkspaceDialog
          busy={busy}
          title="Receive payment"
          description={`${payment.patient} · ${payment.service} · Outstanding ${money(Number(payment.amount) - Number(payment.paid))}`}
          onClose={() => setPayment(null)}
        >
          <form
            className="space-y-5"
            onSubmit={(event) => {
              void pay(event);
            }}
          >
            <Field label="Payment amount (PKR)">
              <input
                required
                type="number"
                min="0.01"
                max={Number(payment.amount) - Number(payment.paid)}
                step="0.01"
                className="hms-form-field"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </Field>
            <Field label="Payment reference">
              <input
                maxLength={2000}
                className="hms-form-field"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </Field>
            <ErrorMessage message={error} />
            <button disabled={busy} className={buttonClass}>
              {busy ? "Saving…" : "Record receipt"}
            </button>
          </form>
        </WorkspaceDialog>
      )}
      {voidInvoice && (
        <WorkspaceDialog
          busy={busy}
          title="Void unpaid invoice"
          description={`${String(voidInvoice.patient)} · ${String(voidInvoice.service)}. The invoice and its reason remain in the hospital history.`}
          onClose={() => setVoidInvoice(null)}
        >
          <form
            className="space-y-5"
            onSubmit={(event) => void voidUnpaid(event)}
          >
            <Field label="Void reason">
              <textarea
                required
                maxLength={1000}
                className="hms-form-field"
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
              />
            </Field>
            <ErrorMessage message={error} />
            <button className={buttonClass} disabled={busy}>
              {busy ? "Saving…" : "Void invoice"}
            </button>
          </form>
        </WorkspaceDialog>
      )}
      {receipt && (
        <WorkspaceDialog
          title="Payment receipt"
          onClose={() => setReceipt(null)}
        >
          <section data-hms-receipt className="space-y-5">
            <div>
              <p className="text-lg font-semibold">
                {hospital.data?.name || "MediCore Hospital"}
              </p>
              {(hospital.data?.address || hospital.data?.phone) && (
                <p className="mt-2 text-xs">
                  {[hospital.data.address, hospital.data.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <p className="mt-1 text-xs">
                Payment receipt · {String(receipt.id)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <p>Patient: {String(receipt.patient)}</p>
              <p>Patient ID: {String(receipt.patientId)}</p>
              <p>Service: {String(receipt.service)}</p>
              <p>Issued: {String(receipt.date)}</p>
            </div>
            <div className="rounded-xl bg-[var(--hms-surface-secondary)] p-4">
              <p>Invoice: {money(Number(receipt.amount))}</p>
              <p>Received: {money(Number(receipt.paid))}</p>
              <p className="font-semibold">
                Outstanding:{" "}
                {money(Number(receipt.amount) - Number(receipt.paid))}
              </p>
            </div>
            {((receipt.payments || []) as PaymentRecord[]).map((item) => (
              <p
                key={item.id}
                className="border-b border-[var(--hms-border)] pb-3 text-xs"
              >
                {fullTime(item.receivedAt)} · {money(item.amount / 100)} ·{" "}
                {item.reference || "No reference"}
              </p>
            ))}
          </section>
          <button
            type="button"
            className={`${buttonClass} mt-6`}
            onClick={() => window.print()}
          >
            <Printer size={15} className="mr-2 inline" />
            Print / save PDF
          </button>
        </WorkspaceDialog>
      )}
    </Page>
  );
}
