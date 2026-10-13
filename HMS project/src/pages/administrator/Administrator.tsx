import { useState } from "react";
import { Mail, ShieldCheck, Save, KeyRound } from "lucide-react";
import type { User } from "../../App";
import { AccountAvatar } from "../../context/AccountContext";
import { useAccess } from "../../features/access/useAccess";
import { useHospitalAuth } from "../../features/auth/HospitalAuthProvider";
import { callRpc, useHospitalRpc } from "../../features/access/rpc";
import {
  Page,
  Card,
  Field,
  ErrorMessage,
  buttonClass,
} from "../../components/administration/shared";
import { secondaryButton } from "../../components/common/WorkspaceControls";
import DataTools from "../../components/administration/DataTools";
export default function Administrator({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const access = useAccess(),
    auth = useHospitalAuth(),
    state = useHospitalRpc<{ phone: string; bio: string }>(
      "hms_personal_profile",
    );
  const [draft, setForm] = useState<{ phone: string; bio: string } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const form = draft || state.data || { phone: "", bio: "" },
    loaded = !!state.data;
  return (
    <Page
      path="/administrator"
      title="My Profile"
      subtitle="Your hospital account, contact details and password"
      onLogout={onLogout}
    >
      <Card>
        <div className="flex flex-wrap items-center gap-5">
          <AccountAvatar
            user={user}
            className="h-20 w-20 rounded-[24px] text-2xl"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold">{user.name}</h2>
            <p className="mt-2 flex items-center gap-2 break-all text-sm text-[var(--hms-text-muted)]">
              <Mail size={15} />
              {user.email}
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-xs text-blue-500">
            <ShieldCheck size={15} />
            {access.label}
          </span>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="mb-6 text-lg font-semibold">Contact details</h2>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (busy) return;
              setBusy(true);
              setError("");
              setNotice("");
              void callRpc("hms_personal_profile", {
                next_phone: form.phone,
                next_bio: form.bio,
              })
                .then(() => {
                  setNotice("Profile saved.");
                  state.refresh();
                })
                .catch((cause: Error) => setError(cause.message))
                .finally(() => setBusy(false));
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name">
                <input className="hms-form-field" readOnly value={user.name} />
              </Field>
              <Field label="Assigned department">
                <input
                  readOnly
                  className="hms-form-field"
                  value={access.department || "Administration"}
                />
              </Field>
              <Field label="Phone">
                <input
                  disabled={busy}
                  type="tel"
                  maxLength={100}
                  className="hms-form-field"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </Field>
              <Field label="Access role">
                <input
                  readOnly
                  className="hms-form-field"
                  value={access.label}
                />
              </Field>
            </div>
            <Field label="About">
              <textarea
                disabled={busy}
                rows={4}
                maxLength={1000}
                className="hms-form-field"
                value={form.bio}
                onChange={(event) =>
                  setForm({ ...form, bio: event.target.value })
                }
              />
            </Field>
            <button className={buttonClass} disabled={busy || !loaded}>
              <Save size={15} className="mr-2 inline" />
              {busy ? "Saving…" : "Save details"}
            </button>
          </form>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-semibold">
            <KeyRound size={18} className="text-blue-500" />
            Account security
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--hms-text-muted)]">
            Receive a password reset link at your login email. Your
            administrator manages your role, department and record assignments.
          </p>
          <button
            type="button"
            disabled={!!auth.busy}
            className={`${secondaryButton} mt-5`}
            onClick={() => {
              setNotice("");
              void auth.sendResetEmail(user.email).then((sent) => {
                if (sent) setNotice("Password reset email sent.");
              });
            }}
          >
            Send password reset email
          </button>
        </Card>
      </div>
      <ErrorMessage message={error || state.error || auth.error} />
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-500"
        >
          {notice}
        </p>
      )}
      {access.isAdmin && <DataTools />}
    </Page>
  );
}
