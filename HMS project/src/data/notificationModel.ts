export type NotificationCategory = "appointments" | "patients" | "laboratory" | "pharmacy";

export const notificationSources = {
  appointments: { key: "medicore.appointments.v1", label: "Appointments", href: "/appointments" },
  patients: { key: "medicore.patients.v1", label: "Patients", href: "/patients" },
  laboratory: { key: "medicore.operations.tests.v1", label: "Laboratory", href: "/laboratory" },
  pharmacy: { key: "medicore.operations.medicines.v1", label: "Pharmacy", href: "/pharmacy" },
} as const;

export interface HospitalNotification {
  id: string;
  category: NotificationCategory;
  entityId: string;
  title: string;
  message: string;
  occurredAt: string | null;
  detectedAt: string;
  kind: "current" | "change";
  readAt: string | null;
  dismissedAt: string | null;
  resolvedAt: string | null;
}

export interface ObservedRecord {
  id: string;
  fingerprint: string;
  message: string;
  initialAlert: boolean;
  onAdd: boolean;
  onChange: boolean;
  initialTitle: string;
  newTitle: string;
  changeTitle: string;
  initialTime: string | null;
  newTime: string | null;
  changeTime: string | null;
}

export interface NotificationState {
  version: 1;
  sequence: number;
  baselines: Partial<Record<NotificationCategory, Record<string, string>>>;
  notifications: HospitalNotification[];
}

export const emptyNotificationState = (): NotificationState => ({ version: 1, sequence: 0, baselines: {}, notifications: [] });
const categories = Object.keys(notificationSources) as NotificationCategory[];
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 2000;
const timestamp = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const optionalTime = (v: unknown) => v === null || timestamp(v);
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const validDate = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const date = new Date(v + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v;
};

export function pakistanToday(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function observeRecords(category: NotificationCategory, data: unknown, now = Date.now()): ObservedRecord[] {
  if (!Array.isArray(data)) throw new Error("Expected saved record array");
  const records = data.map((v: unknown): ObservedRecord => {
    if (!object(v) || !text(v.id)) throw new Error("Invalid record ID");
    const base = { id: v.id, initialTime: null, newTime: null, changeTime: null };
    if (category === "appointments") {
      if (![v.appointmentId, v.patient, v.doctor, v.department, v.time].every(text) || !validDate(v.date)
        || !["Confirmed", "Waiting", "Completed", "Cancelled"].includes(String(v.status))) throw new Error("Invalid appointment");
      return {
        ...base, fingerprint: JSON.stringify([v.appointmentId, v.patient, v.doctor, v.department, v.date, v.time, v.status, v.date === pakistanToday(now)]),
        message: `${v.patient} · ${v.appointmentId} · ${v.department} · ${v.date}, ${v.time} · ${v.status}`,
        initialAlert: v.date === pakistanToday(now) && (v.status === "Confirmed" || v.status === "Waiting"),
        onAdd: true, onChange: true, initialTitle: "Today's appointment", newTitle: "Appointment added",
        changeTitle: v.status === "Cancelled" ? "Appointment cancelled" : v.status === "Completed" ? "Appointment completed" : "Appointment updated",
      };
    }
    if (category === "patients") {
      if (![v.patientId, v.name, v.department].every(text) || !["Admitted", "Outpatient", "Discharged"].includes(String(v.status))
        || ![v.registeredAt, v.admittedAt, v.updatedAt].every(optionalTime)) throw new Error("Invalid patient");
      const registered = v.registeredAt as string | null;
      return {
        ...base, fingerprint: JSON.stringify([v.patientId, v.name, v.department, v.status, v.admittedAt]),
        message: `${v.name} · ${v.patientId} · ${v.department} · ${v.status}`,
        initialAlert: registered !== null && now - Date.parse(registered) >= 0 && now - Date.parse(registered) < 86_400_000,
        onAdd: registered !== null, onChange: true, initialTitle: "Patient registered", newTitle: "Patient registered",
        changeTitle: v.status === "Admitted" ? "Patient admitted" : v.status === "Discharged" ? "Patient discharged" : "Patient record updated",
        initialTime: registered, newTime: registered, changeTime: v.updatedAt as string | null,
      };
    }
    if (category === "laboratory") {
      if (![v.patient, v.test].every(text) || !timestamp(v.requestedAt)
        || !["Pending", "In Progress", "Completed", "Cancelled"].includes(String(v.status))) throw new Error("Invalid lab request");
      return {
        ...base, fingerprint: JSON.stringify([v.patient, v.test, v.status, v.requestedAt]),
        message: `${v.test} · ${v.patient} · ${v.status}`,
        initialAlert: v.status === "Completed", onAdd: true, onChange: true,
        initialTitle: "Lab report ready", newTitle: v.status === "Completed" ? "Lab report ready" : "Lab request added",
        changeTitle: v.status === "Completed" ? "Lab report ready" : "Lab request updated",
        newTime: v.status === "Completed" ? null : v.requestedAt,
      };
    }
    if (!text(v.name) || !count(v.quantity) || !count(v.reorderLevel)) throw new Error("Invalid medicine");
    const low = v.quantity <= v.reorderLevel;
    const title = v.quantity === 0 ? "Medicine out of stock" : "Low medicine stock";
    return {
      ...base, fingerprint: JSON.stringify([v.name, v.quantity, v.reorderLevel]),
      message: `${v.name} · ${v.quantity} in stock · Reorder level: ${v.reorderLevel}`,
      initialAlert: low, onAdd: low, onChange: low,
      initialTitle: title, newTitle: title, changeTitle: title,
    };
  });
  if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error("Duplicate record IDs");
  return records.map((record) => ({ ...record, message: record.message.slice(0, 1800) }));
}

export function validNotificationState(value: unknown): value is NotificationState {
  if (!object(value) || value.version !== 1 || !count(value.sequence) || !object(value.baselines)
    || !Array.isArray(value.notifications) || value.notifications.length > 120) return false;
  if (!Object.entries(value.baselines).every(([key, baseline]) => categories.includes(key as NotificationCategory)
    && object(baseline) && Object.entries(baseline).every(([id, signature]) => text(id) && typeof signature === "string" && signature.length <= 16000))) return false;
  return value.notifications.every((n: unknown) => object(n)
    && [n.id, n.entityId, n.title, n.message].every(text) && categories.includes(n.category as NotificationCategory)
    && /^notification-[1-9]\d*$/.test(String(n.id)) && Number(String(n.id).slice(13)) <= (value.sequence as number)
    && (n.kind === "current" || n.kind === "change") && timestamp(n.detectedAt)
    && [n.occurredAt, n.readAt, n.dismissedAt, n.resolvedAt].every(optionalTime))
    && new Set(value.notifications.map((n: HospitalNotification) => n.id)).size === value.notifications.length;
}

export function reconcileNotifications(state: NotificationState, sources: Partial<Record<NotificationCategory, ObservedRecord[]>>, now = Date.now()): NotificationState {
  let result = state;
  const time = new Date(now).toISOString();
  for (const category of categories) {
    const records = sources[category];
    if (!records) continue; // An unreadable source must not advance its baseline or resolve existing alerts.
    const before = result.baselines[category];
    const after = Object.fromEntries(records.map((record) => [record.id, record.fingerprint]));
    if (before && JSON.stringify(before) === JSON.stringify(after)) continue;
    const notifications = result.notifications.map((notice) => {
      const prior = before && hasOwn(before, notice.entityId) ? before[notice.entityId] : undefined;
      const current = hasOwn(after, notice.entityId) ? after[notice.entityId] : undefined;
      return notice.category === category && !notice.resolvedAt && (current === undefined || (prior !== undefined && prior !== current))
        ? { ...notice, resolvedAt: time } : notice;
    });
    let sequence = result.sequence;
    for (const record of records) {
      const prior = before && hasOwn(before, record.id) ? before[record.id] : undefined;
      const added = prior === undefined;
      const shouldCreate = before === undefined ? record.initialAlert : added ? record.onAdd : prior !== record.fingerprint && record.onChange;
      if (!shouldCreate) continue;
      notifications.unshift({
        id: `notification-${++sequence}`, category, entityId: record.id,
        title: before === undefined ? record.initialTitle : added ? record.newTitle : record.changeTitle,
        message: record.message,
        occurredAt: before === undefined ? record.initialTime : added ? record.newTime : record.changeTime,
        detectedAt: time, kind: before === undefined ? "current" : "change",
        readAt: null, dismissedAt: null, resolvedAt: null,
      });
    }
    result = { version: 1, sequence, baselines: { ...result.baselines, [category]: after }, notifications: notifications.slice(0, 120) };
  }
  return result;
}

export function isUnread(notice: HospitalNotification) {
  return notice.readAt === null && notice.dismissedAt === null && notice.resolvedAt === null;
}

export function notificationTime(notice: HospitalNotification, now = Date.now()) {
  if (notice.kind === "current" && !notice.occurredAt) return "Current record";
  const delta = now - Date.parse(notice.occurredAt || notice.detectedAt);
  if (delta < 0) return "Date needs review";
  const relative = delta < 60_000 ? "Just now" : delta < 3_600_000 ? `${Math.floor(delta / 60_000)} min ago`
    : delta < 86_400_000 ? `${Math.floor(delta / 3_600_000)} hr ago` : `${Math.floor(delta / 86_400_000)} days ago`;
  return notice.occurredAt ? relative : `Observed ${relative.toLowerCase()}`;
}
