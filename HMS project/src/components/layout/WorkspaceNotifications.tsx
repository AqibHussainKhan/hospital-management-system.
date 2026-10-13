import { useState } from "react";
import { Bell, X, CheckCheck, ArrowUpRight } from "lucide-react";
import { fullTime } from "../../data/activityModel";
import { SearchField } from "../common/WorkspaceControls";
export interface WorkspaceNotice {
  id: string;
  title: string;
  message: string;
  time: string | null;
  unread: boolean;
  open: () => void;
  markRead: () => void;
}
export default function WorkspaceNotifications({
  items,
  error,
  onClose,
  onMarkAll,
}: {
  items: WorkspaceNotice[];
  error: string;
  onClose: () => void;
  onMarkAll: () => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All");
  const unread = items.filter((item) => item.unread).length;
  const visible = items.filter(
    (item) =>
      (filter === "All" || item.unread) &&
      `${item.title} ${item.message}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div
      id="hms-notifications-panel"
      role="dialog"
      aria-label="Notifications"
      className="hms-card flex max-h-[calc(100dvh-110px)] flex-col overflow-hidden rounded-[18px]"
    >
      <div className="flex items-center gap-3 border-b border-[var(--hms-border)] p-4">
        <span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-500">
          <Bell size={18} />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <p className="mt-1 text-xs text-[var(--hms-text-muted)]">
            {unread ? `${unread} unread updates` : "All up to date"}
          </p>
        </div>
        <button
          type="button"
          disabled={!unread}
          aria-label="Mark all notifications as read"
          onClick={onMarkAll}
          className="rounded-lg p-2 text-blue-500 disabled:opacity-40"
        >
          <CheckCheck size={17} />
        </button>
        <button
          type="button"
          aria-label="Close notifications"
          onClick={onClose}
          className="rounded-lg p-2"
        >
          <X size={17} />
        </button>
      </div>
      <div className="space-y-3 p-3">
        <SearchField
          label="Search notifications"
          value={query}
          onChange={setQuery}
          placeholder="Search notifications…"
        />
        <div className="flex gap-2">
          {["All", "Unread"].map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={value === filter}
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs ${value === filter ? "bg-blue-500/10 text-blue-500" : "text-[var(--hms-text-muted)]"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 overflow-y-auto px-3 pb-3">
        {error && (
          <p role="alert" className="p-3 text-xs text-red-500">
            {error}
          </p>
        )}
        {visible.length ? (
          visible.slice(0, 30).map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                item.markRead();
                item.open();
                onClose();
              }}
              className={`mb-2 flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-[var(--hms-surface-secondary)] ${item.unread ? "bg-blue-500/5" : ""}`}
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.unread ? "bg-blue-500" : "bg-transparent"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">
                  {item.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--hms-text-muted)]">
                  {item.message}
                </span>
                <span className="mt-2 block text-[10px] text-[var(--hms-text-muted)]">
                  {fullTime(item.time)}
                </span>
              </span>
              <ArrowUpRight size={14} className="text-blue-500" />
            </button>
          ))
        ) : (
          <p className="py-8 text-center text-xs text-[var(--hms-text-muted)]">
            No updates to show.
          </p>
        )}
      </div>
    </div>
  );
}
