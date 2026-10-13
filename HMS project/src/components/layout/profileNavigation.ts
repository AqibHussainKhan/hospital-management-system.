import {
  BarChart3,
  BedDouble,
  CalendarDays,
  Clock3,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Pill,
  Settings,
  UserRound,
  Users,
  UsersRound,
  ShieldCheck,
  ClipboardList,
  Activity,
  CalendarClock,
  CalendarCheck,
  Building2,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ProfileLink {
  label: string;
  path: string;
  icon: LucideIcon;
}
interface ProfileSection {
  title: string;
  items: ProfileLink[];
}

// Paths and labels match the current sidebar, including its profile/settings footer.
export const profileNavigation: ProfileSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Clinical",
    items: [
      { label: "Patients", path: "/patients", icon: Users },
      { label: "Doctors", path: "/doctors", icon: UserRound },
      { label: "Appointments", path: "/appointments", icon: CalendarDays },
      {
        label: "Patient Analytics",
        path: "/patient-analytics",
        icon: BarChart3,
      },
      { label: "Clinical Records", path: "/clinical", icon: ClipboardList },
      { label: "Prescriptions", path: "/prescriptions", icon: Pill },
      { label: "Vital Signs", path: "/vitals", icon: Activity },
    ],
  },
  {
    title: "Departments",
    items: [
      { label: "Laboratory", path: "/laboratory", icon: FlaskConical },
      { label: "Pharmacy", path: "/pharmacy", icon: Pill },
      { label: "Wards & Rooms", path: "/wards", icon: BedDouble },
      {
        label: "Operation Theater",
        path: "/operation-theater",
        icon: HeartPulse,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Staff", path: "/staff", icon: UsersRound },
      { label: "Attendance", path: "/attendance", icon: Clock3 },
      { label: "Billing", path: "/billing", icon: CreditCard },
      { label: "Reports", path: "/reports", icon: FileText },
      { label: "Users & Roles", path: "/users", icon: ShieldCheck },
      { label: "Audit Trail", path: "/audit", icon: ScrollText },
      {
        label: "Hospital Settings",
        path: "/hospital-settings",
        icon: Building2,
      },
    ],
  },
  {
    title: "My Work",
    items: [
      { label: "Duty Roster", path: "/roster", icon: CalendarClock },
      { label: "Leave Requests", path: "/leave", icon: CalendarCheck },
      { label: "Approval Center", path: "/approvals", icon: ShieldCheck },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My Profile", path: "/administrator", icon: UserRound },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];
