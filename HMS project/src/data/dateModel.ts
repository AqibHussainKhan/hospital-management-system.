export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;

  const d = new Date(value + "T12:00:00Z");

  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function pakistanDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  return ["year", "month", "day"]
    .map(key => parts.find(p => p.type === key)?.value)
    .join("-");
}

export function addDays(date: string, offset: number) {
  const d = new Date(date + "T12:00:00Z");

  d.setUTCDate(d.getUTCDate() + offset);

  return d.toISOString().slice(0, 10);
}

export function dateLabel(date: string, short = false) {
  return isDate(date)
    ? new Intl.DateTimeFormat("en-PK", {
        timeZone: "UTC",
        ...(short
          ? {
              month: "short",
              day: "numeric"
            }
          : {
              year: "numeric",
              month: "short",
              day: "numeric"
            })
      }).format(new Date(date + "T12:00:00Z"))
    : "Unknown date";
}

export function timeMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(time.trim());

  if (!match) return NaN;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (minute > 59 || (period ? hour < 1 || hour > 12 : hour > 23))
    return NaN;

  if (period) hour = hour % 12 + (period === "PM" ? 12 : 0);

  return hour * 60 + minute;
}