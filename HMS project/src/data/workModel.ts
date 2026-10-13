export type WorkKind =
  | "clinical"
  | "prescriptions"
  | "vitals"
  | "roster"
  | "leave"
  | "approvals";
export interface WorkItem {
  id: string;
  kind: WorkKind;
  patient_id: string | null;
  staff_id: string | null;
  department: string;
  data: Record<string, unknown>;
  status: string;
  revision: number;
  author?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  decided_by: string | null;
  decision_reason: string;
}
export const workTitles: Record<WorkKind, string> = {
  clinical: "Clinical Records",
  prescriptions: "Prescriptions",
  vitals: "Vital Signs",
  roster: "Duty Roster",
  leave: "Leave Requests",
  approvals: "Approval Center",
};
export const workDescriptions: Record<WorkKind, string> = {
  clinical: "Clinical and nursing notes for patients in your care",
  prescriptions: "Prescribed medicines and dispensing history",
  vitals: "Recorded measurements for patients in your assigned wards",
  roster: "Scheduled shifts and duty timings",
  leave: "Submit requests and follow approval decisions",
  approvals: "Review attendance corrections and invoice void requests",
};
export const workText = (item: WorkItem, field: string) =>
  String(item.data[field] ?? "");
