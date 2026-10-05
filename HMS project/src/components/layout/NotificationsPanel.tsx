import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, CalendarDays, Check, CheckCheck, FlaskConical, Pill, Search, Users, X } from "lucide-react";
import { isUnread, notificationSources, notificationTime } from "../../data/notificationModel";
import type { HospitalNotification, NotificationCategory } from "../../data/notificationModel";

interface NotificationsPanelProps {
  notifications: HospitalNotification[];
  unreadCount: number;
  error: string;
  onClose: () => void;
  onOpen: (notice: HospitalNotification) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onClearRead: () => void;
}

const icons = { appointments: CalendarDays, patients: Users, laboratory: FlaskConical, pharmacy: Pill };
const colors: Record<NotificationCategory, string> = {
  appointments: "bg-blue-500/10 text-blue-500", patients: "bg-violet-500/10 text-violet-500",
  laboratory: "bg-teal-500/10 text-teal-500", pharmacy: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export default function NotificationsPanel({
  notifications, unreadCount, error, onClose, onOpen, onMarkRead, onMarkAllRead, onDismiss, onClearRead,
}: NotificationsPanelProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const matching = notifications.filter((notice) => (filter === "all" || isUnread(notice))
    && `${notice.title} ${notice.message} ${notificationSources[notice.category].label}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visible = expanded ? matching : matching.slice(0, 6);

  return <div id="hms-notifications-panel" role="dialog" aria-label="Notifications"
    className="flex max-h-[calc(100dvh-100px)] flex-col overflow-hidden rounded-[18px] border border-[var(--hms-border)] bg-[var(--hms-surface)] text-[var(--hms-text)] shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
    <div className="flex shrink-0 items-center gap-3 border-b border-[var(--hms-border)] px-4 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500"><Bell size={18} /></span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-semibold">Notifications</h3>
        <p className="mt-1 text-[10px] text-[var(--hms-text-muted)]">{error ? "Some updates are unavailable" : unreadCount ? `${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"}` : "All up to date"}</p>
      </div>
      <button type="button" onClick={onMarkAllRead} disabled={!unreadCount} title="Mark all as read" aria-label="Mark all notifications as read"
        className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-500/10 disabled:cursor-default disabled:opacity-30"><CheckCheck size={18} /></button>
      <button type="button" onClick={onClose} aria-label="Close notifications" className="rounded-lg p-2 text-[var(--hms-text-muted)] transition hover:bg-[var(--hms-surface-secondary)]"><X size={17} /></button>
    </div>

    <div className="flex shrink-0 items-center gap-2 px-4 py-3" role="group" aria-label="Filter notifications">
      {(["all", "unread"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
        className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition ${filter === value ? "bg-blue-500/10 text-blue-500" : "text-[var(--hms-text-muted)] hover:bg-[var(--hms-surface-secondary)]"}`}>
        {value === "all" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
      </button>)}
      <button type="button" onClick={onClearRead} disabled={!notifications.some((notice) => notice.readAt || notice.resolvedAt)}
        className="ml-auto rounded-lg px-2 py-1.5 text-[10px] text-[var(--hms-text-muted)] hover:bg-[var(--hms-surface-secondary)] disabled:opacity-30">Clear read</button>
    </div>

    {expanded && <label className="mx-4 mb-3 flex shrink-0 items-center gap-2 rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] px-3 py-2">
      <Search size={14} className="text-[var(--hms-text-muted)]" />
      <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search notifications" placeholder="Search notifications..."
        className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[var(--hms-text-muted)]" />
    </label>}
    {error && <p role="status" className="mx-4 mb-3 shrink-0 rounded-xl bg-amber-500/10 px-3 py-2 text-[10px] leading-5 text-amber-700 dark:text-amber-300">{error}</p>}

    <div className="min-h-0 overflow-y-auto overscroll-contain" aria-live="polite" aria-relevant="additions removals">
      {visible.length ? visible.map((notice) => {
        const Icon = icons[notice.category];
        const unread = isUnread(notice);
        const time = notice.occurredAt || notice.detectedAt;
        return <div key={notice.id} className={`group flex items-start gap-2 border-t border-[var(--hms-border)] px-3 py-3 ${unread ? "bg-blue-500/[0.035]" : ""}`}>
          <button type="button" onClick={() => onOpen(notice)} className="flex min-w-0 flex-1 gap-3 rounded-lg p-1 text-left transition hover:bg-[var(--hms-surface-secondary)]"
            aria-label={`${notice.title}: ${notice.message}. Open ${notificationSources[notice.category].label}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colors[notice.category]}`}><Icon size={17} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2"><span className="text-[11px] font-semibold">{notice.title}</span>{unread && <span aria-label="Unread" className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}</span>
              <span className="mt-1 block break-words text-[10px] leading-5 text-[var(--hms-text-secondary)]">{notice.message}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[9px] text-[var(--hms-text-muted)]">
                <span title={`${notice.occurredAt ? "Recorded" : "First observed"}: ${new Intl.DateTimeFormat("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(new Date(time))}`}>{notificationTime(notice, now)}</span>
                <span>· {notificationSources[notice.category].label}</span>
                {notice.resolvedAt && <span className="rounded bg-[var(--hms-surface-secondary)] px-1.5 py-0.5">Previous update</span>}
              </span>
            </span>
            <ArrowUpRight size={13} className="mt-1 shrink-0 text-[var(--hms-text-muted)]" />
          </button>
          <div className="flex shrink-0 flex-col gap-1 pt-1">
            {unread && <button type="button" onClick={() => onMarkRead(notice.id)} title="Mark as read" aria-label={`Mark ${notice.title} as read`} className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-500/10"><Check size={13} /></button>}
            <button type="button" onClick={() => onDismiss(notice.id)} title="Dismiss" aria-label={`Dismiss ${notice.title}`} className="rounded-lg p-1.5 text-[var(--hms-text-muted)] hover:bg-[var(--hms-surface-secondary)]"><X size={13} /></button>
          </div>
        </div>;
      }) : <div className="px-5 py-10 text-center">
        <Bell size={25} className="mx-auto mb-3 text-[var(--hms-text-muted)]" />
        <p className="text-xs font-semibold">{query.trim() ? "No matching updates" : error ? "Updates partially available" : "You're all caught up"}</p>
        <p className="mx-auto mt-2 max-w-[240px] text-[10px] leading-5 text-[var(--hms-text-muted)]">{query.trim() ? "Try another name or department." : error ? "Some saved updates could not be loaded. Existing records were kept." : "Updates appear here when hospital records change."}</p>
      </div>}
    </div>

    <button type="button" onClick={() => { setExpanded((current) => !current); setQuery(""); }}
      className="w-full shrink-0 border-t border-[var(--hms-border)] px-4 py-3.5 text-[11px] font-semibold text-blue-500 transition hover:bg-blue-500/5">
      {expanded ? "Show recent notifications" : `View all notifications (${notifications.length})`}
    </button>
  </div>;
}
