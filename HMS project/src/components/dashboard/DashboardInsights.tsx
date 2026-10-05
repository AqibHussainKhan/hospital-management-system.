import { useState } from "react";
import { ArrowUpRight, CalendarDays, Clock3, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppointments, useVisits, useToday, dailyVisits, dateLabel, timeMinutes, addDays } from "../../data/dashboardStore";
import type { AppointmentRecord } from "../../data/dashboardStore";
import AppointmentDetails, { statusClass } from "./AppointmentDetails";
import VisitChart from "./VisitChart";
export default function DashboardInsights() {
  const navigate = useNavigate();
  const today = useToday();
  const { records: appointments, save, error: appointmentError } = useAppointments();
  const { records: visits, error: visitError } = useVisits();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const week = dailyVisits(visits, today, 7);
  const total = week.reduce((sum, day) => sum + day.count, 0);
  const previous = dailyVisits(visits, addDays(today, -7), 7).reduce((sum, day) => sum + day.count, 0);
  const change = previous ? ((total - previous) / previous * 100).toFixed(1) + "% vs previous 7 days" : "No previous-week baseline";
  const todays = appointments.filter(a => a.date === today).sort((a, b) => timeMinutes(a.time) - timeMinutes(b.time));
  const selected = appointments.find(a => a.id === selectedId);
  function updateStatus(status: AppointmentRecord["status"]) { return save(appointments.map(a => a.id === selectedId ? { ...a, status } : a)); }
  return <><section className="grid items-stretch gap-5 lg:grid-cols-2 text-[var(--hms-text)]">
    <article className="hms-card flex h-full min-h-[440px] min-w-0 flex-col rounded-[24px] p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Patient Analytics</h2><p className="mt-1 text-xs text-[var(--hms-text-muted)]">Recorded visits · last 7 days</p></div><Link to="/patient-analytics" className="flex shrink-0 items-center gap-1 rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-500">Open <ArrowUpRight size={14} /></Link></div><div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs text-[var(--hms-text-muted)]">Total visits</p><p className="mt-1 text-3xl font-semibold tracking-tight">{total}</p></div><p className="text-right text-[10px] text-[var(--hms-text-muted)]">{change}</p></div><VisitChart data={week} onSelect={date => navigate(`/patient-analytics?day=${date}`)} />
      <div className="mt-auto pt-5"><div className="flex items-center justify-between border-t border-[var(--hms-border)] pt-4 text-xs"><span className="text-[var(--hms-text-muted)]">{dateLabel(week[0].date, true)} – {dateLabel(today, true)}</span><Link to="/patient-analytics" className="font-medium text-blue-500">View 30 days ↗</Link></div>{visitError && <p role="alert" className="mt-3 text-xs text-red-500">{visitError}</p>}{!visits.length && <p className="mt-3 text-xs text-[var(--hms-text-muted)]">No dated visit records yet. Open analytics to record visits.</p>}</div>
    </article>
    <article className="hms-card flex h-full min-h-[440px] min-w-0 flex-col rounded-[24px] p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Today's Appointments</h2><p className="mt-1 text-xs text-[var(--hms-text-muted)]">{dateLabel(today)} · {todays.length} scheduled</p></div><Link to={`/appointments?date=${today}`} className="text-xs font-medium text-blue-500">View all ↗</Link></div><div className="mt-5 flex-1 space-y-3">{todays.slice(0, 3).map(a => <button type="button" key={a.id} onClick={() => setSelectedId(a.id)} className="flex w-full items-center gap-3 rounded-2xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] p-3 text-left transition hover:border-blue-500/40"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-xs font-semibold text-blue-500">{a.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.patient}</span><span className="mt-1 block truncate text-[10px] text-[var(--hms-text-muted)]">{a.doctor} · {a.department}</span></span><span className="shrink-0 text-right"><span className="flex items-center justify-end gap-1 text-[10px]"><Clock3 size={11} />{a.time}</span><span className={`mt-2 inline-block rounded-full px-2 py-1 text-[9px] ${statusClass(a.status)}`}>{a.status}</span></span></button>)}{!todays.length && <div className="flex min-h-[235px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--hms-border)] p-5 text-center"><CalendarDays className="text-blue-500" size={24} /><p className="mt-3 text-sm font-medium">No appointments today</p><p className="mt-2 text-xs text-[var(--hms-text-muted)]">Open the schedule to add an appointment.</p></div>}</div><div className="mt-auto pt-5"><Link to="/appointments" className="flex items-center justify-center gap-2 rounded-xl border border-[var(--hms-border)] px-4 py-3 text-xs font-medium hover:text-blue-500">Open appointment schedule <ChevronRight size={13} /></Link>{appointmentError && <p role="alert" className="mt-3 text-xs text-red-500">{appointmentError}</p>}</div></article>
  </section>{selected && <AppointmentDetails appointment={selected} onClose={() => setSelectedId(null)} onStatus={updateStatus} />}</>;
}
