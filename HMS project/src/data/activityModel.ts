import { isDate } from "./dateModel";
export type PatientStatus = "Admitted" | "Outpatient" | "Discharged";
export const patientStatuses: PatientStatus[] = ["Admitted", "Outpatient", "Discharged"];
export const labStatuses = ["Pending", "In Progress", "Completed", "Cancelled"] as const;

export interface PatientRecord {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  department: string;
  phone: string;
  doctor: string;
  status: PatientStatus;
  initials: string;
  registeredAt: string | null;
  admittedAt: string | null;
  updatedAt: string | null;
  notes: string;
  doctorRef?: string;
  wardId?: string;
}

export interface WardRecord { id: string; name: string; capacity: number; occupied: number; status?: "Available" | "Maintenance" }
export interface LabRecord {
  id: string; patient: string; test: string;
  status: typeof labStatuses[number]; requestedAt: string; patientRef?: string; urgent?: boolean;
}
export interface MedicineRecord { id: string; name: string; quantity: number; reorderLevel: number; batch?: string; expiry?: string }
export type OperationKind = "wards" | "tests" | "medicines";
export type OperationRecord = WardRecord | LabRecord | MedicineRecord;

export const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
export const isText = (value: unknown): value is string => typeof value === "string" && value.length <= 2000;
const requiredText = (value: unknown): value is string => isText(value) && value.trim().length > 0;
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
export const isTimestamp = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const optionalTime = (value: unknown) => value === null || isTimestamp(value);

export function validPatient(value: unknown): value is PatientRecord {
  if (!isObject(value)) return false;
  return [value.id, value.patientId, value.name, value.gender, value.department, value.doctor, value.initials].every(requiredText)
    && isText(value.phone) && isText(value.notes) && count(value.age) && value.age <= 130
    && patientStatuses.includes(value.status as PatientStatus)
    && optionalTime(value.registeredAt) && optionalTime(value.admittedAt) && optionalTime(value.updatedAt)
    && [value.doctorRef, value.wardId].every(v => v === undefined || isText(v));
}
export function validWard(value: unknown): value is WardRecord {
  return isObject(value) && requiredText(value.id) && requiredText(value.name)
    && count(value.capacity) && value.capacity > 0 && count(value.occupied) && value.occupied <= value.capacity && (value.status === undefined || ["Available", "Maintenance"].includes(String(value.status)));
}
export function validLab(value: unknown): value is LabRecord {
  return isObject(value) && [value.id, value.patient, value.test].every(requiredText)
    && labStatuses.includes(value.status as LabRecord["status"]) && isTimestamp(value.requestedAt)
    && (value.patientRef === undefined || isText(value.patientRef)) && (value.urgent === undefined || typeof value.urgent === "boolean");
}
export function validMedicine(value: unknown): value is MedicineRecord {
  return isObject(value) && requiredText(value.id) && requiredText(value.name) && count(value.quantity) && count(value.reorderLevel) && (value.batch === undefined || isText(value.batch))
    && (value.expiry === undefined || isDate(value.expiry));
}

export function hospitalDate(now: number | string = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const part = (key: string) => parts.find((p) => p.type === key)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function patientActivity(record: PatientRecord): { time: string | null; label: string } {
  const registration = record.registeredAt ? Date.parse(record.registeredAt) : 0;
  const admission = record.admittedAt ? Date.parse(record.admittedAt) : 0;
  return admission > registration
    ? { time: record.admittedAt, label: "Admitted" }
    : { time: record.registeredAt, label: "Registered" };
}
export function recentPatients(records: PatientRecord[]): PatientRecord[] {
  return [...records].sort((a, b) => {
    const date = (record: PatientRecord) => { const time = patientActivity(record).time; return time ? Date.parse(time) : 0; };
    return date(b) - date(a);
  });
}
export function relativeTime(value: string | null, now = Date.now()): string {
  if (!value || !isTimestamp(value)) return "Date not recorded";
  const delta = now - Date.parse(value);
  if (delta < 0) return "Date needs review";
  if (delta < 60_000) return "Just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} min ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} hr ago`;
  const days = Math.floor(delta / 86_400_000);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
export function fullTime(value: string | null): string {
  return value && isTimestamp(value)
    ? new Intl.DateTimeFormat("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not recorded";
}
export function patientInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
export function nextPatientId(records: PatientRecord[]): string {
  const max = records.reduce((highest, record) => {
    const match = /^HMS-(\d+)$/.exec(record.patientId);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 10236);
  if (!Number.isSafeInteger(max + 1)) throw new Error("Enter a patient ID manually.");
  return `HMS-${max + 1}`;
}

export function occupancy(wards: WardRecord[], patients: PatientRecord[] = []) {
  const capacity = wards.filter(ward => ward.status !== "Maintenance").reduce((sum, ward) => sum + ward.capacity, 0);
  const occupied = wards.filter(ward => ward.status !== "Maintenance").reduce((sum, ward) => sum + ward.occupied + patients.filter(p => p.status === "Admitted" && p.wardId === ward.id).length, 0);
  return { capacity, occupied, available: capacity - occupied, percent: capacity ? occupied / capacity * 100 : 0 };
}
export function labWorkload(tests: LabRecord[]) {
  const pending = tests.filter((test) => test.status === "Pending").length;
  const inProgress = tests.filter((test) => test.status === "In Progress").length;
  const completed = tests.filter((test) => test.status === "Completed").length;
  const open = pending + inProgress;
  const active = open + completed;
  return { pending, inProgress, completed, open, percent: active ? open / active * 100 : 0 };
}
export function pharmacyStock(medicines: MedicineRecord[]) {
  const low = medicines.filter((item) => item.quantity <= item.reorderLevel);
  return { low, out: low.filter((item) => item.quantity === 0).length, percent: medicines.length ? low.length / medicines.length * 100 : 0 };
}
export function money(paisa: number, compact = false): string {
  const value = paisa / 100;
  return compact
    ? `Rs ${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`
    : `Rs ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value)}`;
}

export interface RevenueEntry {
  id: string; invoiceId: string; patient: string;
  amount: number; receivedAt: string | null; invoiceDate: string;
}
export interface RevenueSummary {
  source: "payments" | "balances" | "empty";
  today: number | null; paid: number; billed: number; outstanding: number;
  percent: number; entries: RevenueEntry[]; sample: boolean;
}

export function revenueSummary(modern: unknown, legacy: unknown, today: string): RevenueSummary {
  let source: RevenueSummary["source"] = "empty";
  let billed = 0;
  const entries: RevenueEntry[] = [];
  const invoiceIds = new Set<string>();
  let sample = false;
  const date = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

  if (modern !== null) {
    if (!isObject(modern) || modern.version !== 1 || !Array.isArray(modern.invoices)) throw new Error("Billing records could not be read.");
    source = "payments";
    sample = modern.sample === true;
    for (const invoice of modern.invoices) {
      if (!isObject(invoice) || !requiredText(invoice.id) || !isText(invoice.patientName) || !date(invoice.issuedOn) || !Array.isArray(invoice.items) || !Array.isArray(invoice.payments)) throw new Error("An invoice is invalid.");
      if (invoiceIds.has(invoice.id)) throw new Error("Duplicate invoices need review.");
      invoiceIds.add(invoice.id);
      let total = 0;
      let paid = 0;
      if (invoice.openingPaid !== undefined) {
        if (!count(invoice.openingPaid)) throw new Error("Opening balance is invalid.");
        paid += invoice.openingPaid;
        if (invoice.openingPaid) entries.push({ id: `${invoice.id}:opening`, invoiceId: invoice.id, patient: invoice.patientName, amount: invoice.openingPaid, receivedAt: null, invoiceDate: invoice.issuedOn as string });
      }
      for (const item of invoice.items) {
        if (!isObject(item) || !count(item.quantity) || !item.quantity || !count(item.unitAmount)) throw new Error("Invoice charges are invalid.");
        total += item.quantity * item.unitAmount;
      }
      for (const payment of invoice.payments) {
        if (!isObject(payment) || !requiredText(payment.id) || !count(payment.amount) || !payment.amount || !isTimestamp(payment.receivedAt)) throw new Error("A payment is invalid.");
        paid += payment.amount;
        entries.push({ id: `${invoice.id}:${payment.id}`, invoiceId: invoice.id, patient: invoice.patientName, amount: payment.amount, receivedAt: payment.receivedAt, invoiceDate: invoice.issuedOn as string });
      }
      if (!Number.isSafeInteger(total) || !Number.isSafeInteger(paid) || paid > total) throw new Error("Invoice payment totals are invalid.");
      billed += total;
    }
  } else if (legacy !== null) {
    if (!Array.isArray(legacy)) throw new Error("Invoice records could not be read.");
    source = "balances";
    for (const invoice of legacy) {
      if (!isObject(invoice) || !requiredText(invoice.id) || !isText(invoice.patient) || !date(invoice.date)
        || typeof invoice.amount !== "number" || !Number.isFinite(invoice.amount) || invoice.amount <= 0
        || typeof invoice.paid !== "number" || !Number.isFinite(invoice.paid) || invoice.paid < 0 || invoice.paid > invoice.amount) throw new Error("An invoice balance is invalid.");
      const total = Math.round(invoice.amount * 100);
      const paid = Math.round(invoice.paid * 100);
      if (invoiceIds.has(invoice.id)) throw new Error("Duplicate invoices need review.");
      invoiceIds.add(invoice.id);
      if (!Number.isSafeInteger(total) || !Number.isSafeInteger(paid)) throw new Error("Invoice values are too large.");
      billed += total;
      if (paid > 0) entries.push({ id: invoice.id, invoiceId: invoice.id, patient: invoice.patient, amount: paid, receivedAt: null, invoiceDate: invoice.date as string });
    }
  }
  const paid = entries.reduce((sum, payment) => sum + payment.amount, 0);
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error("Duplicate payments need review.");
  if (!Number.isSafeInteger(billed) || !Number.isSafeInteger(paid)) throw new Error("Billing totals are too large.");
  return {
    source, billed, paid, outstanding: billed - paid,
    today: source === "balances" ? null : entries.filter((entry) => entry.receivedAt && hospitalDate(entry.receivedAt) === today).reduce((sum, entry) => sum + entry.amount, 0),
    percent: billed ? paid / billed * 100 : 0,
    entries: entries.sort((a, b) => (b.receivedAt || b.invoiceDate).localeCompare(a.receivedAt || a.invoiceDate)), sample,
  };
}
