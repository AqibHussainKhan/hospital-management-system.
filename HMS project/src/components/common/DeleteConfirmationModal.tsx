import { useContext, useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";

interface DeleteConfirmationModalProps {
  title: string;
  description: string;
  recordName: string;
  recordMeta?: string;
  recordLabel?: string;
  warning?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  error?: string;
  onClose: () => void;
  onConfirm: () => boolean | void | Promise<boolean | void>;
}

export default function DeleteConfirmationModal({
  title,
  description,
  recordName,
  recordMeta,
  recordLabel = "Selected record",
  warning = "This action cannot be undone.",
  confirmLabel = "Delete record",
  pendingLabel = "Deleting…",
  error = "",
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const theme = useContext(ThemeContext);
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = systemReducedMotion || theme?.preferences.reducedMotion;
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<{
    message: string;
    useStoreError: boolean;
  } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    mounted.current = true;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus({ preventScroll: true });

    return () => {
      mounted.current = false;
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  function close() {
    if (!submitting.current) onClose();
  }

  async function confirm() {
    // Guard immediately, before React renders the disabled buttons.
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setSubmitError(null);

    try {
      const success = await onConfirm();
      if (!mounted.current) return;
      if (success === false) {
        setSubmitError({
          message: "The action could not be completed. Please try again.",
          useStoreError: true,
        });
      } else {
        onClose();
      }
    } catch (cause) {
      if (mounted.current) {
        setSubmitError({
          message: cause instanceof Error
            ? cause.message
            : "The action could not be completed. Please try again.",
          useStoreError: false,
        });
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <motion.dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={pending}
      tabIndex={-1}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        event.preventDefault();
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
        );
        if (!buttons.length) {
          event.currentTarget.focus({ preventScroll: true });
          return;
        }
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.shiftKey
          ? (index <= 0 ? buttons.length - 1 : index - 1)
          : (index + 1) % buttons.length;
        buttons[next].focus({ preventScroll: true });
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          close();
        }
      }}
      className="m-auto max-h-[90dvh] w-[calc(100vw_-_2rem)] max-w-[460px] overflow-hidden rounded-[28px] border border-[var(--hms-border)] bg-[var(--hms-surface)] p-0 text-[var(--hms-text)] shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/15 bg-red-500/10 text-[var(--hms-danger)]">
              <Trash2 size={25} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <button
              type="button"
              aria-label="Close confirmation"
              disabled={pending}
              onClick={close}
              className="rounded-xl p-2 text-[var(--hms-text-muted)] transition hover:bg-[var(--hms-surface-secondary)] hover:text-[var(--hms-text)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--hms-danger)]">
            Confirm action
          </p>
          <h2 id={titleId} className="mt-2 text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          <p id={descriptionId} className="mt-3 text-sm leading-6 text-[var(--hms-text-muted)]">
            {description}
          </p>

          <div className="mt-5 rounded-2xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--hms-text-muted)]">
              {recordLabel}
            </p>
            <p className="mt-2 break-words text-sm font-semibold">{recordName}</p>
            {recordMeta && (
              <p className="mt-1.5 break-words text-xs leading-5 text-[var(--hms-text-muted)]">
                {recordMeta}
              </p>
            )}
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--hms-text-muted)]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--hms-danger)]" aria-hidden="true" />
            <span>{warning}</span>
          </p>

          {submitError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm leading-6 text-[var(--hms-danger)]">
              {(submitError.useStoreError && error) || submitError.message}
            </p>
          )}
        </div>

        <footer className="grid shrink-0 grid-cols-1 gap-3 border-t border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] px-6 py-5 min-[380px]:grid-cols-2 sm:px-7">
          <button
            ref={cancelRef}
            autoFocus
            type="button"
            disabled={pending}
            onClick={close}
            className="rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface)] px-3 py-3 text-sm font-semibold transition hover:bg-[var(--hms-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void confirm()}
            className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? (
              <LoaderCircle size={16} className="shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 size={16} className="shrink-0" aria-hidden="true" />
            )}
            <span role={pending ? "status" : undefined}>
              {pending ? pendingLabel : confirmLabel}
            </span>
          </button>
        </footer>
      </div>
    </motion.dialog>
  );
}
