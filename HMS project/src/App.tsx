import { accessFingerprint } from "./features/access/accessModel";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import {
  HospitalAuthProvider,
  useHospitalAuth,
} from "./features/auth/HospitalAuthProvider";
import { HospitalAuthGate } from "./features/auth/HospitalAuthGate";
import type { HospitalUser } from "./features/auth/authService";

// Existing pages that import `User` from App continue to work.
export type User = HospitalUser;

function HospitalWorkspace() {
  const auth = useHospitalAuth();
  return (
    <HospitalAuthGate>
      {auth.user && auth.access && (
        <>
          {auth.error && (
            <div className="mc-auth-workspace-error" role="alert">
              <span>{auth.error}</span>
              <button type="button" onClick={auth.clearMessages}>
                Dismiss
              </button>
            </div>
          )}
          <AppRoutes
            key={accessFingerprint(auth.access)}
            user={auth.user}
            onLogout={() => {
              void auth.signOut();
            }}
          />
        </>
      )}
    </HospitalAuthGate>
  );
}

export default function App() {
  return (
    <HospitalAuthProvider>
      <HospitalWorkspace />
    </HospitalAuthProvider>
  );
}
