import { useState } from "react";
import { Database, RotateCcw, Check, LoaderCircle } from "lucide-react";
import { useAccount } from "../../context/AccountContext";
import { useAccess } from "../../features/access/useAccess";
import { callRpc, useHospitalRpc } from "../../features/access/rpc";
import {
  dataMode,
  restoreSampleRecords,
  refreshRecordStores,
} from "../../data/recordStore";
import { createSharedSamples } from "../../data/sharedSamples";

interface SampleStatus {
  installed: boolean;
  installedAt: string | null;
  counts: Record<string, number>;
  workCount: number;
}
export default function DemoDataSettings() {
  const account = useAccount(),
    access = useAccess();
  const shared = dataMode === "supabase";
  const status = useHospitalRpc<SampleStatus>(
    "hms_sample_status",
    {},
    shared && access.isAdmin,
  );
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!access.isAdmin || dataMode === "local") return null;

  async function addSamples() {
    if (busy || status.data?.installed) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const sample = createSharedSamples(crypto.randomUUID());
      const result = await callRpc<SampleStatus>("hms_add_samples", {
        sample_batch: sample.batchId,
        sample_collections: sample.collections,
        sample_work: sample.work,
      });
      await refreshRecordStores();
      window.dispatchEvent(new Event("focus"));
      const count = Object.values(result.counts).reduce((sum, n) => sum + n, 0);
      setMessage(
        `${count} sample records and ${result.workCount} workflow entries are available. Open Dashboard or a department to view and edit them.`,
      );
      status.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Samples could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (
      !window.confirm(
        "Restore all sample records with today's dates? This replaces your demo edits in this browser.",
      )
    )
      return;
    try {
      restoreSampleRecords(account.email);
      await refreshRecordStores();
      setError("");
      setMessage("Browser samples restored with today's dates.");
    } catch (cause) {
      setMessage("");
      setError(
        cause instanceof Error
          ? cause.message
          : "Samples could not be restored.",
      );
    }
  }
  const installed = shared && status.data?.installed;
  return (
    <section className="hms-card rounded-[24px] p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Database size={19} className="text-blue-500" />
        Sample records
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--hms-text-muted)]">
        Patients, doctors, appointments, laboratory, pharmacy, wards,
        procedures, staff, attendance, billing and visits populate the
        dashboard, charts and reports.
      </p>
      <p className="mt-3 text-xs leading-6 text-[var(--hms-text-muted)]">
        {shared
          ? "Load illustrative records once into shared storage. Clinical notes, prescriptions, vitals, shifts, leave and approval history are included. Existing records are kept, and samples remain editable after refresh."
          : "Use each department's Add or Edit button. These browser samples save separately for your administrator account."}
      </p>
      {shared && (
        <p className="mt-3 text-xs leading-6 text-[var(--hms-text-muted)]">
          Sample names and patient IDs identify demonstration records. Staff
          accounts see only the samples within their linked employee, doctor,
          department or wards.
        </p>
      )}
      {installed ? (
        <p
          role="status"
          className="mt-5 flex items-center gap-2 text-sm text-emerald-500"
        >
          <Check size={17} />
          Samples are loaded. Repeat loading is blocked to preserve edits and
          avoid duplicates.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void (shared ? addSamples() : restore())}
          disabled={busy || (shared && (status.loading || !!status.error))}
          className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--hms-border)] px-4 py-3 text-sm font-semibold hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy || (shared && status.loading) ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <RotateCcw size={16} />
          )}
          {busy
            ? "Loading samples…"
            : shared && status.loading
              ? "Checking samples…"
              : shared
                ? "Load sample data"
                : "Restore Sample Records"}
        </button>
      )}
      {shared && status.error && (
        <p role="alert" className="mt-4 text-sm text-red-500">
          {status.error} The sample-data setup migration must be applied before
          loading.
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm text-emerald-500">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-500">
          {error}
        </p>
      )}
    </section>
  );
}
