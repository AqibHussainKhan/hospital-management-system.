import { lazy, Suspense } from "react";
import AppErrorBoundary from "../components/common/AppErrorBoundary";
const PatientAnalytics = lazy(() => import("../pages/patientAnalytics/PatientAnalytics"));
import { Navigate, Route, Routes } from "react-router-dom";
import { AccountProvider } from "../context/AccountContext";
import type { User } from "../App";
const Settings = lazy(() => import("../pages/settings/Settings"));
const Administrator = lazy(() => import("../pages/administrator/Administrator"));
const HmsDashboard = lazy(() => import("../pages/dashboard/HmsDashboard"));
const Patients = lazy(() => import("../pages/patients/Patients"));
const Doctors = lazy(() => import("../pages/doctors/Doctors"));
const Appointments = lazy(() => import("../pages/appointments/Appointments"));
const Laboratory = lazy(() => import("../pages/laboratory/Laboratory"));
const Pharmacy = lazy(() => import("../pages/pharmacy/Pharmacy"));
const Wards = lazy(() => import("../pages/wards/Wards"));
const OperationTheater = lazy(() => import("../pages/operationTheater/OperationTheater"));
const Staff = lazy(() => import("../pages/staff/Staff"));
const Attendance = lazy(() => import("../pages/attendance/Attendance"));
const Billing = lazy(() => import("../pages/billing/Billing"));
const Reports = lazy(() => import("../pages/reports/Reports"));

interface AppRoutesProps { user: User; onLogout: () => void; }
export default function AppRoutes({ user, onLogout }: AppRoutesProps) {
  return (
    <AccountProvider user={user}><AppErrorBoundary><Suspense fallback={<p role="status" className="min-h-screen bg-[var(--hms-bg)] p-10 text-[var(--hms-text)]">Loading hospital workspace…</p>}><Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<HmsDashboard user={user} onLogout={onLogout} />} />
      <Route path="/patients" element={<Patients onLogout={onLogout} />} />
      <Route path="/doctors" element={<Doctors onLogout={onLogout} />} />
      <Route path="/appointments" element={<Appointments onLogout={onLogout} />} />
      <Route path="/laboratory" element={<Laboratory onLogout={onLogout} />} />
      <Route path="/pharmacy" element={<Pharmacy onLogout={onLogout} />} />
      <Route path="/wards" element={<Wards onLogout={onLogout} />} />
      <Route path="/operation-theater" element={<OperationTheater onLogout={onLogout} />} />
      <Route path="/staff" element={<Staff onLogout={onLogout} />} />
      <Route path="/attendance" element={<Attendance onLogout={onLogout} />} />
      <Route path="/billing" element={<Billing onLogout={onLogout} />} />
      <Route path="/reports" element={<Reports onLogout={onLogout} />} />
      <Route path="/patient-analytics" element={<PatientAnalytics onLogout={onLogout} />} />
      <Route path="/settings" element={<Settings onLogout={onLogout} />} />
      <Route path="/administrator" element={<Administrator key={user.email} user={user} onLogout={onLogout} />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes></Suspense></AppErrorBoundary></AccountProvider>
  );
}
