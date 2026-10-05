import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Layout from "../layout/Layout";

export type { StaffRecord, AttendanceRecord, BillRecord } from "../../data/administrationModel";
import { validStaff, validAttendance, validBill, checkAttendance } from "../../data/administrationModel";
import { getRecordStore, useRecordStore } from "../../data/recordStore";
import type { Validator, Identified } from "../../data/recordCore";
export const keys = { staff: "medicore.admin.staff.v1", attendance: "medicore.admin.attendance.v1", billing: "medicore.admin.billing.v1" };
export const staffStore = getRecordStore(keys.staff, validStaff);
export const attendanceStore = getRecordStore(keys.attendance, validAttendance, checkAttendance);
export const billingStore = getRecordStore(keys.billing, validBill);
export function useRecords<T extends Identified>(key: string) {
  const validators = { [keys.staff]: validStaff, [keys.attendance]: validAttendance, [keys.billing]: validBill };
  const validate = validators[key];
  if (!validate) throw new Error("Unknown administration collection.");
  return useRecordStore(getRecordStore(key, validate as unknown as Validator<T>));
}
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const money = (value: number) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 2 }).format(value);
export const inputClass = "w-full rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] px-4 py-3 text-sm text-[var(--hms-text)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10";
export const buttonClass = "rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed";
export function Page({ title, subtitle, path, onLogout, children }: { title: string; subtitle: string; path: string; onLogout: () => void; children: ReactNode }) {
  return <Layout activePage={path} title={title} subtitle={subtitle} onLogout={onLogout}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1600px] space-y-6 pb-10 text-[var(--hms-text)]"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Administration</p><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm text-[var(--hms-text-muted)]">{subtitle}</p></div>{children}</motion.div></Layout>;
}
export function Card({ children }: { children: ReactNode }) { return <section className="hms-card rounded-[24px] p-5 md:p-6">{children}</section>; }
export function Stats({ items }: { items: { label: string; value: string | number }[] }) { return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(item => <div key={item.label} className="hms-card-soft rounded-2xl border border-[var(--hms-border)] p-5"><p className="text-xs text-[var(--hms-text-muted)]">{item.label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-blue-500">{item.value}</p></div>)}</div>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-2 text-xs font-medium"><span>{label}</span>{children}</label>; }
export function Badge({ children }: { children: ReactNode }) { return <span className="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500">{children}</span>; }
export function Table({ headers, children, empty }: { headers: string[]; children: ReactNode; empty: boolean }) { return <Card><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[var(--hms-border)] text-xs uppercase tracking-wide text-[var(--hms-text-muted)]">{headers.map(h => <th key={h} className="px-3 py-4">{h}</th>)}</tr></thead><tbody>{children}</tbody></table>{empty && <p className="py-12 text-center text-sm text-[var(--hms-text-muted)]">No records found.</p>}</div></Card>; }
export const cellClass = "px-3 py-4";
export const rowClass = "border-b border-[var(--hms-border)] last:border-0 hover:bg-[var(--hms-surface-secondary)]";
export function ErrorMessage({ message }: { message: string }) { return message ? <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{message}</p> : null; }
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const safe = (v: string | number) => { const text = String(v); return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"'; };
  const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(row => row.map(safe).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
