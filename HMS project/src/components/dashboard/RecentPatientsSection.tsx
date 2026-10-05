import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, MoreHorizontal, Users } from "lucide-react";
import { patientActivity, recentPatients, relativeTime } from "../../data/activityModel";
import { useActivityClock, usePatients } from "../../data/activityStore";
import PatientDetails, { patientStatusClass } from "../patients/PatientDetails";

export default function RecentPatientsSection() {
  const { records, error } = usePatients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = useActivityClock();
  const patients = recentPatients(records).slice(0, 4);
  const selected = records.find((patient) => patient.id === selectedId);
  return <>
    <section className="hms-card overflow-hidden rounded-[26px] border border-[var(--hms-border)] text-[var(--hms-text)]">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-7"><div><h2 className="text-base font-semibold tracking-tight">Recent Patients</h2><p className="mt-1.5 text-[11px] text-[var(--hms-text-muted)]">Latest patient registrations and admissions</p></div><Link to="/patients" className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 transition hover:text-blue-400">View patients<ChevronRight size={14} /></Link></div>
      {error && <p role="alert" className="mx-5 mb-5 rounded-xl bg-red-500/10 p-3 text-xs text-red-500">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left"><thead className="border-y border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--hms-text-muted)]"><tr>{["Patient", "Department", "Doctor", "Status"].map((label) => <th key={label} className="px-5 py-4 font-semibold sm:px-7">{label}</th>)}<th className="px-5 py-4"><span className="sr-only">Details</span></th></tr></thead><tbody>{patients.map((patient) => {
        const activity = patientActivity(patient);
        return <tr key={patient.id} className="border-b border-[var(--hms-border)] last:border-0 hover:bg-[var(--hms-surface-secondary)]"><td className="px-5 py-4 sm:px-7"><button type="button" onClick={() => setSelectedId(patient.id)} className="flex items-center gap-3 text-left"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-xs font-semibold text-blue-500">{patient.initials}</span><span><span className="block text-xs font-semibold">{patient.name}</span><span className="mt-1 block text-[10px] text-[var(--hms-text-muted)]">{patient.patientId} · {activity.time ? `${activity.label}: ${relativeTime(activity.time, now)}` : "Date not recorded"}</span></span></button></td><td className="px-5 py-4 text-xs text-[var(--hms-text-secondary)] sm:px-7">{patient.department}</td><td className="px-5 py-4 text-xs text-[var(--hms-text-secondary)] sm:px-7">{patient.doctor}</td><td className="px-5 py-4 sm:px-7"><span className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${patientStatusClass(patient.status)}`}>{patient.status}</span></td><td className="px-5 py-4"><button type="button" aria-label={`Open ${patient.name}'s details`} onClick={() => setSelectedId(patient.id)} className="rounded-lg p-2 text-[var(--hms-text-muted)] hover:text-blue-500"><MoreHorizontal size={17} /></button></td></tr>;
      })}</tbody></table></div>
      {!patients.length && <div className="py-10 text-center"><Users size={26} className="mx-auto text-blue-500" /><p className="mt-3 text-sm font-medium">No patients registered</p><Link to="/patients" className="mt-3 inline-block text-xs text-blue-500">Register a patient</Link></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hms-border)] px-5 py-4 text-[10px] text-[var(--hms-text-muted)] sm:px-7"><span>{patients.length} of {records.length} patients</span><span>Updates from the patient directory</span></div>
    </section>
    {selected && <PatientDetails patient={selected} onClose={() => setSelectedId(null)} />}
  </>;
}
