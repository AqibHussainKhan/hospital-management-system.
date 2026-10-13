import { useState } from "react";
import { Building2, Save } from "lucide-react";
import { callRpc, useHospitalRpc } from "../../features/access/rpc";
import {
  Page,
  Card,
  Field,
  ErrorMessage,
  buttonClass,
} from "../../components/administration/shared";
import { EmptyState } from "../../components/common/WorkspaceControls";
interface HospitalSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  departments: string[];
}
export default function HospitalSettings({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const state = useHospitalRpc<HospitalSettings>("hms_hospital_settings");
  const [draft, setForm] = useState<HospitalSettings | null>(null),
    [departmentDraft, setDepartments] = useState<string | null>(null);
  const form = draft || state.data,
    departments = departmentDraft ?? form?.departments.join("\n") ?? "";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  return (
    <Page
      path="/hospital-settings"
      title="Hospital Settings"
      subtitle="Hospital contact details and department directory"
      onLogout={onLogout}
    >
      <ErrorMessage message={state.error || error} />
      {!form ? (
        <Card>
          <EmptyState loading={state.loading} />
        </Card>
      ) : (
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
              <Building2 size={22} />
            </span>
            <div>
              <h2 className="font-semibold">Hospital information</h2>
              <p className="mt-1 text-xs text-[var(--hms-text-muted)]">
                Shared with authorized hospital users.
              </p>
            </div>
          </div>
          <form
            className="grid gap-5 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (busy) return;
              setBusy(true);
              setError("");
              setNotice("");
              void callRpc("hms_hospital_settings", {
                next_settings: {
                  ...form,
                  departments: [
                    ...new Set(
                      departments
                        .split("\n")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    ),
                  ],
                },
              })
                .then(() => {
                  setNotice("Hospital details saved.");
                  state.refresh();
                })
                .catch((cause: Error) => setError(cause.message))
                .finally(() => setBusy(false));
            }}
          >
            {(
              [
                ["name", "Hospital name"],
                ["phone", "Hospital phone"],
                ["email", "Contact email"],
                ["address", "Address"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  required={key === "name"}
                  disabled={busy}
                  type={
                    key === "email" ? "email" : key === "phone" ? "tel" : "text"
                  }
                  maxLength={500}
                  className="hms-form-field"
                  value={form[key]}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              </Field>
            ))}
            <div className="sm:col-span-2">
              <Field label="Departments (one per line)">
                <textarea
                  disabled={busy}
                  rows={6}
                  className="hms-form-field"
                  value={departments}
                  onChange={(event) => setDepartments(event.target.value)}
                />
              </Field>
              <p className="mt-2 text-xs text-[var(--hms-text-muted)]">
                Existing staff and patient departments retain their saved names.
                Update linked records and account assignments together when
                renaming a department.
              </p>
            </div>
            <button disabled={busy} className={`${buttonClass} w-fit`}>
              <Save size={15} className="mr-2 inline" />
              {busy ? "Saving…" : "Save settings"}
            </button>
            {notice && (
              <p role="status" className="text-sm text-emerald-500">
                {notice}
              </p>
            )}
          </form>
        </Card>
      )}
    </Page>
  );
}
