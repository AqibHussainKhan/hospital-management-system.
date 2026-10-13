export const roles = [
  {
    id: "admin",
    label: "Administrator",
    description: "Hospital operations, account access and approvals",
  },
  {
    id: "doctor",
    label: "Doctor",
    description: "Assigned patients, appointments and clinical records",
  },
  {
    id: "nurse",
    label: "Nurse",
    description: "Assigned wards, nursing notes and vital signs",
  },
  {
    id: "receptionist",
    label: "Receptionist",
    description: "Registration, appointments and availability",
  },
  {
    id: "lab_staff",
    label: "Laboratory Staff",
    description: "Hospital test orders, samples and results",
  },
  {
    id: "pharmacist",
    label: "Pharmacist",
    description: "Stock, expiry and prescription dispensing",
  },
  {
    id: "cashier",
    label: "Cashier / Billing",
    description: "Invoices, receipts and payment collection",
  },
  {
    id: "hr",
    label: "HR / Attendance",
    description: "Staff, attendance, shifts and leave approvals",
  },
  {
    id: "ward_incharge",
    label: "Ward In-charge",
    description: "Assigned wards and admission coordination",
  },
  {
    id: "ot_coordinator",
    label: "OT Coordinator",
    description: "Theater schedules and surgical coordination",
  },
  {
    id: "department_head",
    label: "Department Head",
    description: "Department records, team and approvals",
  },
  {
    id: "staff",
    label: "Support Staff",
    description: "Personal attendance, shifts and requests",
  },
] as const;
export type Role = (typeof roles)[number]["id"];
export type Action = "view" | "add" | "edit" | "delete" | "export" | "approve";
export const actions: Action[] = [
  "view",
  "add",
  "edit",
  "delete",
  "export",
  "approve",
];
export const modules = [
  "patients",
  "doctors",
  "appointments",
  "patient-analytics",
  "laboratory",
  "pharmacy",
  "wards",
  "operation-theater",
  "staff",
  "attendance",
  "billing",
  "reports",
  "clinical",
  "prescriptions",
  "vitals",
  "roster",
  "leave",
  "approvals",
  "users",
  "audit",
  "hospital-settings",
] as const;
export type Module = (typeof modules)[number];
export interface HospitalAccess {
  userId: string;
  role: Role;
  department: string;
  staffId: string | null;
  doctorId: string | null;
  wardIds: string[];
  permissions: string[];
  version: string;
}
const common = [
  "attendance:view",
  "roster:view",
  "leave:view",
  "leave:add",
  "leave:edit",
  "approvals:view",
  "approvals:add",
];
const reads = (...names: Module[]) => names.map((name) => `${name}:view`);
const manage = (...names: Module[]) =>
  names.flatMap((name) =>
    ["view", "add", "edit", "export"].map((action) => `${name}:${action}`),
  );
export const defaultPermissions: Record<Role, string[]> = {
  admin: modules.flatMap((name) =>
    actions.map((action) => `${name}:${action}`),
  ),
  doctor: [
    ...common,
    ...reads(
      "patients",
      "doctors",
      "appointments",
      "laboratory",
      "pharmacy",
      "wards",
      "operation-theater",
      "patient-analytics",
    ),
    ...manage("clinical", "prescriptions"),
    "vitals:view",
    "laboratory:add",
    "appointments:edit",
  ],
  nurse: [
    ...common,
    ...reads(
      "patients",
      "doctors",
      "wards",
      "laboratory",
      "clinical",
      "prescriptions",
    ),
    "clinical:add",
    ...manage("vitals"),
  ],
  receptionist: [
    ...common,
    ...manage("patients", "appointments"),
    ...reads("doctors", "wards"),
  ],
  lab_staff: [
    ...common,
    ...reads("patients", "laboratory"),
    "laboratory:edit",
    "laboratory:export",
  ],
  pharmacist: [
    ...common,
    ...manage("pharmacy"),
    ...reads("patients", "prescriptions"),
    "prescriptions:edit",
    "prescriptions:export",
  ],
  cashier: [
    ...common,
    ...manage("billing"),
    ...reads("patients", "reports"),
    "reports:export",
  ],
  hr: [
    ...common,
    ...manage("staff", "attendance", "roster"),
    ...reads("reports"),
    "reports:export",
    "leave:approve",
    "approvals:approve",
  ],
  ward_incharge: [
    ...common,
    ...reads(
      "patients",
      "wards",
      "doctors",
      "clinical",
      "vitals",
      "prescriptions",
    ),
    "patients:edit",
    "wards:edit",
  ],
  ot_coordinator: [
    ...common,
    ...manage("operation-theater"),
    ...reads("patients", "doctors", "wards"),
  ],
  department_head: [
    ...common,
    ...reads(
      "patients",
      "doctors",
      "appointments",
      "laboratory",
      "wards",
      "operation-theater",
      "staff",
      "attendance",
      "patient-analytics",
      "reports",
      "clinical",
      "prescriptions",
      "vitals",
    ),
    ...manage("roster"),
    "leave:approve",
    "approvals:approve",
    "reports:export",
  ],
  staff: common,
};
export function validAccess(value: unknown): value is HospitalAccess {
  if (!value || typeof value !== "object") return false;
  const v = value as HospitalAccess;
  return (
    typeof v.userId === "string" &&
    roles.some((role) => role.id === v.role) &&
    typeof v.department === "string" &&
    (v.staffId === null || typeof v.staffId === "string") &&
    (v.doctorId === null || typeof v.doctorId === "string") &&
    Array.isArray(v.wardIds) &&
    v.wardIds.every((id) => typeof id === "string") &&
    Array.isArray(v.permissions) &&
    v.permissions.every((p) => typeof p === "string") &&
    typeof v.version === "string"
  );
}
export const roleLabel = (role: Role) =>
  roles.find((item) => item.id === role)?.label || role;
export const canAccess = (
  access: HospitalAccess | null,
  module: string,
  action: Action = "view",
) =>
  !!access &&
  (access.role === "admin" ||
    access.permissions.includes(`${module}:${action}`));
export function canVisit(access: HospitalAccess | null, path: string) {
  if (!access) return false;
  if (["/dashboard", "/settings", "/administrator"].includes(path)) return true;
  return canAccess(access, path.split("/")[1]);
}
export const accessFingerprint = (access: HospitalAccess) =>
  JSON.stringify([
    access.userId,
    access.role,
    access.department,
    access.staffId,
    access.doctorId,
    [...access.wardIds].sort(),
    [...access.permissions].sort(),
    access.version,
  ]);
export const collectionModule: Record<string, Module> = {
  patients: "patients",
  doctors: "doctors",
  appointments: "appointments",
  wards: "wards",
  tests: "laboratory",
  medicines: "pharmacy",
  surgeries: "operation-theater",
  staff: "staff",
  attendance: "attendance",
  billing: "billing",
  visits: "patient-analytics",
};
