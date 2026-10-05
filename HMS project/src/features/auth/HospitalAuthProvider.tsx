import { setRecordSession } from "../../data/recordStore";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfig } from "../../lib/supabaseClient";
import {
  HospitalAuthError, authErrorMessage, authRedirectUrl, checkGoogleConfiguration,
  clearRecoveryUrl, consumeOAuthError, forgetRecovery, isRecoveryUrl,
  recoveryRemembered, rememberRecovery, userProfile, validEmail,
} from "./authService";
import type { HospitalUser } from "./authService";

type Status = "loading" | "signed_out" | "signed_in" | "recovery";
type Action = "password" | "google" | "reset-email" | "reset-password" | "logout" | "cancel-reset";
interface AuthValue {
  user: HospitalUser | null;
  status: Status;
  busy: Action | null;
  error: string;
  notice: string;
  configured: boolean;
  canResetPassword: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  sendResetEmail: (email: string) => Promise<boolean>;
  updatePassword: (password: string, confirmation: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  cancelRecovery: () => Promise<boolean>;
  clearMessages: () => void;
}

const HospitalAuthContext = createContext<AuthValue | null>(null);
export function useOptionalHospitalAuth(): AuthValue | null { return useContext(HospitalAuthContext); }
export function useHospitalAuth(): AuthValue {
  const context = useOptionalHospitalAuth();
  if (!context) throw new Error("Wrap the app in HospitalAuthProvider.");
  return context;
}

export function HospitalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<HospitalUser | null>(null);
  const [status, setStatus] = useState<Status>(supabaseConfig.ready ? "loading" : "signed_out");
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recovery, setRecovery] = useState(isRecoveryUrl);
  const [canResetPassword, setCanResetPassword] = useState(false);
  const recoveryUser = useRef("");
  const approvedUser = useRef("");
  const activeSession = useRef<Session | null>(null);
  const actionLock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const clearMessages = useCallback(() => { setError(""); setNotice(""); }, []);

  useEffect(() => {
    const callbackError = consumeOAuthError();
    if (callbackError) setError(callbackError);
    if (!supabaseConfig.ready) return;
    const client = getSupabase();
    let active = true;
    let receivedEvent = false;
    // The callback stays synchronous. API requests run in the effect below,
    // after Supabase has released its authentication lock.
    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      receivedEvent = true;
      activeSession.current = nextSession;
      if (event === "PASSWORD_RECOVERY" && nextSession) {
        recoveryUser.current = nextSession.user.id;
        rememberRecovery(nextSession.user.id);
        setRecovery(true);
      }
      if (!nextSession) {
        approvedUser.current = "";
        setRecordSession(null);
      setUser(null);
        setCanResetPassword(false);
      }
      setSession(nextSession);
    });
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || receivedEvent) return;
      if (sessionError) setError(authErrorMessage(sessionError));
      activeSession.current = data.session;
      setSession(data.session);
    }).catch((cause: unknown) => {
      if (!active || receivedEvent) return;
      setError(authErrorMessage(cause));
      setSession(null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const token = session?.access_token;
  const sessionUserId = session?.user.id;
  const sessionKnown = session !== undefined;

  useEffect(() => {
    if (!supabaseConfig.ready || !sessionKnown) return;
    if (!token || !sessionUserId) {
      approvedUser.current = "";
      setRecordSession(null);
      setUser(null);
      setCanResetPassword(false);
      setStatus(recovery ? "recovery" : "signed_out");
      return;
    }
    let cancelled = false;
    const client = getSupabase();
    if (approvedUser.current !== sessionUserId || recovery) {
      setRecordSession(null);
      setUser(null);
      setStatus("loading");
    }
    const stillCurrent = () => !cancelled && activeSession.current?.access_token === token;
    void (async () => {
      try {
        // A server check prevents a cached, fabricated profile from opening
        // the dashboard. Database RLS remains the data-access boundary.
        const { data, error: userError } = await client.auth.getUser(token);
        if (!stillCurrent()) return;
        if (userError) throw userError;
        if (!data.user || data.user.id !== sessionUserId) {
          throw new HospitalAuthError("Your session could not be verified. Please sign in again.");
        }
        if (recovery) {
          const validRecovery = recoveryUser.current === sessionUserId || recoveryRemembered(sessionUserId);
          setCanResetPassword(validRecovery);
          setStatus("recovery");
          if (!validRecovery) setError("This reset link is missing or expired. Request a new link from the sign-in page.");
          return;
        }
        const { data: isAdmin, error: accessError } = await client.rpc("is_hospital_admin");
        if (!stillCurrent()) return;
        if (accessError) {
          if (/invalid api key/i.test(accessError.message)) throw accessError;
          throw new HospitalAuthError("Hospital access could not be verified. Please contact your administrator.");
        }
        if (isAdmin !== true) {
          throw new HospitalAuthError("Your account does not have hospital admin access. Please contact your administrator.");
        }
        approvedUser.current = sessionUserId;
        setRecordSession(data.user.id);
        setUser(userProfile(data.user));
        setStatus("signed_in");
        setError("");
      } catch (cause) {
        if (!stillCurrent()) return;
        approvedUser.current = "";
        setRecordSession(null);
      setUser(null);
        setCanResetPassword(false);
        setStatus(recovery ? "recovery" : "signed_out");
        setError(authErrorMessage(cause));
        // Only this browser's auth session is removed; hospital data stays.
        try { await client.auth.signOut({ scope: "local" }); } catch { /* UI remains closed on failure. */ }
      }
    })();
    return () => { cancelled = true; };
  }, [token, sessionUserId, sessionKnown, recovery]);

  const run = useCallback(async (action: Action, work: () => Promise<void>): Promise<boolean> => {
    if (actionLock.current) return false;
    if (!supabaseConfig.ready) {
      setError("Sign-in is unavailable until the hospital connection is configured. Contact your administrator.");
      return false;
    }
    actionLock.current = true;
    setBusy(action);
    setError("");
    setNotice("");
    try {
      await work();
      return true;
    } catch (cause) {
      if (mounted.current) setError(authErrorMessage(cause));
      return false;
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(null);
    }
  }, []);

  const signIn = useCallback((email: string, password: string) => run("password", async () => {
    if (!validEmail(email) || !password) throw new HospitalAuthError("Enter a valid email address and your password.");
    forgetRecovery();
    recoveryUser.current = "";
    setRecovery(false);
    const { data, error: authError } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (authError) throw authError;
    if (!data.session) throw new HospitalAuthError("A sign-in session could not be started. Please try again.");
    activeSession.current = data.session;
    setSession(data.session);
  }), [run]);

  const signInWithGoogle = useCallback(() => run("google", async () => {
    await checkGoogleConfiguration();
    forgetRecovery();
    const { data, error: authError } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authRedirectUrl(),
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    if (authError) throw authError;
    if (!data.url) throw new HospitalAuthError("Google sign-in could not be started. Please try again.");
    window.location.assign(data.url);
  }), [run]);

  const sendResetEmail = useCallback((email: string) => run("reset-email", async () => {
    if (!validEmail(email)) throw new HospitalAuthError("Enter a valid email address to receive a reset link.");
    const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl(true) });
    if (resetError) throw resetError;
    setNotice("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
  }), [run]);

  const updatePassword = useCallback((password: string, confirmation: string) => run("reset-password", async () => {
    if (!canResetPassword) throw new HospitalAuthError("Request a new reset link before updating your password.");
    if (password.length < 8) throw new HospitalAuthError("Use at least 8 characters for your new password.");
    if (password !== confirmation) throw new HospitalAuthError("Your passwords do not match.");
    const { error: updateError } = await getSupabase().auth.updateUser({ password });
    if (updateError) throw updateError;
    const { error: signOutError } = await getSupabase().auth.signOut({ scope: "local" });
    if (signOutError) throw signOutError;
    forgetRecovery();
    recoveryUser.current = "";
    approvedUser.current = "";
    clearRecoveryUrl();
    setRecovery(false);
    setSession(null);
    setRecordSession(null);
      setUser(null);
    setCanResetPassword(false);
    setStatus("signed_out");
    setNotice("Password updated. Sign in with your new password.");
  }), [canResetPassword, run]);

  const signOut = useCallback(() => run("logout", async () => {
    const { error: signOutError } = await getSupabase().auth.signOut({ scope: "local" });
    if (signOutError) throw signOutError;
    forgetRecovery();
    approvedUser.current = "";
    setRecordSession(null);
      setUser(null);
    setSession(null);
    setStatus("signed_out");
  }), [run]);

  const cancelRecovery = useCallback(() => run("cancel-reset", async () => {
    if (activeSession.current) {
      const { error: signOutError } = await getSupabase().auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
    }
    forgetRecovery();
    recoveryUser.current = "";
    clearRecoveryUrl();
    setRecovery(false);
    setCanResetPassword(false);
    setSession(null);
    setStatus("signed_out");
  }), [run]);

  return <HospitalAuthContext.Provider value={{ user, status, busy, error, notice,
    configured: supabaseConfig.ready, canResetPassword, signIn, signInWithGoogle,
    sendResetEmail, updatePassword, signOut, cancelRecovery, clearMessages,
  }}>{children}</HospitalAuthContext.Provider>;
}
