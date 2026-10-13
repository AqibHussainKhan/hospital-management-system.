import { useHospitalAuth } from "../auth/HospitalAuthProvider";
import { canAccess, canVisit, roleLabel } from "./accessModel";
import type { Action } from "./accessModel";
export function useAccess() {
  const { access } = useHospitalAuth();
  if (!access) throw new Error("Hospital access has not been verified.");
  return {
    ...access,
    isAdmin: access.role === "admin",
    label: roleLabel(access.role),
    can: (module: string, action: Action = "view") =>
      canAccess(access, module, action),
    canVisit: (path: string) => canVisit(access, path),
  };
}
