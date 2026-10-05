import { isObject } from "./activityModel";
import { isDate } from "./dateModel";
import { shiftMinutes } from "./recordCore";
export interface StaffRecord { id: string; name: string; department: string; role: string; phone: string; status: "Active" | "Inactive" }
export interface AttendanceRecord { id: string; staffId: string; name: string; date: string; status: "Present" | "Absent" | "Leave"; checkIn: string; checkOut: string; nextDay?: boolean }
export interface PaymentRecord { id: string; amount: number; receivedAt: string; reference: string }
export interface BillRecord { id: string; patient: string; patientId: string; service: string; date: string; amount: number; paid: number; payments?: PaymentRecord[]; openingPaid?: number; voided?: boolean }
const required = (v: unknown) => typeof v === "string" && !!v.trim() && v.length <= 2000;
const text = (v: unknown) => typeof v === "string" && v.length <= 2000;
const amount = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && Number.isSafeInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 0.0001;
export function validStaff(v: unknown): v is StaffRecord { return isObject(v) && [v.id, v.name, v.department, v.role].every(required) && text(v.phone) && ["Active", "Inactive"].includes(String(v.status)); }
export function validAttendance(v: unknown): v is AttendanceRecord {
  if (!isObject(v) || ![v.id, v.staffId, v.name].every(required) || !isDate(v.date) || !["Present", "Absent", "Leave"].includes(String(v.status)) || !text(v.checkIn) || !text(v.checkOut) || (v.nextDay !== undefined && typeof v.nextDay !== "boolean")) return false;
  if (v.status !== "Present") return v.checkIn === "" && v.checkOut === "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v.checkIn))) return false;
  try { shiftMinutes(String(v.checkIn), String(v.checkOut), v.nextDay === true); return true; } catch { return false; }
}
export function validBill(v: unknown): v is BillRecord {
  if (!isObject(v) || ![v.id, v.patient, v.patientId, v.service].every(required) || !isDate(v.date) || !amount(v.amount) || Number(v.amount) <= 0 || !amount(v.paid) || Number(v.paid) > Number(v.amount) || (v.voided !== undefined && typeof v.voided !== "boolean")) return false;
  if (v.payments === undefined) return true;
  if (!Array.isArray(v.payments) || !amount(v.openingPaid ?? 0)) return false;
  if (!v.payments.every(p => isObject(p) && required(p.id) && Number.isSafeInteger(p.amount) && Number(p.amount) > 0 && typeof p.receivedAt === "string" && Number.isFinite(Date.parse(p.receivedAt)) && text(p.reference))) return false;
  const payments = v.payments as PaymentRecord[];
  return new Set(payments.map(p => p.id)).size === payments.length && Math.round(Number(v.paid) * 100) === Math.round(Number(v.openingPaid ?? 0) * 100) + payments.reduce((sum, p) => sum + p.amount, 0);
}
export function checkAttendance(rows: AttendanceRecord[]) { if (new Set(rows.map(r => `${r.staffId}:${r.date}`)).size !== rows.length) throw new Error("Only one attendance record per staff member and date is allowed."); }
