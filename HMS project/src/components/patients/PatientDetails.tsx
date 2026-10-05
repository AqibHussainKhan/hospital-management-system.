import { useState } from "react";
import { Pencil, Phone, UserRound } from "lucide-react";
import ActivityDialog from "../dashboard/ActivityDialog";
import { fullTime, patientStatuses } from "../../data/activityModel";
import type { PatientRecord } from "../../data/activityModel";
import { setPatientStatus } from "../../data/activityStore";

export function patientStatusClass(status: PatientRecord["status"]) {
  return status === "Admitted" ? "bg-blue-500/10 text-blue-500" : status === "Outpatient" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500";
}

export default function PatientDetails({ patient, onClose, onEdit }: {
  patient: PatientRecord; onClose: () => void; onEdit?: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <ActivityDialog title="Patient Details" onClose={onClose}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-lg font-semibold text-blue-500">{patient.initials}</span>
          <div><h3 className="text-xl font-semibold tracking-tight">{patient.name}</h3><p className="mt-1 text-xs text-[var(--hms-text-muted)]">{patient.patientId}</p></div>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${patientStatusClass(patient.status)}`}>{patient.status}</span>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        {[["Department", patient.department], ["Assigned doctor", patient.doctor], ["Age / Gender", `${patient.age} years · ${patient.gender}`], ["Phone", patient.phone || "Not recorded"], ["Registered (Pakistan time)", fullTime(patient.registeredAt)], ["Last admission (Pakistan time)", fullTime(patient.admittedAt)], ["Last updated (Pakistan time)", fullTime(patient.updatedAt)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] p-4"><dt className="text-[11px] text-[var(--hms-text-muted)]">{label}</dt><dd className="mt-2 text-sm font-medium">{value}</dd></div>)}
      </dl>
      {patient.notes && <section className="mt-5 rounded-2xl border border-[var(--hms-border)] p-4"><h4 className="text-xs font-semibold">Notes</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--hms-text-secondary)]">{patient.notes}</p></section>}
      <label className="mt-6 block text-xs font-medium"><span className="mb-2 flex items-center gap-2"><UserRound size={14} />Patient status</span><select value={patient.status} onChange={async (event) => { try { await setPatientStatus(patient.id, event.target.value as PatientRecord["status"]); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Status could not be saved."); } }} className="w-full rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] px-3 py-3 text-sm outline-none focus:border-blue-500">{patientStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-500">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--hms-border)] pt-5">
        {onEdit && <button type="button" onClick={onEdit} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-500"><Pencil size={14} />Edit patient</button>}
        {patient.phone && <a href={`tel:${patient.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 rounded-xl border border-[var(--hms-border)] px-4 py-3 text-xs font-medium text-[var(--hms-text-secondary)]"><Phone size={14} />Call patient</a>}
      </div>
    </ActivityDialog>
  );
}
