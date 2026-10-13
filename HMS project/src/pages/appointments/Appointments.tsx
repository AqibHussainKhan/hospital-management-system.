import { usePatients } from "../../data/activityStore";
import { useDoctors } from "../../data/departmentStore";
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, CalendarDays } from "lucide-react";
import Layout from "../../components/layout/Layout";
import {
  useAppointments,
  useToday,
  dateLabel,
  isDate,
  timeMinutes,
} from "../../data/dashboardStore";
import type { AppointmentRecord } from "../../data/dashboardStore";
import AppointmentDetails, {
  statusClass,
} from "../../components/dashboard/AppointmentDetails";
import DashboardDialog from "../../components/dashboard/DashboardDialog";
const field = "hms-form-field";
const blank = (date: string) => ({
  patientRef: "",
  doctorRef: "",
  duration: "30",
  patient: "",
  doctor: "",
  department: "",
  date,
  time: "09:00",
  status: "Confirmed" as AppointmentRecord["status"],
});
export default function Appointments({ onLogout }: { onLogout: () => void }) {
  const { records, save, error } = useAppointments();
  const today = useToday();
  const patients = usePatients();
  const doctors = useDoctors();
  const [params, setParams] = useSearchParams();
  const date = isDate(params.get("date")) ? params.get("date") || "" : "";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(
    params.get("entity"),
  );
  useEffect(() => {
    setSelectedId(params.get("entity"));
  }, [params]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(() => blank(today));
  const [validation, setValidation] = useState("");
  const selected = records.find((a) => a.id === selectedId);
  const filtered = records
    .filter(
      (a) =>
        (!date || a.date === date) &&
        (status === "All" || a.status === status) &&
        `${a.patient} ${a.appointmentId} ${a.doctor} ${a.department}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        timeMinutes(a.time) - timeMinutes(b.time),
    );
  function setDate(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("date", value);
    else next.delete("date");
    setParams(next, { replace: true });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      !form.patient.trim() ||
      !form.doctor.trim() ||
      !form.department.trim() ||
      !isDate(form.date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)
    ) {
      setValidation("Enter patient, doctor, department, valid date and time.");
      return;
    }
    const existing = records.find((a) => a.id === editing);
    if (editing && !existing) {
      setValidation("This appointment was removed. Reopen the editor.");
      return;
    }
    const id = existing?.id || crypto.randomUUID();
    const person = patients.records.find((p) => p.id === form.patientRef);
    const doctor = doctors.records.find(
      (d) => d.id === form.doctorRef && d.status === "Active",
    );
    if (!person || !doctor) {
      setValidation("Select a registered patient and active doctor.");
      return;
    }
    const record: AppointmentRecord = {
      ...form,
      duration: Number(form.duration),
      patient: form.patient.trim(),
      doctor: form.doctor.trim(),
      department: form.department.trim(),
      id,
      appointmentId:
        existing?.appointmentId || `APT-${id.slice(0, 8).toUpperCase()}`,
      initials: form.patient
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((v) => v[0])
        .join("")
        .toUpperCase(),
    };
    if (
      await save(
        editing
          ? records.map((a) => (a.id === editing ? record : a))
          : [...records, record],
      )
    ) {
      setFormOpen(false);
      setEditing(null);
      setValidation("");
    }
  }
  function edit(a: AppointmentRecord) {
    const minutes = timeMinutes(a.time);
    setForm({
      patientRef: a.patientRef || "",
      doctorRef: a.doctorRef || "",
      duration: String(a.duration || 30),
      patient: a.patient,
      doctor: a.doctor,
      department: a.department,
      date: a.date,
      time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
      status: a.status,
    });
    setEditing(a.id);
    setValidation("");
    setFormOpen(true);
  }
  return (
    <Layout
      activePage="/appointments"
      title="Appointments"
      subtitle="Manage patient appointments and doctor schedules"
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-[1600px] space-y-6 pb-10 text-[var(--hms-text)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-blue-500">
              Appointment Management
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Appointment Schedule
            </h1>
            <p className="mt-2 text-sm text-[var(--hms-text-muted)]">
              {records.length} records · Times in Pakistan time
            </p>
          </div>
          <button
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
            onClick={() => {
              setEditing(null);
              setForm(blank(date || today));
              setValidation("");
              setFormOpen(true);
            }}
          >
            <Plus size={16} />
            New Appointment
          </button>
        </header>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500"
          >
            {error}
          </p>
        )}
        <section className="hms-card rounded-[24px] p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_180px_auto]">
            <input
              aria-label="Search appointments"
              className={field}
              placeholder="Search patient, doctor or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Appointment status"
              className={field}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["All", "Confirmed", "Waiting", "Completed", "Cancelled"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
            <input
              aria-label="Appointment date filter"
              type="date"
              className={field}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              className="rounded-xl bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-500"
              onClick={() => setDate(today)}
            >
              Today
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--hms-text-muted)]">
            <span>
              Showing {filtered.length} of {records.length}
            </span>
            <button
              className="text-blue-500"
              onClick={() => {
                setDate("");
                setStatus("All");
                setSearch("");
              }}
            >
              Clear Filters
            </button>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <article key={a.id} className="hms-card rounded-[24px] p-5">
              <button
                className="flex w-full items-center gap-3 text-left"
                onClick={() => setSelectedId(a.id)}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-xs font-semibold text-blue-500">
                  {a.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {a.patient}
                  </span>
                  <span className="mt-1 block text-[10px] text-[var(--hms-text-muted)]">
                    {a.appointmentId}
                  </span>
                </span>
              </button>
              <p className="mt-4 text-sm">{a.doctor}</p>
              <p className="mt-1 text-xs text-[var(--hms-text-muted)]">
                {a.department}
              </p>
              <p className="mt-4 flex items-center gap-2 text-xs">
                <CalendarDays size={13} />
                {dateLabel(a.date)} · {a.time}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--hms-border)] pt-4">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] ${statusClass(a.status)}`}
                >
                  {a.status}
                </span>
                <div className="flex gap-3 text-xs">
                  <button
                    className="text-blue-500"
                    onClick={() => setSelectedId(a.id)}
                  >
                    Open
                  </button>
                  <button className="text-blue-500" onClick={() => edit(a)}>
                    Edit
                  </button>
                  <button
                    className="text-red-500"
                    onClick={() => {
                      if (
                        window.confirm(`Delete appointment for ${a.patient}?`)
                      )
                        save(records.filter((r) => r.id !== a.id));
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
        {!filtered.length && (
          <section className="hms-card rounded-[24px] py-14 text-center">
            <CalendarDays className="mx-auto text-blue-500" size={28} />
            <h2 className="mt-3 font-semibold">No appointments found</h2>
            <p className="mt-2 text-sm text-[var(--hms-text-muted)]">
              Add an appointment or clear the filters.
            </p>
          </section>
        )}
        {selected && (
          <AppointmentDetails
            appointment={selected}
            onClose={() => setSelectedId(null)}
            onStatus={(value) =>
              save(
                records.map((a) =>
                  a.id === selected.id ? { ...a, status: value } : a,
                ),
              )
            }
          />
        )}
        {formOpen && (
          <DashboardDialog
            title={editing ? "Edit Appointment" : "New Appointment"}
            onClose={() => setFormOpen(false)}
          >
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-xs">
                <span>Patient</span>
                <select
                  aria-label="Patient"
                  required
                  className={field}
                  value={form.patientRef}
                  onChange={(e) => {
                    const p = patients.records.find(
                      (v) => v.id === e.target.value,
                    );
                    setForm({
                      ...form,
                      patientRef: e.target.value,
                      patient: p?.name || "",
                    });
                  }}
                >
                  <option value="">Select patient</option>
                  {patients.records.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.patientId} · {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-xs">
                <span>Doctor</span>
                <select
                  aria-label="Doctor"
                  required
                  className={field}
                  value={form.doctorRef}
                  onChange={(e) => {
                    const d = doctors.records.find(
                      (v) => v.id === e.target.value,
                    );
                    setForm({
                      ...form,
                      doctorRef: e.target.value,
                      doctor: d?.name || "",
                      department: d?.department || "",
                    });
                  }}
                >
                  <option value="">Select active doctor</option>
                  {doctors.records
                    .filter((d) => d.status === "Active")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="space-y-2 text-xs">
                <span>Duration (minutes)</span>
                <input
                  required
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  className={field}
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                />
              </label>
              {(["department"] as const).map((key) => (
                <label key={key} className="space-y-2 text-xs font-medium">
                  <span className="block">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <input
                    required
                    maxLength={120}
                    className={field}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label className="space-y-2 text-xs font-medium">
                <span className="block">Date</span>
                <input
                  required
                  type="date"
                  className={field}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label className="space-y-2 text-xs font-medium">
                <span className="block">Time (Pakistan)</span>
                <input
                  required
                  type="time"
                  className={field}
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </label>
              <label className="space-y-2 text-xs font-medium">
                <span className="block">Status</span>
                <select
                  className={field}
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as AppointmentRecord["status"],
                    })
                  }
                >
                  {["Confirmed", "Waiting", "Completed", "Cancelled"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
              <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white sm:col-span-2">
                Save Appointment
              </button>
              {(validation || error) && (
                <p role="alert" className="text-sm text-red-500 sm:col-span-2">
                  {validation || error}
                </p>
              )}
            </form>
          </DashboardDialog>
        )}
      </div>
    </Layout>
  );
}
