import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useHospitalAuth } from "./HospitalAuthProvider";
import LoginPage from "../../pages/auth/Login";
import ResetPassword from "../../pages/auth/ResetPassword";
import "../../pages/auth/Login.css";

export function HospitalAuthGate({ children }: { children: ReactNode }) {
  const { status } = useHospitalAuth();
  if (status === "loading") return <main className="mc-auth mc-auth-loading"><div role="status"><LoaderCircle size={30} className="mc-auth-spin" /><strong>Opening your workspace</strong><p>Verifying your hospital access…</p></div></main>;
  if (status === "recovery") return <ResetPassword />;
  if (status !== "signed_in") return <LoginPage />;
  return <>{children}</>;
}
