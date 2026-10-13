import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AccountProvider } from "../context/AccountContext";
import AppErrorBoundary from "../components/common/AppErrorBoundary";
import { useAccess } from "../features/access/useAccess";
import { Page, Card } from "../components/administration/shared";
import type { User } from "../App";
const Settings = lazy(() => import("../pages/settings/Settings"));
const Administrator = lazy(
  () => import("../pages/administrator/Administrator"),
);
const HmsDashboard = lazy(() => import("../pages/dashboard/HmsDashboard"));
const Patients = lazy(() => import("../pages/patients/Patients"));
const Doctors = lazy(() => import("../pages/doctors/Doctors"));
const Appointments = lazy(() => import("../pages/appointments/Appointments"));
const Pharmacy = lazy(() => import("../pages/pharmacy/Pharmacy"));
const Wards = lazy(() => import("../pages/wards/Wards"));
const OperationTheater = lazy(
  () => import("../pages/operationTheater/OperationTheater"),
);
const Staff = lazy(() => import("../pages/staff/Staff"));
const Attendance = lazy(() => import("../pages/attendance/Attendance"));

const Reports = lazy(() => import("../pages/reports/Reports"));
const PatientAnalytics = lazy(
  () => import("../pages/patientAnalytics/PatientAnalytics"),
);
const UsersRoles = lazy(() => import("../pages/access/UsersRoles"));
const HospitalSettings = lazy(() => import("../pages/access/HospitalSettings"));
const AuditLog = lazy(() => import("../pages/access/AuditLog"));
const StaffDashboard = lazy(() => import("../pages/workspace/StaffDashboard"));
const ModuleWorkspace = lazy(
  () => import("../pages/workspace/ModuleWorkspace"),
);
const ScopeReports = lazy(() => import("../pages/workspace/ScopeReports"));
const WorkPage = lazy(() => import("../pages/workspace/WorkPage"));
interface AppRoutesProps {
  user: User;
  onLogout: () => void;
}
export default function AppRoutes({ user, onLogout }: AppRoutesProps) {
  const access = useAccess();
  const guard = (path: string, content: ReactNode) =>
    access.canVisit(path) ? (
      content
    ) : (
      <Page
        path={path}
        title="Access restricted"
        subtitle="This module is unavailable for your assigned role"
        onLogout={onLogout}
      >
        <Card>
          <p className="text-sm leading-7 text-[var(--hms-text-secondary)]">
            Your account is assigned the {access.label} role. Contact your
            administrator if you need access for your hospital duties.
          </p>
        </Card>
      </Page>
    );
  const module = (name: string, admin: ReactNode) =>
    guard(
      `/${name}`,
      access.isAdmin ? (
        admin
      ) : (
        <ModuleWorkspace key={name} module={name} onLogout={onLogout} />
      ),
    );
  return (
    <AccountProvider user={user}>
      <AppErrorBoundary>
        <Suspense
          fallback={
            <p
              role="status"
              className="min-h-screen bg-[var(--hms-bg)] p-10 text-[var(--hms-text)]"
            >
              Loading hospital workspace…
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                access.isAdmin ? (
                  <HmsDashboard user={user} onLogout={onLogout} />
                ) : (
                  <StaffDashboard onLogout={onLogout} />
                )
              }
            />
            <Route
              path="/patients"
              element={module("patients", <Patients onLogout={onLogout} />)}
            />
            <Route
              path="/doctors"
              element={module("doctors", <Doctors onLogout={onLogout} />)}
            />
            <Route
              path="/appointments"
              element={module(
                "appointments",
                <Appointments onLogout={onLogout} />,
              )}
            />
            <Route
              path="/laboratory"
              element={guard(
                "/laboratory",
                <ModuleWorkspace
                  key="laboratory"
                  module="laboratory"
                  onLogout={onLogout}
                />,
              )}
            />
            <Route
              path="/pharmacy"
              element={module("pharmacy", <Pharmacy onLogout={onLogout} />)}
            />
            <Route
              path="/wards"
              element={module("wards", <Wards onLogout={onLogout} />)}
            />
            <Route
              path="/operation-theater"
              element={module(
                "operation-theater",
                <OperationTheater onLogout={onLogout} />,
              )}
            />
            <Route
              path="/staff"
              element={module("staff", <Staff onLogout={onLogout} />)}
            />
            <Route
              path="/attendance"
              element={module("attendance", <Attendance onLogout={onLogout} />)}
            />
            <Route
              path="/billing"
              element={guard(
                "/billing",
                <ModuleWorkspace
                  key="billing"
                  module="billing"
                  onLogout={onLogout}
                />,
              )}
            />
            <Route
              path="/reports"
              element={guard(
                "/reports",
                access.isAdmin ? (
                  <Reports onLogout={onLogout} />
                ) : (
                  <ScopeReports onLogout={onLogout} />
                ),
              )}
            />
            <Route
              path="/patient-analytics"
              element={guard(
                "/patient-analytics",
                access.isAdmin ? (
                  <PatientAnalytics onLogout={onLogout} />
                ) : (
                  <ScopeReports
                    key="patient-analytics"
                    module="patient-analytics"
                    onLogout={onLogout}
                  />
                ),
              )}
            />
            {(
              [
                "clinical",
                "prescriptions",
                "vitals",
                "roster",
                "leave",
                "approvals",
              ] as const
            ).map((kind) => (
              <Route
                key={kind}
                path={`/${kind}`}
                element={guard(
                  `/${kind}`,
                  <WorkPage key={kind} kind={kind} onLogout={onLogout} />,
                )}
              />
            ))}
            <Route
              path="/users"
              element={guard("/users", <UsersRoles onLogout={onLogout} />)}
            />
            <Route
              path="/audit"
              element={guard("/audit", <AuditLog onLogout={onLogout} />)}
            />
            <Route
              path="/hospital-settings"
              element={guard(
                "/hospital-settings",
                <HospitalSettings onLogout={onLogout} />,
              )}
            />
            <Route
              path="/settings"
              element={<Settings onLogout={onLogout} />}
            />
            <Route
              path="/administrator"
              element={
                <Administrator
                  key={user.email}
                  user={user}
                  onLogout={onLogout}
                />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </AccountProvider>
  );
}
