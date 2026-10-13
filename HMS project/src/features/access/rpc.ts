import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabaseClient";
import { useAccess } from "./useAccess";
export function operationError(cause: unknown) {
  const error = cause as { message?: string; code?: string };
  const message = error?.message || "";
  if (message.includes("HMS_FORBIDDEN") || error?.code === "42501")
    return "This action is outside your account permissions. Contact your administrator.";
  if (message.includes("HMS_CONFLICT"))
    return "This record changed. Refresh and open it again before saving.";
  if (message.includes("HMS_INVALID"))
    return (
      message
        .replace(/^.*HMS_INVALID:\s*/, "")
        .replace(/^./, (value) => value.toUpperCase()) + "."
    );
  if (error?.code === "23505")
    return "This staff member or doctor is already linked to another account.";
  if (/schema cache|function .* does not exist/i.test(message))
    return "Hospital setup is incomplete. Ask your administrator to apply the supplied setup files.";
  return "The request could not be completed. Check your connection and try again.";
}
export async function callRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) throw new Error(operationError(error));
  return data as T;
}
export function useHospitalRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
  enabled = true,
) {
  const access = useAccess();
  const identity = JSON.stringify([
    access.userId,
    access.role,
    access.department,
    access.staffId,
    access.doctorId,
    access.wardIds,
    access.permissions,
    access.version,
  ]);
  const parameters = JSON.stringify(args);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{
    identity: string;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ identity, data: null, error: "", loading: enabled });
  const refresh = useCallback(() => setTick((value) => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    if (!enabled) return;
    void Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setState((old) => ({
          identity,
          data: old.identity === identity ? old.data : null,
          error: "",
          loading: true,
        }));
        return callRpc<T>(name, JSON.parse(parameters));
      })
      .then((data) => {
        if (!cancelled) setState({ identity, data, error: "", loading: false });
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setState({
            identity,
            data: null,
            error:
              cause instanceof Error ? cause.message : operationError(cause),
            loading: false,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [name, parameters, identity, enabled, tick]);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled, refresh]);
  return {
    ...(state.identity === identity
      ? state
      : { data: null, loading: enabled, error: "" }),
    refresh,
  };
}
