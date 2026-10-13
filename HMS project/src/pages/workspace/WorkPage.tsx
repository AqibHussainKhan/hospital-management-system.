import { useState } from "react";
import type { FormEvent } from "react";
import {
  Plus,
  FileText,
  CheckCheck,
  CalendarDays,
  Activity,
  Pill,
  ShieldCheck,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAccess } from "../../features/access/useAccess";
import { callRpc, useHospitalRpc } from "../../features/access/rpc";
import { usePatients, useMedicines } from "../../data/activityStore";
import { useRecords, keys } from "../../components/administration/shared";
import type {
  AttendanceRecord,
  BillRecord,
  StaffRecord,
} from "../../data/administrationModel";
import { workDescriptions, workText, workTitles } from "../../data/workModel";
import type { WorkItem, WorkKind } from "../../data/workModel";
import { fullTime } from "../../data/activityModel";
import {
  Page,
  Card,
  Field,
  ErrorMessage,
  Badge,
  Stats,
  buttonClass,
  downloadCsv,
  today,
} from "../../components/administration/shared";
import {
  EmptyState,
  RefreshButton,
  SearchField,
  secondaryButton,
  WorkspaceDialog,
} from "../../components/common/WorkspaceControls";

const icons = {
  clinical: FileText,
  prescriptions: Pill,
  vitals: Activity,
  roster: CalendarDays,
  leave: CalendarDays,
  approvals: ShieldCheck,
};
function initialForm(kind: WorkKind, ownStaff: string | null, patient: string) {
  return {
    patientId: patient,
    staffId: ownStaff || "",
    body: "",
    medicineId: "",
    quantity: "1",
    instructions: "",
    measuredAt: new Date(Date.now() + 5 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    temperature: "",
    pulse: "",
    systolic: "",
    diastolic: "",
    oxygen: "",
    date: today(),
    start: "09:00",
    end: "17:00",
    nextDay: false,
    from: today(),
    to: today(),
    reason: "",
    type: kind === "approvals" ? "attendance" : "",
    targetId: "",
    status: "Present",
    checkIn: "09:00",
    checkOut: "17:00",
  };
}
export default function WorkPage({
  kind,
  onLogout,
}: {
  kind: WorkKind;
  onLogout: () => void;
}) {
  const access = useAccess();
  const [params, setParams] = useSearchParams();
  const [beforeTime, setBeforeTime] = useState<string | null>(null);
  const state = useHospitalRpc<WorkItem[]>("hms_list_work", {
    work_kind: kind,
  });
  const patients = usePatients(),
    medicines = useMedicines();
  const staff = useRecords<StaffRecord>(keys.staff),
    attendance = useRecords<AttendanceRecord>(keys.attendance),
    billing = useRecords<BillRecord>(keys.billing);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [editor, setEditor] = useState<WorkItem | "new" | null>(null);
  const [form, setForm] = useState(() =>
    initialForm(kind, access.staffId, params.get("patient") || ""),
  );
  const [decision, setDecision] = useState<WorkItem | null>(null);
  const [decisionValue, setDecisionValue] = useState("Approved");
  const [reason, setReason] = useState("");
  const [dispense, setDispense] = useState<WorkItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const records = state.data || [];
  const patientFilter = params.get("patient");
  const rows = records.filter(
    (item) =>
      (!patientFilter || item.patient_id === patientFilter) &&
      (filter === "All" || item.status === filter) &&
      JSON.stringify([item.data, item.status, item.department])
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((old) => ({ ...old, [key]: value }));
  const allowedAdd =
    access.can(kind, "add") &&
    (!["leave", "approvals"].includes(kind) || !!access.staffId);
  async function action(
    work: () => Promise<unknown>,
    message: string,
    close?: () => void,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(message);
      close?.();
      state.refresh();
      attendance.refresh();
      billing.refresh();
      medicines.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function open(item?: WorkItem) {
    setError("");
    setEditor(item || "new");
    const base = initialForm(kind, access.staffId, patientFilter || "");
    setForm(
      item
        ? {
            ...base,
            staffId: item.staff_id || "",
            date: workText(item, "date"),
            start: workText(item, "start"),
            end: workText(item, "end"),
            nextDay: item.data.nextDay === true,
          }
        : base,
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const old = editor && editor !== "new" ? editor : null;
    let data: Record<string, unknown> = {},
      status = "";
    if (kind === "clinical") {
      data = { body: form.body };
      status = "Final";
    }
    if (kind === "prescriptions") {
      data = {
        medicineId: form.medicineId,
        quantity: Number(form.quantity),
        instructions: form.instructions,
      };
      status = "Issued";
    }
    if (kind === "vitals") {
      data = {
        measuredAt: new Date(form.measuredAt + "+05:00").toISOString(),
        temperature: Number(form.temperature),
        pulse: Number(form.pulse),
        systolic: Number(form.systolic),
        diastolic: Number(form.diastolic),
        oxygen: Number(form.oxygen),
      };
      status = "Recorded";
    }
    if (kind === "roster") {
      data = {
        date: form.date,
        start: form.start,
        end: form.end,
        nextDay: form.nextDay,
      };
      status = "Scheduled";
    }
    if (kind === "leave") {
      data = { from: form.from, to: form.to, reason: form.reason };
      status = "Pending";
    }
    if (kind === "approvals") {
      data = {
        type: form.type,
        targetId: form.targetId,
        reason: form.reason,
        status: form.status,
        checkIn: form.status === "Present" ? form.checkIn : "",
        checkOut: form.status === "Present" ? form.checkOut : "",
        nextDay: form.nextDay,
      };
      status = "Pending";
    }
    await action(
      () =>
        callRpc("hms_save_work", {
          work_id: old?.id || null,
          work_kind: kind,
          expected_revision: old?.revision || 0,
          patient_record: ["clinical", "prescriptions", "vitals"].includes(kind)
            ? form.patientId
            : null,
          staff_record:
            kind === "roster"
              ? form.staffId
              : ["leave", "approvals"].includes(kind)
                ? access.staffId
                : null,
          next_data: data,
          next_status: status,
        }),
      "Record saved.",
      () => setEditor(null),
    );
  }
  const Icon = icons[kind];
  return (
    <Page
      path={`/${kind}`}
      title={workTitles[kind]}
      subtitle={workDescriptions[kind]}
      onLogout={onLogout}
    >
      <Stats
        items={[
          { label: "Visible records", value: records.length },
          {
            label: "Awaiting action",
            value: records.filter((item) =>
              ["Pending", "Issued", "Partially Dispensed"].includes(
                item.status,
              ),
            ).length,
          },
          {
            label: "Completed / approved",
            value: records.filter((item) =>
              [
                "Final",
                "Recorded",
                "Approved",
                "Dispensed",
                "Scheduled",
              ].includes(item.status),
            ).length,
          },
          { label: "Your workspace", value: access.department || access.label },
        ]}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={`Search ${workTitles[kind].toLowerCase()}…`}
          />
          <select
            aria-label="Filter status"
            className="hms-patient-status-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {["All", ...new Set(records.map((item) => item.status))].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
          {["clinical", "prescriptions", "vitals"].includes(kind) && (
            <select
              aria-label="Filter patient"
              className="hms-patient-status-filter sm:max-w-xs"
              value={params.get("patient") || ""}
              onChange={(event) => {
                const next = new URLSearchParams(params);
                if (event.target.value) next.set("patient", event.target.value);
                else next.delete("patient");
                setParams(next);
                setBeforeTime(null);
              }}
            >
              <option value="">All available patients</option>
              {patients.records.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} · {patient.patientId}
                </option>
              ))}
            </select>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <RefreshButton refresh={state.refresh} loading={state.loading} />
            {access.can(kind, "export") && (
              <button
                type="button"
                className={secondaryButton}
                onClick={() =>
                  downloadCsv(`${kind}.csv`, [
                    [
                      "Date",
                      "Patient / Staff",
                      "Department",
                      "Status",
                      "Details",
                    ],
                    ...rows.map((item) => [
                      item.created_at,
                      workText(item, "patientName") ||
                        workText(item, "staffName"),
                      item.department,
                      item.status,
                      JSON.stringify(item.data),
                    ]),
                  ])
                }
              >
                Export CSV
              </button>
            )}
            {allowedAdd && (
              <button
                type="button"
                className={buttonClass}
                onClick={() => open()}
              >
                <Plus size={15} className="mr-2 inline" />
                {kind === "leave"
                  ? "Request leave"
                  : kind === "approvals"
                    ? "New request"
                    : "Add record"}
              </button>
            )}
          </div>
        </div>
      </Card>
      <ErrorMessage
        message={
          state.error || (!editor && !decision && !dispense ? error : "")
        }
      />
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-500"
        >
          {notice}
        </p>
      )}
      {!rows.length ? (
        <Card>
          <EmptyState
            loading={state.loading}
            text={
              patientFilter
                ? "No records for this patient yet."
                : "No records yet. New updates will appear here."
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">
                    {workText(item, "patientName") ||
                      workText(item, "staffName") ||
                      (kind === "approvals"
                        ? workText(item, "type") === "billing_void"
                          ? "Invoice void"
                          : "Attendance correction"
                        : workTitles[kind])}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--hms-text-muted)]">
                    {item.department || "Hospital"} ·{" "}
                    {fullTime(item.created_at)}
                  </p>
                </div>
                <Badge>{item.status}</Badge>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-7">
                {kind === "clinical" && (
                  <>
                    <p className="text-xs text-blue-500">
                      {workText(item, "category")}
                    </p>
                    <p className="whitespace-pre-wrap">
                      {workText(item, "body")}
                    </p>
                  </>
                )}
                {kind === "prescriptions" && (
                  <>
                    <p className="font-semibold">
                      {workText(item, "medicine")} ·{" "}
                      {workText(item, "quantity")} units
                    </p>
                    <p className="whitespace-pre-wrap">
                      {workText(item, "instructions")}
                    </p>
                    <p className="text-xs text-[var(--hms-text-muted)]">
                      Dispensed: {workText(item, "dispensed")} /{" "}
                      {workText(item, "quantity")}
                    </p>
                    {Array.isArray(item.data.receipts) &&
                      item.data.receipts.map(
                        (receipt: Record<string, unknown>) => (
                          <p
                            key={String(receipt.id)}
                            className="text-xs text-[var(--hms-text-muted)]"
                          >
                            {String(receipt.quantity)} units ·{" "}
                            {fullTime(String(receipt.at))} ·{" "}
                            {String(receipt.reference || "No reference")}
                          </p>
                        ),
                      )}
                  </>
                )}
                {kind === "vitals" && (
                  <>
                    <p>
                      {workText(item, "temperature")} °C · Pulse{" "}
                      {workText(item, "pulse")} bpm
                    </p>
                    <p>
                      BP {workText(item, "systolic")}/
                      {workText(item, "diastolic")} mmHg · SpO₂{" "}
                      {workText(item, "oxygen")}%
                    </p>
                    <p className="text-xs text-[var(--hms-text-muted)]">
                      Measured {fullTime(workText(item, "measuredAt"))}
                    </p>
                  </>
                )}
                {kind === "roster" && (
                  <>
                    <p className="font-semibold">
                      {workText(item, "date")} · {workText(item, "start")} –{" "}
                      {workText(item, "end")}
                      {item.data.nextDay === true ? " (next day)" : ""}
                    </p>
                    <p className="text-xs text-[var(--hms-text-muted)]">
                      Pakistan time (UTC+05:00)
                    </p>
                  </>
                )}
                {kind === "leave" && (
                  <>
                    <p className="font-semibold">
                      {workText(item, "from")} – {workText(item, "to")}
                    </p>
                    <p>{workText(item, "reason")}</p>
                  </>
                )}
                {kind === "approvals" && (
                  <>
                    <p className="font-semibold">
                      {workText(item, "type") === "billing_void"
                        ? "Unpaid invoice void"
                        : "Attendance correction"}
                    </p>
                    <p>{workText(item, "reason")}</p>
                    {item.data.proposed && (
                      <p className="break-words rounded-xl bg-[var(--hms-surface-secondary)] p-3 text-xs">
                        {Object.entries(
                          item.data.proposed as Record<string, unknown>,
                        )
                          .filter(([key]) =>
                            [
                              "date",
                              "status",
                              "checkIn",
                              "checkOut",
                              "service",
                              "amount",
                              "patient",
                              "voided",
                            ].includes(key),
                          )
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(" · ")}
                      </p>
                    )}
                  </>
                )}
                {item.decision_reason && (
                  <p className="rounded-xl bg-[var(--hms-surface-secondary)] p-3 text-xs">
                    Decision: {item.decision_reason}
                  </p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {kind === "roster" && access.can(kind, "edit") && (
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => open(item)}
                  >
                    Edit shift
                  </button>
                )}
                {kind === "leave" &&
                  item.created_by === access.userId &&
                  item.status === "Pending" &&
                  access.can(kind, "edit") && (
                    <button
                      type="button"
                      disabled={busy}
                      className={secondaryButton}
                      onClick={() =>
                        void action(
                          () =>
                            callRpc("hms_save_work", {
                              work_id: item.id,
                              work_kind: kind,
                              expected_revision: item.revision,
                              patient_record: null,
                              staff_record: item.staff_id,
                              next_data: item.data,
                              next_status: "Cancelled",
                            }),
                          "Request cancelled.",
                        )
                      }
                    >
                      Cancel request
                    </button>
                  )}
                {["leave", "approvals"].includes(kind) &&
                  item.status === "Pending" &&
                  item.created_by !== access.userId &&
                  item.staff_id !== access.staffId &&
                  access.can(kind, "approve") && (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => {
                        setError("");
                        setDecision(item);
                        setReason("");
                        setDecisionValue("Approved");
                      }}
                    >
                      <CheckCheck size={15} className="mr-2 inline" />
                      Review request
                    </button>
                  )}
                {kind === "prescriptions" &&
                  ["Issued", "Partially Dispensed"].includes(item.status) &&
                  ["admin", "pharmacist"].includes(access.role) &&
                  access.can(kind, "edit") && (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => {
                        setError("");
                        setDispense(item);
                        setQuantity(
                          String(
                            Number(item.data.quantity) -
                              Number(item.data.dispensed),
                          ),
                        );
                        setReference("");
                      }}
                    >
                      Dispense medicine
                    </button>
                  )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {(beforeTime || records.length === 1000) && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--hms-text-muted)]">
              {beforeTime
                ? "Showing an earlier page of records."
                : "Showing the latest 1,000 matching records."}
            </p>
            <div className="flex gap-2">
              {beforeTime && (
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={state.loading}
                  onClick={() => setBeforeTime(null)}
                >
                  Latest records
                </button>
              )}
              {records.length === 1000 && (
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={state.loading}
                  onClick={() =>
                    setBeforeTime(records[records.length - 1].created_at)
                  }
                >
                  Older records
                </button>
              )}
            </div>
          </div>
        </Card>
      )}
      {editor && (
        <WorkspaceDialog
          busy={busy}
          title={
            editor === "new"
              ? `New ${kind === "clinical" ? "clinical note" : kind === "leave" ? "leave request" : kind === "approvals" ? "approval request" : workTitles[kind].toLowerCase()}`
              : "Edit duty shift"
          }
          description={
            ["clinical", "prescriptions", "vitals"].includes(kind)
              ? "Saved clinical history is retained. Add a new record to document a correction."
              : undefined
          }
          onClose={() => setEditor(null)}
        >
          <form
            onSubmit={(event) => {
              void save(event);
            }}
            className="space-y-5"
          >
            <fieldset disabled={busy} className="space-y-5">
              {["clinical", "prescriptions", "vitals"].includes(kind) && (
                <Field label="Patient">
                  <select
                    required
                    className="hms-form-field"
                    value={form.patientId}
                    onChange={(event) => set("patientId", event.target.value)}
                  >
                    <option value="">Select patient</option>
                    {patients.records.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} · {patient.patientId}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {kind === "clinical" && (
                <Field label="Note">
                  <textarea
                    required
                    maxLength={5000}
                    rows={6}
                    className="hms-form-field"
                    value={form.body}
                    onChange={(event) => set("body", event.target.value)}
                  />
                </Field>
              )}
              {kind === "prescriptions" && (
                <>
                  <Field label="Inventory medicine / batch">
                    <select
                      required
                      className="hms-form-field"
                      value={form.medicineId}
                      onChange={(event) =>
                        set("medicineId", event.target.value)
                      }
                    >
                      <option value="">Select medicine</option>
                      {medicines.records.map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name}
                          {medicine.batch ? ` · ${medicine.batch}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Quantity (units)">
                    <input
                      required
                      type="number"
                      min="1"
                      max="1000"
                      className="hms-form-field"
                      value={form.quantity}
                      onChange={(event) => set("quantity", event.target.value)}
                    />
                  </Field>
                  <Field label="Doctor instructions">
                    <textarea
                      required
                      maxLength={5000}
                      rows={4}
                      className="hms-form-field"
                      value={form.instructions}
                      onChange={(event) =>
                        set("instructions", event.target.value)
                      }
                    />
                  </Field>
                </>
              )}
              {kind === "vitals" && (
                <>
                  <Field label="Measured at (Pakistan time)">
                    <input
                      required
                      type="datetime-local"
                      className="hms-form-field"
                      value={form.measuredAt}
                      onChange={(event) =>
                        set("measuredAt", event.target.value)
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        {
                          key: "temperature",
                          label: "Temperature (°C)",
                          min: 20,
                          max: 50,
                          step: "0.1",
                        },
                        {
                          key: "pulse",
                          label: "Pulse (bpm)",
                          min: 0,
                          max: 300,
                          step: "1",
                        },
                        {
                          key: "systolic",
                          label: "Systolic BP (mmHg)",
                          min: 0,
                          max: 400,
                          step: "1",
                        },
                        {
                          key: "diastolic",
                          label: "Diastolic BP (mmHg)",
                          min: 0,
                          max: 300,
                          step: "1",
                        },
                        {
                          key: "oxygen",
                          label: "SpO₂ (%)",
                          min: 0,
                          max: 100,
                          step: "0.1",
                        },
                      ] as const
                    ).map((field) => (
                      <Field key={field.key} label={field.label}>
                        <input
                          required
                          type="number"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          className="hms-form-field"
                          value={form[field.key]}
                          onChange={(event) =>
                            set(field.key, event.target.value)
                          }
                        />
                      </Field>
                    ))}
                  </div>
                </>
              )}
              {kind === "roster" && (
                <>
                  <Field label="Staff member">
                    <select
                      required
                      disabled={editor !== "new"}
                      className="hms-form-field"
                      value={form.staffId}
                      onChange={(event) => set("staffId", event.target.value)}
                    >
                      <option value="">Select staff</option>
                      {staff.records
                        .filter((item) => item.status === "Active")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.department}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Shift date">
                    <input
                      required
                      type="date"
                      className="hms-form-field"
                      value={form.date}
                      onChange={(event) => set("date", event.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    {(["start", "end"] as const).map((key) => (
                      <Field
                        key={key}
                        label={key === "start" ? "Start time" : "End time"}
                      >
                        <input
                          required
                          type="time"
                          className="hms-form-field"
                          value={form[key]}
                          onChange={(event) => set(key, event.target.value)}
                        />
                      </Field>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.nextDay}
                      onChange={(event) => set("nextDay", event.target.checked)}
                    />
                    Ends the following day
                  </label>
                </>
              )}
              {kind === "leave" && (
                <div className="grid grid-cols-2 gap-4">
                  {(["from", "to"] as const).map((key) => (
                    <Field
                      key={key}
                      label={key === "from" ? "From date" : "To date"}
                    >
                      <input
                        required
                        type="date"
                        min={key === "to" ? form.from : undefined}
                        className="hms-form-field"
                        value={form[key]}
                        onChange={(event) => set(key, event.target.value)}
                      />
                    </Field>
                  ))}
                </div>
              )}
              {kind === "approvals" && (
                <>
                  <Field label="Request type">
                    <select
                      className="hms-form-field"
                      value={form.type}
                      onChange={(event) => {
                        set("type", event.target.value);
                        set("targetId", "");
                      }}
                    >
                      <option value="attendance">Attendance correction</option>
                      {["admin", "cashier"].includes(access.role) && (
                        <option value="billing_void">
                          Unpaid invoice void
                        </option>
                      )}
                    </select>
                  </Field>
                  <Field label="Record">
                    <select
                      required
                      className="hms-form-field"
                      value={form.targetId}
                      onChange={(event) => set("targetId", event.target.value)}
                    >
                      <option value="">Select record</option>
                      {(form.type === "attendance"
                        ? attendance.records
                            .filter((item) => item.staffId === access.staffId)
                            .map((item) => ({
                              id: item.id,
                              label: `${item.date} · ${item.status}`,
                            }))
                        : billing.records
                            .filter((item) => !item.voided && item.paid === 0)
                            .map((item) => ({
                              id: item.id,
                              label: `${item.patient} · ${item.service} · PKR ${item.amount}`,
                            }))
                      ).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {form.type === "attendance" && (
                    <>
                      <Field label="Correct status">
                        <select
                          className="hms-form-field"
                          value={form.status}
                          onChange={(event) =>
                            set("status", event.target.value)
                          }
                        >
                          {["Present", "Absent", "Leave"].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </Field>
                      {form.status === "Present" && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            {(["checkIn", "checkOut"] as const).map((key) => (
                              <Field
                                key={key}
                                label={
                                  key === "checkIn" ? "Check-in" : "Check-out"
                                }
                              >
                                <input
                                  required
                                  type="time"
                                  className="hms-form-field"
                                  value={form[key]}
                                  onChange={(event) =>
                                    set(key, event.target.value)
                                  }
                                />
                              </Field>
                            ))}
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={form.nextDay}
                              onChange={(event) =>
                                set("nextDay", event.target.checked)
                              }
                            />
                            Check-out on following day
                          </label>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
              {["leave", "approvals"].includes(kind) && (
                <Field label="Reason">
                  <textarea
                    required
                    maxLength={2000}
                    className="hms-form-field"
                    rows={4}
                    value={form.reason}
                    onChange={(event) => set("reason", event.target.value)}
                  />
                </Field>
              )}
              <ErrorMessage message={error} />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </button>
                <button className={buttonClass}>
                  {busy ? "Saving…" : "Save record"}
                </button>
              </div>
            </fieldset>
          </form>
        </WorkspaceDialog>
      )}
      {decision && (
        <WorkspaceDialog
          busy={busy}
          title="Review request"
          description={workText(decision, "reason")}
          onClose={() => setDecision(null)}
        >
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                () =>
                  callRpc("hms_decide_work", {
                    work_id: decision.id,
                    expected_revision: decision.revision,
                    decision: decisionValue,
                    reason,
                  }),
                "Decision recorded.",
                () => setDecision(null),
              );
            }}
          >
            <Field label="Decision">
              <select
                className="hms-form-field"
                value={decisionValue}
                onChange={(event) => setDecisionValue(event.target.value)}
              >
                <option value="Approved">Approve</option>
                <option value="Rejected">Reject</option>
              </select>
            </Field>
            <Field label="Decision reason">
              <textarea
                required
                maxLength={1000}
                className="hms-form-field"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <ErrorMessage message={error} />
            <button className={buttonClass} disabled={busy}>
              {busy ? "Saving…" : "Confirm decision"}
            </button>
          </form>
        </WorkspaceDialog>
      )}
      {dispense && (
        <WorkspaceDialog
          busy={busy}
          title={`Dispense ${workText(dispense, "medicine")}`}
          description={`Remaining: ${Number(dispense.data.quantity) - Number(dispense.data.dispensed)} units. Stock and prescription history update together.`}
          onClose={() => setDispense(null)}
        >
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                () =>
                  callRpc("hms_dispense", {
                    prescription_id: dispense.id,
                    expected_revision: dispense.revision,
                    quantity: Number(quantity),
                    reference,
                  }),
                "Medicine dispensed.",
                () => setDispense(null),
              );
            }}
          >
            <Field label="Quantity">
              <input
                required
                type="number"
                min="1"
                max={
                  Number(dispense.data.quantity) -
                  Number(dispense.data.dispensed)
                }
                className="hms-form-field"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </Field>
            <Field label="Receipt / reference">
              <input
                maxLength={200}
                className="hms-form-field"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </Field>
            <ErrorMessage message={error} />
            <button className={buttonClass} disabled={busy}>
              {busy ? "Saving…" : "Confirm dispensing"}
            </button>
          </form>
        </WorkspaceDialog>
      )}
    </Page>
  );
}
