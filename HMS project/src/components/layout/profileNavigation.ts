import {
  BarChart3, BedDouble, CalendarDays, Clock3, CreditCard, FileText,
  FlaskConical, HeartPulse, LayoutDashboard, Pill, Settings, UserRound, Users, UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ProfileLink { label: string; path: string; icon: LucideIcon }
interface ProfileSection { title: string; items: ProfileLink[] }

// Paths and labels match the current sidebar, including its profile/settings footer.
export const profileNavigation: ProfileSection[] = [
  { title: "Overview", items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  { title: "Clinical", items: [
    { label: "Patients", path: "/patients", icon: Users },
    { label: "Doctors", path: "/doctors", icon: UserRound },
    { label: "Appointments", path: "/appointments", icon: CalendarDays },
    { label: "Patient Analytics", path: "/patient-analytics", icon: BarChart3 },
  ] },
  { title: "Departments", items: [
    { label: "Laboratory", path: "/laboratory", icon: FlaskConical },
    { label: "Pharmacy", path: "/pharmacy", icon: Pill },
    { label: "Wards & Rooms", path: "/wards", icon: BedDouble },
    { label: "Operation Theater", path: "/operation-theater", icon: HeartPulse },
  ] },
  { title: "Administration", items: [
    { label: "Staff", path: "/staff", icon: UsersRound },
    { label: "Attendance", path: "/attendance", icon: Clock3 },
    { label: "Billing", path: "/billing", icon: CreditCard },
    { label: "Reports", path: "/reports", icon: FileText },
  ] },
  { title: "Account", items: [
    { label: "My Profile", path: "/administrator", icon: UserRound },
    { label: "Settings", path: "/settings", icon: Settings },
  ] },
];
