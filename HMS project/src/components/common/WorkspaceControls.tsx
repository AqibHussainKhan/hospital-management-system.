import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Search, X, LoaderCircle, RefreshCw } from "lucide-react";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--hms-border-strong)] bg-[var(--hms-surface)] px-4 py-2.5 text-xs font-semibold hover:bg-[var(--hms-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed";
export function SearchField({
  value,
  onChange,
  label = "Search records",
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <label className="hms-navbar-search flex w-full sm:max-w-sm">
      <Search size={17} className="hms-navbar-search-icon" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="hms-navbar-search-input"
      />
    </label>
  );
}
export function RefreshButton({
  refresh,
  loading,
}: {
  refresh: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      className={secondaryButton}
      onClick={refresh}
      disabled={loading}
    >
      <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
      Refresh
    </button>
  );
}
export function EmptyState({
  loading,
  text = "No records found.",
}: {
  loading: boolean;
  text?: string;
}) {
  return (
    <p
      role={loading ? "status" : undefined}
      className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--hms-text-muted)]"
    >
      {loading && <LoaderCircle size={18} className="animate-spin" />}
      {loading ? "Loading your workspace…" : text}
    </p>
  );
}
export function WorkspaceDialog({
  title,
  description,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const working = useRef(busy);
  useEffect(() => {
    close.current = onClose;
    working.current = busy;
  }, [onClose, busy]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const background = document.getElementById("root");
    const previousInert = background?.inert;
    if (background) background.inert = true;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      [
        ...(root.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]',
        ) || []),
      ].filter((node) => node.getClientRects().length);
    focusable()
      .find((node) => node.tagName !== "BUTTON")
      ?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !working.current) {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const nodes = focusable(),
        first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !root.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      if (background) background.inert = previousInert || false;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-busy={busy}
        className="hms-card flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px]"
      >
        <div className="flex shrink-0 items-start gap-4 border-b border-[var(--hms-border)] p-5 sm:p-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <p className="mt-2 text-xs leading-6 text-[var(--hms-text-muted)]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="rounded-xl p-2 hover:bg-[var(--hms-surface-hover)] disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
