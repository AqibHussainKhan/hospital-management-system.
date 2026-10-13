import { dateLabel } from "../../data/dashboardStore";

export default function VisitChart({
  data,
  monthly = false,
  onSelect
}: {
  data: { date: string; count: number }[];
  monthly?: boolean;
  onSelect?: (date: string) => void
}) {
  const max = Math.max(1, ...data.map(d => d.count));

  return (
    <div className="overflow-x-auto">
      <div
        className={`relative mt-6 flex h-[175px] min-h-[175px] shrink-0 items-end justify-between gap-2 border-b border-[var(--hms-border)] px-2 ${monthly ? "min-w-[680px]" : ""}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 flex h-full flex-col justify-between"
        >
          <div className="border-t border-dashed border-[var(--hms-border)]" />
          <div className="border-t border-dashed border-[var(--hms-border)]" />
          <div className="border-t border-dashed border-[var(--hms-border)]" />
        </div>

        {data.map(d => (
          <button
            type="button"
            key={d.date}
            aria-label={`${dateLabel(d.date)}: ${d.count} visits`}
            title={`${dateLabel(d.date)}: ${d.count} visits`}
            onClick={() => onSelect?.(d.date)}
            className="group relative flex h-full flex-1 items-end justify-center outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span
              className="relative block w-full max-w-[22px] rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-400 transition-[height] duration-300 group-hover:from-blue-500 group-hover:to-cyan-300"
              style={{
                height: d.count ? `${d.count / max * 92}%` : "2px",
                opacity: d.count ? 1 : 0.25
              }}
            />

            <span className="absolute -top-5 rounded-md bg-[var(--hms-surface-secondary)] px-1.5 py-1 text-[10px] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
              {d.count}
            </span>
          </button>
        ))}
      </div>

      <div
        className={`mt-3 flex justify-between gap-2 px-2 ${monthly ? "min-w-[680px]" : ""}`}
      >
        {data.map((d, i) => (
          <span
            key={d.date}
            className="flex-1 text-center text-[9px] text-[var(--hms-text-muted)]"
          >
            {monthly
              ? (
                  i % 5 === 0 || i === data.length - 1
                    ? d.date.slice(8)
                    : ""
                )
              : new Intl.DateTimeFormat("en", {
                  weekday: "short",
                  timeZone: "UTC"
                }).format(new Date(d.date + "T12:00:00Z"))}
          </span>
        ))}
      </div>
    </div>
  );
}