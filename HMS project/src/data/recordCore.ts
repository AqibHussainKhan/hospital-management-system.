export interface Identified {
  id: string;
}
export type Validator<T> = (value: unknown) => value is T;
export const conflictMessage =
  "This record changed in another tab or device. Refresh the list and reopen the editor before saving.";

// PostgreSQL JSONB can reorder object keys. Compare values, not wire key order.
export function stableJson(value: unknown): string | undefined {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical);
    if (item !== null && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, canonical(v)]),
      );
    return item;
  };
  return JSON.stringify(canonical(value));
}

export function assertUnchangedRecord<T extends Identified>(
  current: T[],
  expected: T,
): void {
  if (
    stableJson(current.find((row) => row.id === expected.id)) !==
    stableJson(expected)
  )
    throw new Error(conflictMessage);
}

export function validateRecords<T extends Identified>(
  value: unknown,
  validate: Validator<T>,
): T[] {
  if (
    !Array.isArray(value) ||
    !value.every(validate) ||
    new Set(value.map((r) => r.id)).size !== value.length
  ) {
    throw new Error(
      "Saved records are invalid. Existing data was kept; changes are blocked.",
    );
  }
  return value;
}

// Apply only this editor's changes. Preserve unrelated concurrent additions/edits.
export function mergeRecords<T extends Identified>(
  base: T[],
  next: T[],
  current: T[],
): T[] {
  const previous = new Map(base.map((r) => [r.id, r]));
  const proposed = new Map(next.map((r) => [r.id, r]));
  const latest = new Map(current.map((r) => [r.id, r]));
  for (const [id, old] of previous) {
    const change = proposed.get(id);
    if (stableJson(old) === stableJson(change)) continue;
    if (stableJson(latest.get(id)) !== stableJson(old))
      throw new Error(conflictMessage);
    if (change) latest.set(id, change);
    else latest.delete(id);
  }
  for (const [id, added] of proposed) {
    if (previous.has(id)) continue;
    if (latest.has(id)) throw new Error(conflictMessage);
    latest.set(id, added);
  }
  return [...latest.values()];
}

export function decimalToPaisa(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error(
      "Enter a non-negative amount with at most two decimal places.",
    );
  const [whole, fraction = ""] = value.trim().split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 1_000_000_000_000)
    throw new Error("Amount is outside the supported range.");
  return amount;
}

export function shiftMinutes(
  checkIn: string,
  checkOut: string,
  nextDay: boolean,
): number | null {
  if (!checkOut) return null;
  const parse = (time: string) =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
      ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
      : NaN;
  const duration = parse(checkOut) + (nextDay ? 1440 : 0) - parse(checkIn);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1440)
    throw new Error(
      "Check-out must follow check-in, with a shift of at most 24 hours.",
    );
  return duration;
}
