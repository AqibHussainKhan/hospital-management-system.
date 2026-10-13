import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import {
  BedDouble,
  FlaskConical,
  Pill,
  WalletCards,
  ChevronRight
} from "lucide-react";

import {
  usePatients,
  useWards,
  useLabTests,
  useMedicines,
  useRevenueSources,
  useActivityClock
} from "../../data/activityStore";

import {
  occupancy,
  labWorkload,
  pharmacyStock,
  revenueSummary,
  money,
  hospitalDate,
  fullTime
} from "../../data/activityModel";

import { isDate } from "../../data/dateModel";

import ActivityDialog from "./ActivityDialog";

export default function HospitalOperations() {
  const patients = usePatients(),
    wards = useWards(),
    tests = useLabTests(),
    medicines = useMedicines(),
    revenue = useRevenueSources();

  const clock = useActivityClock();
  const today = hospitalDate(clock);
  const reduced = useReducedMotion();

  const [selected, setSelected] = useState<string | null>(null);

  const beds = occupancy(wards.records, patients.records),
    lab = labWorkload(tests.records),
    stock = pharmacyStock(medicines.records);

  let revenueError = revenue.error;
  let summary;

  try {
    summary = revenueSummary(revenue.modern, revenue.legacy, today);
  } catch (error) {
    revenueError =
      error instanceof Error ? error.message : "Billing unavailable.";

    summary = revenueSummary(null, null, today);
  }

  const expired = medicines.records.filter(
    m => isDate(m.expiry) && m.expiry < today
  ).length;

  const cards = [
    {
      id: "wards",
      title: "Available Beds",
      value: wards.loading || wards.error ? "—" : String(beds.available),
      detail: `${beds.occupied} occupied of ${beds.capacity} operational beds`,
      percent: beds.percent,
      path: "/wards",
      icon: BedDouble,
      error: wards.error
    },
    {
      id: "tests",
      title: "Laboratory Requests",
      value: tests.loading || tests.error ? "—" : String(lab.open),
      detail: `${lab.completed} completed · ${lab.pending} pending`,
      percent: lab.percent,
      path: "/laboratory",
      icon: FlaskConical,
      error: tests.error
    },
    {
      id: "medicines",
      title: "Pharmacy Alerts",
      value:
        medicines.loading || medicines.error
          ? "—"
          : String(stock.low.length + expired),
      detail: `${stock.low.length} low-stock batches · ${expired} expired batches`,
      percent: stock.percent,
      path: "/pharmacy",
      icon: Pill,
      error: medicines.error
    },
    {
      id: "billing",
      title: "Receipts Today",
      value:
        revenue.loading || revenueError
          ? "—"
          : money(summary.today || 0, true),
      detail: "Dated receipts received today · Pakistan dates",
      percent: summary.percent,
      path: "/billing",
      icon: WalletCards,
      error: revenueError
    },
  ];

  const card = cards.find(c => c.id === selected);

  return (
    <section>
      <h2 className="mb-5 text-lg font-semibold text-[var(--hms-text)]">
        Hospital Operations
      </h2>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(c => (
          <motion.button
            type="button"
            key={c.id}
            whileHover={reduced ? undefined : { y: -4 }}
            onClick={() => setSelected(c.id)}
            className="hms-card rounded-[24px] p-6 text-left"
          >
            <div className="flex justify-between">
              <c.icon size={22} className="text-blue-500" />

              <ChevronRight
                size={17}
                className="text-[var(--hms-text-muted)]"
              />
            </div>

            <h3 className="mt-5 text-sm text-[var(--hms-text-secondary)]">
              {c.title}
            </h3>

            <p className="mt-3 text-3xl font-semibold text-[var(--hms-text)]">
              {c.value}
            </p>

            <p className="mt-3 text-xs leading-6 text-[var(--hms-text-muted)]">
              {c.detail}
            </p>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-blue-500/10">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400"
                style={{
                  width: `${Math.min(100, Math.max(0, c.percent))}%`
                }}
              />
            </div>
          </motion.button>
        ))}
      </div>

      {card && (
        <ActivityDialog
          title={card.title}
          onClose={() => setSelected(null)}
        >
          <Link
            to={card.path}
            className="mb-6 inline-block rounded-xl bg-blue-600 px-4 py-3 text-sm text-white"
            onClick={() => setSelected(null)}
          >
            Open Department & Manage Records ↗
          </Link>

          {card.error && (
            <p role="alert" className="mb-4 text-sm text-red-500">
              {card.error}
            </p>
          )}

          <div className="max-h-[420px] space-y-3 overflow-auto">
            {card.id === "wards" &&
              wards.records.map(w => (
                <div
                  key={w.id}
                  className="rounded-xl border border-[var(--hms-border)] p-4"
                >
                  <p className="font-semibold">{w.name}</p>

                  <p className="mt-2 text-sm text-[var(--hms-text-muted)]">
                    {w.status === "Maintenance"
                      ? "Unavailable during maintenance"
                      : `${
                          w.occupied +
                          patients.records.filter(
                            p => p.status === "Admitted" && p.wardId === w.id
                          ).length
                        } of ${w.capacity} beds occupied`}
                  </p>
                </div>
              ))}

            {card.id === "tests" &&
              tests.records.map(t => (
                <div
                  key={t.id}
                  className="rounded-xl border border-[var(--hms-border)] p-4"
                >
                  <p className="font-semibold">
                    {t.test} · {t.status}
                  </p>

                  <p className="mt-2 text-sm text-[var(--hms-text-muted)]">
                    {t.patient} · {t.urgent ? "Urgent" : "Routine"}
                  </p>
                </div>
              ))}

            {card.id === "medicines" &&
              medicines.records.map(m => (
                <div
                  key={m.id}
                  className="rounded-xl border border-[var(--hms-border)] p-4"
                >
                  <p className="font-semibold">{m.name}</p>

                  <p className="mt-2 text-sm text-[var(--hms-text-muted)]">
                    {m.quantity} in stock · Reorder at {m.reorderLevel}{m.expiry ? ` · Expires ${m.expiry}` : ""}
                  </p>
                </div>
              ))}

            {card.id === "billing" && (
              <>
                <p className="mb-4 text-sm">
                  Total billed: {money(summary.billed)} · Received: {money(summary.paid)} · Due: {money(summary.outstanding)}
                </p>

                <p className="mb-4 text-xs text-[var(--hms-text-muted)]">
                  Opening balances without receipt dates are included in received totals and excluded from today's receipts.
                </p>

                {summary.entries.map(p => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[var(--hms-border)] p-4"
                  >
                    <p className="font-semibold">
                      {p.patient} · {money(p.amount)}
                    </p>

                    <p className="mt-2 text-xs text-[var(--hms-text-muted)]">
                      {p.receivedAt
                        ? fullTime(p.receivedAt)
                        : "Undated opening balance"}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </ActivityDialog>
      )}
    </section>
  );
}