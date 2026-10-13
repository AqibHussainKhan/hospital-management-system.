import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function ActivityDialog({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;

    if (!dialog) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    if (!dialog.open) dialog.showModal();

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;

      if (dialog.open) dialog.close();

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      )
        previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;

        const bounds = event.currentTarget.getBoundingClientRect();

        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
      className="m-auto max-h-[90dvh] w-[min(980px,calc(100vw-24px))] overflow-hidden rounded-[26px] border border-[var(--hms-border)] bg-[var(--hms-surface)] p-0 text-[var(--hms-text)] shadow-2xl backdrop:bg-slate-950/65 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--hms-border)] px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold">{title}</h2>

          <button
            autoFocus
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-xl p-2 text-[var(--hms-text-muted)] hover:bg-[var(--hms-surface-secondary)]"
          >
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {children}
        </div>
      </div>
    </dialog>
  );
}