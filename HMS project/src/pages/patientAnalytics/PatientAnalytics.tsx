import { usePatients } from "../../data/activityStore";
import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, Plus, CalendarDays, TrendingUp } from "lucide-react";
import Layout from "../../components/layout/Layout";
import DeleteConfirmationModal from "../../components/common/DeleteConfirmationModal";
import VisitChart from "../../components/dashboard/VisitChart";
import { assertUnchangedRecord } from "../../data/recordCore";
import {
  useVisits,
  useToday,
  dailyVisits,
  dateLabel,
  isDate,
} from "../../data/dashboardStore";
const field = "hms-form-field";
export default function PatientAnalytics({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const today = useToday();
  const patients = usePatients();
  const { records, save, error } = useVisits();
  const [deleteTarget, setDeleteTarget] = useState<(typeof records)[number] | null>(null);
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState(30);
  const day = isDate(params.get("day")) ? params.get("day") : null;
  const [patient, setPatient] = useState("");
  const [date, setDate] = useState(today);
  const [validation, setValidation] = useState("");
  const data = dailyVisits(records, today, range);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const busiest = data.reduce(
    (best, d) => (d.count > best.count ? d : best),
    data[0],
  );
  const visible = records
    .filter(
      (v) =>
        v.date >= data[0].date && v.date <= today && (!day || v.date === day),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  function selectDay(value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set("day", value);
    else next.delete("day");
    setParams(next, { replace: true });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    const person = patients.records.find((p) => p.id === patient);
    if (!person || !isDate(date) || date > today) {
      setValidation(
        "Enter a patient name/ID and a visit date no later than today.",
      );
      return;
    }
    if (
      await save([
        ...records,
        {
          id: crypto.randomUUID(),
          patient: person.name,
          patientRef: person.id,
          date,
        },
      ])
    ) {
      setPatient("");
      setValidation("");
      selectDay(null);
    }
  }
  return (
    <Layout
      activePage="/patient-analytics"
      title="Patient Analytics"
      subtitle="Patient visits over the last seven or thirty days"
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-[1400px] space-y-6 pb-10 text-[var(--hms-text)]">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
              <BarChart3 size={15} />
              Clinical Analytics
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Patient Analytics
            </h1>
            <p className="mt-2 text-sm text-[var(--hms-text-muted)]">
              {dateLabel(data[0].date)} – {dateLabel(today)} · Pakistan dates
            </p>
          </div>
          <label className="text-xs font-medium">
            Date range
            <select
              className={`${field} mt-2 min-w-[170px]`}
              value={range}
              onChange={(e) => {
                setRange(Number(e.target.value));
                selectDay(null);
              }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </label>
        </header>
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total visits", value: String(total), icon: BarChart3 },
            {
              label: "Daily average",
              value: (total / range).toFixed(1),
              icon: TrendingUp,
            },
            {
              label: "Busiest day",
              value: total
                ? `${dateLabel(busiest.date, true)} · ${busiest.count}`
                : "No visits yet",
              icon: CalendarDays,
            },
          ].map((item) => (
            <div key={item.label} className="hms-card rounded-[24px] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--hms-text-muted)]">
                  {item.label}
                </p>
                <item.icon className="text-blue-500" size={18} />
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                {item.value}
              </p>
            </div>
          ))}
        </section>
        <section className="hms-card rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Daily Patient Visits</h2>
            <p className="text-xs text-[var(--hms-text-muted)]">
              Click a bar to view that day's records
            </p>
          </div>
          <VisitChart data={data} monthly={range === 30} onSelect={selectDay} />
          {!records.length && (
            <p className="mt-5 text-sm text-[var(--hms-text-muted)]">
              No visit records yet. Record a visit below to start tracking.
            </p>
          )}
        </section>
        <section className="hms-card rounded-[24px] p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Record a Patient Visit</h2>
          <form
            onSubmit={submit}
            className="grid items-end gap-4 sm:grid-cols-[1fr_190px_auto]"
          >
            <label className="space-y-2 text-xs font-medium">
              <span className="block">Patient name or ID</span>
              <select
                aria-label="Patient name or ID"
                required
                className={field}
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
              >
                <option value="">Select registered patient</option>
                {patients.records.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patientId} · {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs font-medium">
              <span className="block">Visit date</span>
              <input
                required
                type="date"
                max={today}
                className={field}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              <Plus size={16} />
              Record Visit
            </button>
          </form>
          <p className="mt-4 text-xs leading-6 text-[var(--hms-text-muted)]">
            One entry represents one recorded visit. Appointment bookings and
            status updates do not automatically add visits.
          </p>
          {(validation || error) && (
            <p role="alert" className="mt-3 text-sm text-red-500">
              {validation || error}
            </p>
          )}
        </section>
        <section className="hms-card overflow-hidden rounded-[24px]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--hms-border)] p-5">
            <h2 className="font-semibold">
              {day ? `Visits on ${dateLabel(day)}` : "Visit Records"}{" "}
              <span className="ml-2 text-xs font-normal text-[var(--hms-text-muted)]">
                {visible.length}
              </span>
            </h2>
            {day && (
              <button
                className="text-xs text-blue-500"
                onClick={() => selectDay(null)}
              >
                Show all dates
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-[var(--hms-surface-secondary)] text-xs text-[var(--hms-text-muted)]">
                <tr>
                  <th className="px-5 py-4">Patient / ID</th>
                  <th className="px-5 py-4">Visit date</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-[var(--hms-border)]"
                  >
                    <td className="px-5 py-4">{v.patient}</td>
                    <td className="px-5 py-4">{dateLabel(v.date)}</td>
                    <td className="px-5 py-4">
                      <button
                        className="text-xs text-red-500"
                        onClick={() => setDeleteTarget(v)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <p className="py-12 text-center text-sm text-[var(--hms-text-muted)]">
                No visits recorded for this selection.
              </p>
            )}
          </div>
        </section>
      </div>
      {deleteTarget && (
        <DeleteConfirmationModal
          title="Delete visit?"
          description="This visit will be removed from the patient's visit history and analytics."
          recordLabel="Selected visit"
          recordName={deleteTarget.patient}
          recordMeta={`${dateLabel(deleteTarget.date)} · ${deleteTarget.id}`}
          confirmLabel="Delete visit"
          error={error}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            assertUnchangedRecord(records, deleteTarget);
            return save(records.filter((record) => record.id !== deleteTarget.id));
          }}
        />
      )}
    </Layout>
  );
}
