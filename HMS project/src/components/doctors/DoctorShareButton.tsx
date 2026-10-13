import { useEffect, useRef, useState } from "react";

import {
  Share2,
  Link as LinkIcon,
  Mail,
  X,
  Copy,
  Check
} from "lucide-react";

import {
  doctorShareUrl,
  doctorShareText
} from "../../utils/doctorSharing";

import type { DoctorShareData } from "../../utils/doctorSharing";

export default function DoctorShareButton({
  doctor,
  className = ""
}: {
  doctor: DoctorShareData;
  className?: string
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const url = doctorShareUrl(doctor);
  const text = doctorShareText(doctor);

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);

  function close() {
    dialog.current?.close();
    setOpen(false);
  }

  async function share() {
    setMessage("");
    setCopied(false);

    const data = { title: doctor.name + " | MediCore", text, url };

    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }

    setOpen(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage("Link copied.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setMessage("Select the link and copy it with Ctrl/Cmd+C.");
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Share ${doctor.name}`}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          void share();
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] px-3 py-2 text-xs font-medium text-[var(--hms-text-secondary)] transition hover:border-blue-500/30 hover:text-blue-500 ${className}`}
      >
        <Share2 size={15} />
        Share
      </button>

      <dialog
        ref={dialog}
        aria-label={`Share ${doctor.name}`}
        onCancel={e => {
          e.preventDefault();
          close();
        }}
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[24px] border border-[var(--hms-border)] bg-[var(--hms-surface)] p-5 text-[var(--hms-text)] shadow-2xl backdrop:bg-black/50"
      >
        <header className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold">Share Doctor Profile</h2>

          <button
            type="button"
            aria-label="Close sharing"
            onClick={close}
            className="rounded-lg p-2"
          >
            <X size={18} />
          </button>
        </header>

        <p className="text-lg font-semibold">{doctor.name}</p>

        <p className="mt-1 text-sm text-[var(--hms-text-muted)]">
          {doctor.specialty}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`}
            className="rounded-xl bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-500"
          >
            WhatsApp
          </a>

          <a
            href={`mailto:?subject=${encodeURIComponent(doctor.name + " | MediCore")}&body=${encodeURIComponent(text + "\n\n" + url)}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 p-3 text-sm font-medium text-blue-500"
          >
            <Mail size={15} />
            Email
          </a>
        </div>

        <label className="mt-5 block text-xs">
          <span className="mb-2 flex items-center gap-2">
            <LinkIcon size={13} />
            Doctor profile link
          </span>

          <input
            ref={input}
            readOnly
            value={url}
            onFocus={e => e.currentTarget.select()}
            className="w-full rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] p-3 text-xs"
          />
        </label>

        <button
          type="button"
          onClick={() => void copy()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 text-sm font-medium text-white"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy Link"}
        </button>

        {message && (
          <p
            role="status"
            className="mt-3 text-xs text-[var(--hms-text-muted)]"
          >
            {message}
          </p>
        )}
      </dialog>
    </>
  );
}