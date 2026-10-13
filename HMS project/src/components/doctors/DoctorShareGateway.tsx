import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Activity, Stethoscope, ArrowLeft, Share2 } from "lucide-react";

import { doctorFromHash } from "../../utils/doctorSharing";

import DoctorShareButton from "./DoctorShareButton";

export default function DoctorShareGateway({
  children
}: {
  children: ReactNode
}) {
  const [hash, setHash] = useState(() => window.location.hash);
  const [failedPhoto, setFailedPhoto] = useState("");

  useEffect(() => {
    const update = () => setHash(window.location.hash);

    window.addEventListener("hashchange", update);

    return () => window.removeEventListener("hashchange", update);
  }, []);

  if (!hash.startsWith("#doctor-card=")) return <>{children}</>;

  const doctor = doctorFromHash(hash);

  function back() {
    window.location.hash = "";
  }

  if (!doctor)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
        <section className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">
            Doctor link could not be opened
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            The link may be incomplete. Ask the sender to copy it again.
          </p>

          <button
            onClick={back}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm text-white"
          >
            Open MediCore
          </button>
        </section>
      </main>
    );

  const initials = doctor.name
    .replace(/^Dr\.\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map(v => v[0])
    .join("")
    .toUpperCase();

  return (
    <main className="hms-app flex min-h-screen flex-col items-center justify-center bg-[var(--hms-bg,var(--hms-background,#f5f7fa))] px-4 py-10 text-[var(--hms-text)]">
      <div className="mb-7 flex items-center gap-3">
        <span className="rounded-2xl bg-blue-500/10 p-3 text-blue-500">
          <Activity size={25} />
        </span>

        <div>
          <p className="text-xl font-semibold">MediCore</p>

          <p className="text-[10px] uppercase tracking-widest text-[var(--hms-text-muted)]">
            Hospital System
          </p>
        </div>
      </div>

      <article className="hms-card w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--hms-border)] shadow-xl">
        <div className="relative h-64 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          {doctor.photo && failedPhoto !== doctor.photo ? (
            <img
              alt={doctor.name}
              src={doctor.photo}
              referrerPolicy="no-referrer"
              onError={() => setFailedPhoto(doctor.photo || "")}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-semibold text-blue-500">
              {initials}
            </div>
          )}

          <span className="absolute bottom-4 left-5 rounded-full bg-[var(--hms-surface)] px-3 py-1.5 text-xs font-medium text-blue-500">
            {doctor.department || doctor.specialty}
          </span>
        </div>

        <div className="p-6">
          <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--hms-text-muted)]">
            <Share2 size={12} />
            Shared Doctor Profile
          </p>

          <h1 className="text-2xl font-semibold tracking-tight">
            {doctor.name}
          </h1>

          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-blue-500">
            <Stethoscope size={16} />
            {doctor.specialty}
          </p>

          {doctor.experience && (
            <p className="mt-4 text-sm text-[var(--hms-text-muted)]">
              {doctor.experience}
            </p>
          )}

          <p className="mt-5 border-t border-[var(--hms-border)] pt-4 text-xs text-[var(--hms-text-muted)]">
            Profile details shared by the sender.
          </p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={back}
              className="flex items-center gap-2 text-xs text-[var(--hms-text-secondary)]"
            >
              <ArrowLeft size={14} />
              Open MediCore
            </button>

            <DoctorShareButton doctor={doctor} />
          </div>
        </div>
      </article>
    </main>
  );
}