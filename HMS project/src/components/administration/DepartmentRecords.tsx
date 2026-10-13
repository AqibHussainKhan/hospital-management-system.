import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Plus,
  Pencil,
  Trash2,
  Stethoscope,
  BedDouble,
  FlaskConical,
  Pill,
  HeartPulse,
} from "lucide-react";

import {
  Page,
  Card,
  Stats,
  ErrorMessage,
  Field,
  inputClass,
  buttonClass,
} from "./shared";

import { useRecordStore } from "../../data/recordStore";
import type { RecordStore } from "../../data/recordStore";

import {
  wardStore,
  labStore,
  medicineStore,
  usePatients,
} from "../../data/activityStore";

import {
  doctorStore,
  surgeryStore,
  useDoctors,
} from "../../data/departmentStore";

import { patientInitials } from "../../data/activityModel";
import { assertUnchangedRecord } from "../../data/recordCore";
import { pakistanDate } from "../../data/dateModel";

import ActivityDialog from "../dashboard/ActivityDialog";
import DoctorShareButton from "../doctors/DoctorShareButton";

import type { DoctorRecord } from "../../data/departmentStore";

interface Row {
  id: string;
  [key: string]: unknown;
}

interface FieldSpec {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  optional?: boolean;
}

const configurations = {
  doctors: {
    title: "Doctor Directory",
    path: "/doctors",
    icon: Stethoscope,
    store: doctorStore,
    fields: [
      { key: "name", label: "Doctor name" },
      { key: "specialty", label: "Specialty" },
      { key: "department", label: "Department" },
      {
        key: "experience",
        label: "Experience (optional)",
        optional: true,
      },
      {
        key: "phone",
        label: "Phone (optional)",
        type: "tel",
        optional: true,
      },
      {
        key: "photo",
        label: "Photo URL (https, optional)",
        type: "url",
        optional: true,
      },
      {
        key: "status",
        label: "Status",
        options: ["Active", "Inactive"],
      },
    ],
  },

  wards: {
    title: "Wards & Beds",
    path: "/wards",
    icon: BedDouble,
    store: wardStore,
    fields: [
      { key: "name", label: "Ward / room name" },
      { key: "capacity", label: "Total beds", type: "number" },
      {
        key: "occupied",
        label: "Unassigned occupied beds",
        type: "number",
      },
      {
        key: "status",
        label: "Status",
        options: ["Available", "Maintenance"],
      },
    ],
  },

  tests: {
    title: "Laboratory",
    path: "/laboratory",
    icon: FlaskConical,
    store: labStore,
    fields: [
      { key: "patientRef", label: "Patient", type: "patient" },
      { key: "test", label: "Test name" },
      {
        key: "status",
        label: "Status",
        options: ["Pending", "In Progress", "Completed", "Cancelled"],
      },
      {
        key: "urgent",
        label: "Priority",
        options: ["Routine", "Urgent"],
      },
    ],
  },

  medicines: {
    title: "Pharmacy Inventory",
    path: "/pharmacy",
    icon: Pill,
    store: medicineStore,
    fields: [
      { key: "name", label: "Medicine name" },
      {
        key: "batch",
        label: "Batch number (optional)",
        optional: true,
      },
      { key: "quantity", label: "Stock quantity", type: "number" },
      { key: "reorderLevel", label: "Reorder level", type: "number" },
      {
        key: "expiry",
        label: "Expiry date (optional)",
        type: "date",
        optional: true,
      },
    ],
  },

  surgeries: {
    title: "Operation Theater",
    path: "/operation-theater",
    icon: HeartPulse,
    store: surgeryStore,
    fields: [
      { key: "patientRef", label: "Patient", type: "patient" },
      { key: "doctorRef", label: "Surgeon", type: "doctor" },
      { key: "procedure", label: "Procedure" },
      { key: "theater", label: "Theater" },
      {
        key: "team",
        label: "Surgical team / coordination notes",
        optional: true,
      },
      { key: "date", label: "Date", type: "date" },
      { key: "time", label: "Time (Pakistan)", type: "time" },
      {
        key: "duration",
        label: "Duration (minutes)",
        type: "number",
      },
      {
        key: "status",
        label: "Status",
        options: ["Scheduled", "In Progress", "Completed", "Cancelled"],
      },
    ],
  },
} satisfies Record<
  string,
  {
    title: string;
    path: string;
    icon: typeof Stethoscope;
    store: unknown;
    fields: FieldSpec[];
  }
>;

export default function DepartmentRecords({
  kind,
  onLogout,
}: {
  kind: keyof typeof configurations;
  onLogout: () => void;
}) {
  const config = configurations[kind];
  const store = config.store as unknown as RecordStore<Row>;
  const state = useRecordStore(store);

  const patients = usePatients();
  const doctors = useDoctors();

  const [params] = useSearchParams();

  const [search, setSearch] = useState(params.get("q") || "");
  const [editor, setEditor] = useState<Row | "new" | null>(null);
  const [details, setDetails] = useState<string | null>(params.get("entity"));
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const fields = config.fields as FieldSpec[];

  const defaults = () =>
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        f.options?.[0] ||
          (f.type === "number"
            ? f.key === "duration"
              ? "60"
              : "0"
            : f.type === "date" && !f.optional
              ? pakistanDate()
              : ""),
      ]),
    );

  function open(row: Row | "new") {
    setEditor(row);
    setError("");

    setForm(
      row === "new"
        ? defaults()
        : Object.fromEntries(
            fields.map((f) => [
              f.key,
              f.key === "urgent"
                ? row.urgent
                  ? "Urgent"
                  : "Routine"
                : String(row[f.key] ?? defaults()[f.key]),
            ]),
          ),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    const old = typeof editor === "object" ? editor : null;
    const next: Row = {
      ...old,
      id: old?.id || crypto.randomUUID(),
    };

    for (const f of fields)
      next[f.key] =
        f.type === "number" ? Number(form[f.key]) : form[f.key]?.trim() || "";

    if (kind === "tests" || kind === "surgeries") {
      const person = patients.records.find((p) => p.id === form.patientRef);

      if (!person) {
        setError("Select a registered patient first.");
        return;
      }

      next.patient = person.name;
    }

    if (kind === "tests") {
      next.urgent = form.urgent === "Urgent";
      next.requestedAt = old?.requestedAt || new Date().toISOString();
    }

    if (kind === "medicines" && !next.expiry) delete next.expiry;

    if (kind === "surgeries") {
      const doctor = doctors.records.find(
        (d) => d.id === form.doctorRef && d.status === "Active",
      );

      if (!doctor) {
        setError("Select an active doctor first.");
        return;
      }

      next.surgeon = doctor.name;
    }

    if (kind === "wards") {
      const assigned = patients.records.filter(
        (p) => p.status === "Admitted" && p.wardId === next.id,
      ).length;

      if (
        Number(next.occupied) + assigned > Number(next.capacity) ||
        (next.status === "Maintenance" && assigned)
      ) {
        setError(
          "Capacity cannot be lower than current occupancy, and an occupied ward cannot enter maintenance.",
        );
        return;
      }
    }

    try {
      await store.update((current) => {
        if (old) assertUnchangedRecord(current, old);
        return old
          ? current.map((row) => (row.id === old.id ? next : row))
          : [...current, next];
      });
      setEditor(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Record could not be saved.",
      );
    }
  }

  const visible = state.records.filter((r) =>
    Object.values(r).join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  const detail = state.records.find((r) => r.id === details);
  const Icon = config.icon;

  return (
    <Page
      title={config.title}
      subtitle="Shared hospital records · changes are saved after validation."
      path={config.path}
      onLogout={onLogout}
    >
      <Stats
        items={[
          {
            label: "Total records",
            value: state.loading ? "Loading…" : state.records.length,
          },
          {
            label: "Matching search",
            value: visible.length,
          },
          {
            label: "Active / open",
            value: state.records.filter(
              (r) =>
                !["Inactive", "Completed", "Cancelled", "Maintenance"].includes(
                  String(r.status),
                ),
            ).length,
          },
        ]}
      />

      <ErrorMessage message={state.error} />

      <Card>
        <div className="flex gap-3">
          <input
            aria-label={`Search ${config.title}`}
            className={inputClass}
            placeholder="Search records…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            disabled={state.loading || state.saving}
            className={`${buttonClass} flex shrink-0 items-center gap-2`}
            onClick={() => open("new")}
          >
            <Plus size={16} />
            Add Record
          </button>

          <button
            className="text-sm text-blue-500"
            onClick={() => void state.refresh()}
          >
            Refresh
          </button>
        </div>
      </Card>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((r) => {
          const assigned =
            kind === "wards"
              ? patients.records.filter(
                  (p) => p.status === "Admitted" && p.wardId === r.id,
                ).length
              : 0;

          const occupied = Number(r.occupied || 0) + assigned;

          return (
            <article key={r.id} className="hms-card rounded-[24px] p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                  <Icon size={22} />
                </span>

                <span className="text-xs font-medium text-[var(--hms-text-secondary)]">
                  {String(
                    r.status ||
                      (kind === "medicines"
                        ? r.expiry && String(r.expiry) < pakistanDate()
                          ? "Expired"
                          : Number(r.quantity) <= Number(r.reorderLevel)
                            ? "Low stock"
                            : "In stock"
                        : ""),
                  )}
                </span>
              </div>

              <h2 className="mt-5 text-lg font-semibold">
                {String(r.name || r.test || r.procedure || r.patient)}
              </h2>

              <p className="mt-2 text-sm text-[var(--hms-text-muted)]">
                {kind === "wards"
                  ? r.status === "Maintenance"
                    ? "Unavailable during maintenance"
                    : `${Math.max(0, Number(r.capacity) - occupied)} available · ${occupied}/${r.capacity} occupied`
                  : kind === "tests"
                    ? `${r.patient} · ${r.urgent ? "Urgent" : "Routine"}`
                    : kind === "medicines"
                      ? `${r.quantity} in stock · Reorder at ${r.reorderLevel}`
                      : kind === "doctors"
                        ? `${r.specialty} · ${r.department}`
                        : `${r.patient} · ${r.date} ${r.time}`}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[var(--hms-border)] pt-4 text-sm">
                <button
                  className="text-blue-500"
                  onClick={() => setDetails(r.id)}
                >
                  View {kind === "doctors" ? "Doctor" : "Details"}
                </button>

                <button
                  disabled={state.saving}
                  aria-label="Edit record"
                  className="text-blue-500"
                  onClick={() => open(r)}
                >
                  <Pencil size={16} />
                </button>

                <button
                  disabled={state.saving}
                  aria-label="Delete record"
                  className="text-red-500"
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Delete this record? Linked clinical records may prevent deletion.",
                      )
                    )
                      await state.save(
                        state.records.filter((v) => v.id !== r.id),
                      );
                  }}
                >
                  <Trash2 size={16} />
                </button>

                {kind === "doctors" && (
                  <DoctorShareButton doctor={r as unknown as DoctorRecord} />
                )}
              </div>
            </article>
          );
        })}
      </section>

      {!state.loading && !visible.length && (
        <Card>
          <p className="py-10 text-center text-sm text-[var(--hms-text-muted)]">
            No records found. Add the first record above.
          </p>
        </Card>
      )}

      {editor && (
        <ActivityDialog
          title={editor === "new" ? `Add ${config.title}` : "Edit Record"}
          onClose={() => {
            if (!state.saving) setEditor(null);
          }}
        >
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.options || ["patient", "doctor"].includes(f.type || "") ? (
                  <select
                    aria-label={f.label}
                    required={!f.optional}
                    className={inputClass}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  >
                    {f.type && <option value="">Select {f.type}</option>}

                    {f.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}

                    {f.type === "patient" &&
                      patients.records.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.patientId} · {p.name}
                        </option>
                      ))}

                    {f.type === "doctor" &&
                      doctors.records
                        .filter((d) => d.status === "Active")
                        .map((d) => (
                          <option value={d.id} key={d.id}>
                            {d.name}
                          </option>
                        ))}
                  </select>
                ) : (
                  <input
                    required={!f.optional}
                    maxLength={2000}
                    type={f.type || "text"}
                    min={f.type === "number" ? 0 : undefined}
                    step={f.type === "number" ? 1 : undefined}
                    className={inputClass}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  />
                )}
              </Field>
            ))}

            <ErrorMessage message={error || state.error} />

            <button
              disabled={state.saving}
              className={`${buttonClass} sm:col-span-2`}
            >
              {state.saving ? "Saving…" : "Save Record"}
            </button>

            {kind === "wards" && (
              <p className="text-xs text-[var(--hms-text-muted)] sm:col-span-2">
                Assigned admissions are counted automatically. Unassigned
                occupied beds are a separate opening balance; do not count the
                same patient twice.
              </p>
            )}
          </form>
        </ActivityDialog>
      )}

      {detail && (
        <ActivityDialog title="Record Details" onClose={() => setDetails(null)}>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-500/10 p-4 text-blue-500">
              {patientInitials(
                String(detail.name || detail.patient || "Record"),
              )}
            </span>

            <h2 className="text-xl font-semibold">
              {String(detail.name || detail.test || detail.procedure)}
            </h2>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key}>
                <dt className="text-xs text-[var(--hms-text-muted)]">
                  {f.label}
                </dt>

                <dd className="mt-2 break-words text-sm">
                  {String(detail[f.key] ?? "Not recorded")}
                </dd>
              </div>
            ))}
          </dl>

          <button
            className={`${buttonClass} mt-6`}
            onClick={() => {
              setDetails(null);
              open(detail);
            }}
          >
            Edit Record
          </button>
        </ActivityDialog>
      )}
    </Page>
  );
}
