import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { HospitalAuthProvider, useHospitalAuth, useOptionalHospitalAuth } from "../../features/auth/HospitalAuthProvider";
import type { HospitalUser } from "../../features/auth/authService";
import { AuthMessage, AuthShell, GoogleMark } from "./AuthShell";

interface LoginPageProps { onLogin?: (user: HospitalUser) => void; }

function LoginForm({ onLogin }: LoginPageProps) {
  const auth = useHospitalAuth();
  const [view, setView] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const callbackUser = useRef("");
  const emailInput = useRef<HTMLInputElement>(null);
  const blocked = !auth.configured || !!auth.busy || auth.status === "loading";

  useEffect(() => {
    if (!auth.user) { callbackUser.current = ""; return; }
    if (onLogin && callbackUser.current !== auth.user.email) {
      callbackUser.current = auth.user.email;
      setPassword("");
      onLogin(auth.user);
    }
  }, [auth.user, onLogin]);

  function changeView(next: "login" | "forgot") {
    if (blocked) return;
    auth.clearMessages();
    setPassword("");
    setCapsLock(false);
    setView(next);
    window.setTimeout(() => emailInput.current?.focus(), 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    if (view === "forgot") await auth.sendResetEmail(email);
    else {
      const ok = await auth.signIn(email, password);
      if (ok) setPassword("");
    }
  }

  return <AuthShell>
    <div className="mc-auth-topline"><span>STAFF PORTAL</span><span className="mc-auth-pill"><ShieldCheck size={13} /> Authorized access</span></div>
    <div className="mc-auth-form-wrap">
      {view === "forgot" && <button className="mc-auth-back" type="button" onClick={() => changeView("login")} disabled={blocked}><ArrowLeft size={16} /> Back to sign in</button>}
      <div className="mc-auth-form-icon"><Stethoscope size={25} /></div>
      <div className="mc-auth-heading"><span className="mc-auth-kicker">{view === "forgot" ? "ACCOUNT RECOVERY" : "WELCOME BACK"}</span><h2>{view === "forgot" ? "Forgot password?" : "Let's get you signed in."}</h2><p>{view === "forgot" ? "Enter your email and we'll send you a link to choose a new password." : "Access your hospital workspace with your staff account."}</p></div>
      {!auth.configured && <p className="mc-auth-message mc-auth-error" role="alert">Sign-in is unavailable until the hospital connection is configured. Please contact your administrator.</p>}
      <form onSubmit={handleSubmit} className="mc-auth-form" aria-busy={blocked}>
        <div className="mc-auth-field"><label htmlFor="mc-email">Work email</label><div className="mc-auth-input-wrap"><Mail size={18} aria-hidden="true" /><input ref={emailInput} id="mc-email" name="email" type="email" autoComplete="username" inputMode="email" placeholder="you@hospital.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={blocked} autoCapitalize="none" spellCheck={false} /></div></div>
        {view === "login" && <div className="mc-auth-field"><div className="mc-auth-label-row"><label htmlFor="mc-password">Password</label><button className="mc-auth-text-button" type="button" onClick={() => changeView("forgot")} disabled={blocked}>Forgot password?</button></div><div className="mc-auth-input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input id="mc-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))} onBlur={() => setCapsLock(false)} required disabled={blocked} aria-describedby={capsLock ? "mc-caps-lock" : undefined} /><button className="mc-auth-eye" type="button" onClick={() => setShowPassword((value) => !value)} disabled={blocked} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{capsLock && <small id="mc-caps-lock" className="mc-auth-caps">Caps Lock is on.</small>}</div>}
        <AuthMessage error={auth.error} notice={auth.notice} />
        <button className="mc-auth-primary" type="submit" disabled={blocked}>{auth.busy === "password" || auth.busy === "reset-email" || auth.status === "loading" ? <><LoaderCircle size={18} className="mc-auth-spin" /><span>{auth.status === "loading" ? "Verifying access…" : view === "forgot" ? "Sending reset link…" : "Signing you in…"}</span></> : <><span>{view === "forgot" ? "Send reset link" : "Sign in to your workspace"}</span><ArrowRight size={18} /></>}</button>
      </form>
      {view === "login" && <><div className="mc-auth-divider"><span /><small>OR CONTINUE WITH</small><span /></div><button className="mc-auth-google" type="button" onClick={() => void auth.signInWithGoogle()} disabled={blocked}>{auth.busy === "google" ? <LoaderCircle size={19} className="mc-auth-spin" /> : <GoogleMark />}<span>{auth.busy === "google" ? "Connecting to Google…" : "Sign in with Google"}</span></button></>}
      <p className="mc-auth-help">Need an account or access? <span>Contact your hospital administrator.</span></p>
    </div>
    <div className="mc-auth-panel-footer"><ShieldCheck size={15} /><span>Your session is managed securely.</span></div>
  </AuthShell>;
}

// Supports the old <LoginPage onLogin={...} /> API. The new App uses a single
// provider for login, logout, callbacks, recovery, and session restoration.
export default function LoginPage(props: LoginPageProps) {
  const existingProvider = useOptionalHospitalAuth();
  return existingProvider ? <LoginForm {...props} /> : <HospitalAuthProvider><LoginForm {...props} /></HospitalAuthProvider>;
}
