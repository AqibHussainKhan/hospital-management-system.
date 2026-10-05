import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
export default function DashboardDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (dialog && !dialog.open) dialog.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; if (dialog?.open) dialog.close(); }; }, []);
  return <dialog ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }} className="m-auto max-h-[90dvh] w-[min(920px,calc(100vw-32px))] overflow-y-auto rounded-[24px] border border-[var(--hms-border)] bg-[var(--hms-surface)] p-0 text-[var(--hms-text)] shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"><header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--hms-border)] bg-[var(--hms-surface)] p-5"><h2 className="text-lg font-semibold">{title}</h2><button autoFocus type="button" aria-label="Close details" onClick={onClose} className="rounded-xl p-2 hover:bg-[var(--hms-surface-secondary)]"><X size={18} /></button></header><div className="p-5 sm:p-6">{children}</div></dialog>;
}
