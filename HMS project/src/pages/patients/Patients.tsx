import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import Layout from "../../components/layout/Layout";
import ActivityDialog from "../../components/dashboard/ActivityDialog";
import PatientDetails, {
  patientStatusClass,
} from "../../components/patients/PatientDetails";
import PatientEditor from "../../components/patients/PatientEditor";
import {
  patientActivity,
  patientStatuses,
  recentPatients,
  relativeTime,
} from "../../data/activityModel";
import {
  deletePatient,
  useActivityClock,
  usePatients,
} from "../../data/activityStore";

export default function Patients({ onLogout }: { onLogout: () => void }) {
  const { records, error: storageError } = usePatients();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  useEffect(() => {
    setQuery(params.get("q") || "");
  }, [params]);
  const [status, setStatus] = useState(params.get("status") || "All");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const now = useActivityClock();
  const selectedKey = params.get("patient");
  const selected = records.find(
    (patient) =>
      patient.patientId === selectedKey || patient.id === selectedKey,
  );
  const editingRecord = records.find((patient) => patient.id === editing);
  const filtered = useMemo(
    () =>
      recentPatients(records).filter((patient) => {
        const text = [
          patient.name,
          patient.patientId,
          patient.department,
          patient.doctor,
          patient.phone,
          patient.gender,
        ]
          .join(" ")
          .toLowerCase();
        return (
          text.includes(query.trim().toLowerCase()) &&
          (status === "All" || patient.status === status)
        );
      }),
    [records, query, status],
  );

  function openPatient(id: string | null) {
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        if (id) next.set("patient", id);
        else next.delete("patient");
        return next;
      },
      { replace: Boolean(selectedKey), preventScrollReset: true },
    );
  }
  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete the patient record for ${name}?`)) return;
    try {
      await deletePatient(id);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The record could not be deleted.",
      );
    }
  }

  return (
    <Layout
      activePage="/patients"
      title="Patients"
      subtitle="Manage patient records and hospital admissions"
      onLogout={onLogout}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-10 text-[var(--hms-text)]">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-500">
              <Users size={15} />
              Patient Management
            </p>
            <h1 className="text-[26px] font-semibold tracking-tight">
              Patients Directory
            </h1>
            <p className="mt-2 text-xs text-[var(--hms-text-muted)]">
              Search, register and manage hospital patients.
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(storageError)}
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
          >
            <Plus size={15} />
            Register patient
          </button>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total patients", records.length],
            ...patientStatuses.map((state) => [
              state,
              records.filter((patient) => patient.status === state).length,
            ]),
          ].map(([label, value]) => (
            <section
              key={label}
              className="hms-card rounded-2xl border border-[var(--hms-border)] p-5"
            >
              <p className="text-xs text-[var(--hms-text-muted)]">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-blue-500">
                {storageError ? "—" : value}
              </p>
            </section>
          ))}
        </div>
        {(storageError || error) && (
          <p
            role="alert"
            className="rounded-xl bg-red-500/10 p-4 text-xs text-red-500"
          >
            {storageError || error}
          </p>
        )}
        <section className="hms-card rounded-[24px] p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="hms-navbar-search flex min-w-0 flex-1">
              <Search
                size={16}
                className="hms-navbar-search-icon"
                aria-hidden="true"
              />
              <span className="sr-only">Search patients</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search patient, ID, doctor or department..."
                className="hms-navbar-search-input"
              />
            </label>

            <select
              aria-label="Patient status filter"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="hms-patient-status-filter w-full sm:w-[160px]"
            >
              <option value="All">All statuses</option>
              {patientStatuses.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-[var(--hms-text-muted)]">
            <p aria-live="polite">
              Showing {filtered.length} of {records.length} patients
            </p>
            {(query || status !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatus("All");
                }}
                className="font-medium text-blue-500"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>
        <section className="hms-card overflow-hidden rounded-[24px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="border-b border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] text-[10px] uppercase tracking-wider text-[var(--hms-text-muted)]">
                <tr>
                  {[
                    "Patient",
                    "Department",
                    "Doctor",
                    "Contact",
                    "Status",
                    "Actions",
                  ].map((label) => (
                    <th key={label} className="px-5 py-4 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => (
                  <tr
                    key={patient.id}
                    className="border-b border-[var(--hms-border)] last:border-0 hover:bg-[var(--hms-surface-secondary)]"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openPatient(patient.patientId)}
                        className="flex items-center gap-3 text-left"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-xs font-semibold text-blue-500">
                          {patient.initials}
                        </span>
                        <span>
                          <span className="block text-xs font-semibold">
                            {patient.name}
                          </span>
                          <span className="mt-1 block text-[10px] text-[var(--hms-text-muted)]">
                            {patient.patientId} · {patient.age} years ·{" "}
                            {patient.gender}
                          </span>
                          <span className="mt-1 block text-[9px] text-[var(--hms-text-muted)]">
                            {relativeTime(patientActivity(patient).time, now)}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--hms-text-secondary)]">
                      {patient.department}
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--hms-text-secondary)]">
                      {patient.doctor}
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--hms-text-secondary)]">
                      {patient.phone || "Not recorded"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${patientStatusClass(patient.status)}`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`View ${patient.name}`}
                          onClick={() => openPatient(patient.patientId)}
                          className="rounded-lg p-2 text-blue-500 hover:bg-blue-500/10"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit ${patient.name}`}
                          disabled={Boolean(storageError)}
                          onClick={() => setEditing(patient.id)}
                          className="rounded-lg p-2 text-[var(--hms-text-muted)] hover:text-blue-500 disabled:opacity-40"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${patient.name}`}
                          disabled={Boolean(storageError)}
                          onClick={() => remove(patient.id, patient.name)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <div className="p-10 text-center">
              <Search size={26} className="mx-auto text-blue-500" />
              <p className="mt-4 text-sm font-medium">
                {storageError
                  ? "Patient records unavailable"
                  : "No patients found"}
              </p>
            </div>
          )}
        </section>
      </div>
      {selectedKey &&
        (selected ? (
          <PatientDetails
            patient={selected}
            onClose={() => openPatient(null)}
            onEdit={() => {
              openPatient(null);
              setEditing(selected.id);
            }}
          />
        ) : (
          <ActivityDialog
            title="Patient unavailable"
            onClose={() => openPatient(null)}
          >
            <p className="text-sm text-[var(--hms-text-muted)]">
              This patient may have been removed or the link is incomplete.
            </p>
          </ActivityDialog>
        ))}
      {editing &&
        (editing === "new" || editingRecord ? (
          <PatientEditor
            key={editing}
            patient={editingRecord}
            onClose={() => setEditing(null)}
          />
        ) : (
          <ActivityDialog
            title="Patient unavailable"
            onClose={() => setEditing(null)}
          >
            <p className="text-sm">
              This patient was removed. Close the editor to continue.
            </p>
          </ActivityDialog>
        ))}
    </Layout>
  );
}
