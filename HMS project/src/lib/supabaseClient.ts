import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SupabaseConfig = {
  url: string;
  key: string;
  ready: boolean;
  problem: string;
};

// Format checks are for configuration only. Supabase verifies credentials.
export function validateSupabaseConfig(urlValue: unknown, keyValue: unknown): SupabaseConfig {
  const url = typeof urlValue === "string" ? urlValue.trim().replace(/\/$/, "") : "";
  const key = typeof keyValue === "string" ? keyValue.trim() : "";
  const result = (problem = ""): SupabaseConfig => ({ url, key, ready: !problem, problem });
  if (!url || !key) return result("Supabase URL or public key is missing.");
  if (/YOUR_|REPLACE_|PASTE_|your-project/i.test(url + key)) {
    return result("Replace the example Supabase values with your project's values.");
  }
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol) || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) {
      return result("Use the Supabase project URL, without an API path.");
    }
  } catch {
    return result("Supabase project URL is invalid.");
  }
  if (/\s/.test(key)) return result("The Supabase public key contains whitespace.");
  if (key.startsWith("sb_secret_")) return result("A secret key cannot be used in this React app. Use a publishable key.");
  if (key.startsWith("sb_publishable_") && key.length > 24) return result();
  try {
    const parts = key.split(".");
    if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded: { role?: string; ref?: string } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
    if (decoded.role === "service_role") return result("A service_role key cannot be used in this React app. Use a public key.");
    if (decoded.role !== "anon") throw new Error();
    const projectRef = new URL(url).hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1];
    if (projectRef && decoded.ref && projectRef !== decoded.ref) return result("Supabase URL and anon key belong to different projects.");
    return result();
  } catch {
    return result("Use the complete Supabase publishable key or legacy anon key.");
  }
}

const env = import.meta.env;
export const supabaseConfig = validateSupabaseConfig(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
);

export async function timedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const parentSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const abort = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) abort();
  else parentSignal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abort);
  }
}

let client: SupabaseClient | undefined;
export function getSupabase(): SupabaseClient {
  if (!supabaseConfig.ready) throw new Error("Sign-in is unavailable. Please contact your hospital administrator.");
  client ??= createClient(supabaseConfig.url, supabaseConfig.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
    global: { fetch: timedFetch },
  });
  return client;
}

// Keeps existing imports such as `supabase.from(...)` and `supabase.rpc(...)`
// compatible. Missing .env values produce a setup error, not a blank page.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const instance = getSupabase();
    const value: unknown = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
