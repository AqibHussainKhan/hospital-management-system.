import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import { useHospitalAuth } from "../../features/auth/HospitalAuthProvider";
import { AuthMessage, AuthShell } from "./AuthShell";

export default function ResetPassword() {
  const auth = useHospitalAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const blocked = !!auth.busy || !auth.canResetPassword;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    if (await auth.updatePassword(password, confirmation)) { setPassword(""); setConfirmation(""); }
  }
  return <AuthShell>
    <div className="mc-auth-topline"><span>ACCOUNT RECOVERY</span><span className="mc-auth-pill">Password reset</span></div>
    <div className="mc-auth-form-wrap">
      <button type="button" className="mc-auth-back" onClick={() => void auth.cancelRecovery()} disabled={!!auth.busy}><ArrowLeft size={16} /> Back to sign in</button>
      <div className="mc-auth-form-icon"><KeyRound size={25} /></div>
      <div className="mc-auth-heading"><span className="mc-auth-kicker">A FRESH START</span><h2>Choose a new password.</h2><p>Use at least 8 characters and choose a password you haven't used before.</p></div>
      <form className="mc-auth-form" onSubmit={submit} aria-busy={!!auth.busy}>
        <div className="mc-auth-field"><label htmlFor="mc-new-password">New password</label><div className="mc-auth-input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input id="mc-new-password" name="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required disabled={blocked} /><button type="button" className="mc-auth-eye" onClick={() => setShowPassword((value) => !value)} disabled={blocked} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
        <div className="mc-auth-field"><label htmlFor="mc-confirm-password">Confirm password</label><div className="mc-auth-input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input id="mc-confirm-password" name="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Enter the same password again" minLength={8} required disabled={blocked} /></div></div>
        <AuthMessage error={auth.error} notice={auth.notice} />
        {!auth.canResetPassword && !auth.error && <p className="mc-auth-message mc-auth-error" role="alert">This reset link is missing or expired. Return to sign in and request a new link.</p>}
        <button className="mc-auth-primary" type="submit" disabled={blocked}>{auth.busy === "reset-password" ? <><LoaderCircle className="mc-auth-spin" size={18} /> Updating password…</> : <><span>Update password</span><ArrowRight size={18} /></>}</button>
      </form>
    </div>
    <div className="mc-auth-panel-footer"><LockKeyhole size={15} /><span>Sign in again after updating your password.</span></div>
  </AuthShell>;
}
