import { useDoctors } from "../../data/departmentStore";
import { useState, type FormEvent } from "react";
import ActivityDialog from "../dashboard/ActivityDialog";
import { patientStatuses } from "../../data/activityModel";
import type { PatientRecord } from "../../data/activityModel";
import { useWards, savePatient } from "../../data/activityStore";

const input = "hms-form-field";
export default function PatientEditor({
  patient,
  onClose,
}: {
  patient?: PatientRecord;
  onClose: () => void;
}) {
  const doctors = useDoctors();
  const wards = useWards();
  const [baseline] = useState(patient);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => ({
    patientId: patient?.patientId || "",
    name: patient?.name || "",
    age: patient ? String(patient.age) : "",
    gender: patient?.gender || "Male",
    department: patient?.department || "",
    doctor: patient?.doctor || "",
    doctorRef: patient?.doctorRef || "",
    wardId: patient?.wardId || "",
    phone: patient?.phone || "",
    status: patient?.status || "Outpatient",
    notes: patient?.notes || "",
  }));
  const [error, setError] = useState("");
  const change = (field: string, value: string) =>
    setForm((old) => ({ ...old, [field]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await savePatient(form, patient?.id, baseline);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The patient could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ActivityDialog
      title={patient ? "Edit Patient" : "Register Patient"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-xs">
            <span className="block">Patient ID</span>
            <input
              className={input}
              maxLength={50}
              placeholder="Auto-generated if blank"
              value={form.patientId}
              onChange={(event) => change("patientId", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs">
            <span className="block">Full name</span>
            <input
              required
              className={input}
              maxLength={120}
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs">
            <span className="block">Age</span>
            <input
              required
              type="number"
              min={0}
              max={130}
              step={1}
              className={input}
              value={form.age}
              onChange={(event) => change("age", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs">
            <span className="block">Gender</span>
            <select
              aria-label="Gender"
              className={input}
              value={form.gender}
              onChange={(event) => change("gender", event.target.value)}
            >
              {[...new Set(["Male", "Female", "Other", form.gender])].map(
                (gender) => (
                  <option key={gender}>{gender}</option>
                ),
              )}
            </select>
          </label>
          {[["phone", "Phone (optional)"]].map(([key, label]) => (
            <label key={key} className="space-y-2 text-xs">
              <span className="block">{label}</span>
              <input
                required={key !== "phone"}
                type={key === "phone" ? "tel" : "text"}
                className={input}
                maxLength={120}
                value={form[key]}
                onChange={(event) => change(key, event.target.value)}
              />
            </label>
          ))}
          <label className="space-y-2 text-xs">
            <span className="block">Assigned doctor</span>
            <select
              aria-label="Assigned doctor"
              required
              className={input}
              value={form.doctorRef}
              onChange={(e) => {
                const d = doctors.records.find((v) => v.id === e.target.value);
                setForm((old) => ({
                  ...old,
                  doctorRef: e.target.value,
                  doctor: d?.name || "",
                  department: d?.department || "",
                }));
              }}
            >
              <option value="">Select active doctor</option>
              {doctors.records
                .filter(
                  (d) => d.status === "Active" || d.id === patient?.doctorRef,
                )
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.department}
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-2 text-xs">
            <span className="block">Admission ward</span>
            <select
              aria-label="Admission ward"
              required={form.status === "Admitted"}
              disabled={form.status !== "Admitted"}
              className={input}
              value={form.wardId}
              onChange={(e) => change("wardId", e.target.value)}
            >
              <option value="">Select ward for admission</option>
              {wards.records
                .filter((w) => w.status !== "Maintenance")
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} · {w.capacity} beds
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-2 text-xs">
            <span className="block">Status</span>
            <select
              aria-label="Status"
              className={input}
              value={form.status}
              onChange={(event) => change("status", event.target.value)}
            >
              {patientStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-2 text-xs">
          <span className="block">Notes (optional)</span>
          <textarea
            rows={3}
            className={input}
            maxLength={1000}
            value={form.notes}
            onChange={(event) => change("notes", event.target.value)}
          />
        </label>
        <p className="text-[11px] leading-6 text-[var(--hms-text-muted)]">
          New registrations use the current time. Existing records keep their
          recorded registration dates.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-500/10 p-3 text-xs text-red-500"
          >
            {error}
          </p>
        )}
        <div className="flex gap-3 border-t border-[var(--hms-border)] pt-5">
          <button
            disabled={busy}
            className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Save patient
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--hms-border)] px-5 py-3 text-xs"
          >
            Cancel
          </button>
        </div>
      </form>
    </ActivityDialog>
  );
}
