import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabaseConfig, timedFetch } from "../../lib/supabaseClient";

export interface HospitalUser {
  name: string;
  email: string;
  picture?: string;
}

export function userProfile(user: SupabaseUser): HospitalUser {
  if (!user.email) throw new Error("This account does not have an email address. Contact your administrator.");
  const metadata = user.user_metadata ?? {};
  const value = (key: string) => typeof metadata[key] === "string" ? metadata[key].trim() : "";
  const result: HospitalUser = {
    name: value("full_name") || value("name") || user.email.split("@")[0],
    email: user.email,
  };
  const picture = value("avatar_url") || value("picture");
  if (/^https?:\/\//i.test(picture)) result.picture = picture;
  return result;
}

export function authErrorMessage(cause: unknown): string {
  const error = cause as { message?: unknown; code?: unknown; name?: unknown; status?: number } | null;
  const message = typeof error?.message === "string" ? error.message : "";
  const code = typeof error?.code === "string" ? error.code : "";
  if (/invalid api key|invalid_api_key/i.test(message + code)) {
    return "The sign-in service rejected its API key. Please contact your hospital administrator.";
  }
  if (code === "invalid_credentials" || /invalid login credentials|invalid credentials/i.test(message)) return "Your email or password is incorrect. Please try again.";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) return "Please verify your email before signing in.";
  if (code === "weak_password") return "Choose a stronger password with at least 8 characters.";
  if (code === "same_password") return "Choose a password different from your current password.";
  if (error?.status === 429 || /rate.?limit|too many|over_.*rate_limit/i.test(message + code)) {
    return "Too many attempts. Wait a moment, then try again.";
  }
  if (/provider_disabled|unsupported_provider/.test(code) || /provider.*(disabled|not enabled)/i.test(message)) {
    return "Google sign-in is not enabled yet. Use your email and password or contact your administrator.";
  }
  if (/AuthRetryableFetchError|AbortError|TimeoutError/.test(String(error?.name)) || /fetch|network|timed out/i.test(message)) {
    return "Unable to connect to the sign-in service. Check your connection and try again.";
  }
  if (/expired|invalid.*(token|jwt)|session.*missing/i.test(message + code)) {
    return "Your sign-in link or session has expired. Please sign in again or request a new reset link.";
  }
  // Our own operational messages never contain API keys or raw token values.
  if (cause instanceof HospitalAuthError) return cause.message;
  return "Unable to complete sign-in. Please try again or contact your administrator.";
}

export class HospitalAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HospitalAuthError";
  }
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function authRedirectUrl(recovery = false): string {
  const url = new URL(import.meta.env.BASE_URL || "/", window.location.origin);
  if (recovery) url.searchParams.set("auth", "reset");
  return url.href;
}

// Supabase's public auth settings endpoint checks the project key before
// navigating away. This makes the user's original invalid-key error visible
// on the form, including when Google OAuth would otherwise redirect first.
export async function checkGoogleConfiguration(): Promise<void> {
  const response = await timedFetch(`${supabaseConfig.url}/auth/v1/settings`, {
    headers: { apikey: supabaseConfig.key },
    cache: "no-store",
  });
  const body: { message?: string; external?: { google?: boolean } } = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (/invalid api key/i.test(body.message ?? "") || response.status === 401) {
      throw new HospitalAuthError("The sign-in service rejected its API key. Please contact your hospital administrator.");
    }
    throw new HospitalAuthError("The sign-in service is unavailable. Please try again shortly.");
  }
  if (body.external?.google !== true) {
    throw new HospitalAuthError("Google sign-in is not enabled yet. Use your email and password or contact your administrator.");
  }
}

const recoveryStorageKey = "medicore:password-recovery";
export function rememberRecovery(userId: string): void {
  try {
    sessionStorage.setItem(recoveryStorageKey, JSON.stringify({ userId, expires: Date.now() + 30 * 60_000 }));
  } catch { /* A reset still works in this tab when storage is restricted. */ }
}
export function recoveryRemembered(userId: string): boolean {
  try {
    const marker = JSON.parse(sessionStorage.getItem(recoveryStorageKey) || "null");
    return marker?.userId === userId && typeof marker.expires === "number" && marker.expires > Date.now();
  } catch { return false; }
}
export function forgetRecovery(): void {
  try { sessionStorage.removeItem(recoveryStorageKey); } catch { /* Optional recovery UI marker only. */ }
}
export function isRecoveryUrl(): boolean {
  return new URLSearchParams(window.location.search).get("auth") === "reset" ||
    new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
}
export function clearRecoveryUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("auth");
  url.hash = "";
  window.history.replaceState(window.history.state, "", url.pathname + url.search);
}
export function consumeOAuthError(): string {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get("error") || hash.get("error");
  if (!code) return "";
  for (const name of ["error", "error_code", "error_description"]) url.searchParams.delete(name);
  if (hash.has("error")) url.hash = "";
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  return code === "access_denied"
    ? "Google sign-in was cancelled or access was denied. You can try again."
    : "The sign-in link could not be verified. Try signing in again or request a new reset link.";
}
