import { useState } from "react";
import { Download } from "lucide-react";
import { useAccess } from "../../features/access/useAccess";
import {
  usePatients,
  useLabTests,
  useMedicines,
} from "../../data/activityStore";
import { useAppointments, useVisits } from "../../data/dashboardStore";
import { hospitalDate } from "../../data/activityModel";
import { addDays } from "../../data/dateModel";
import {
  Page,
  Card,
  Stats,
  Field,
  ErrorMessage,
  keys,
  useRecords,
  today,
  money,
  buttonClass,
  downloadCsv,
} from "../../components/administration/shared";
import type {
  AttendanceRecord,
  BillRecord,
  StaffRecord,
} from "../../data/administrationModel";
export default function ScopeReports({
  module = "reports",
  onLogout,
}: {
  module?: string;
  onLogout: () => void;
}) {
  const access = useAccess(),
    now = today();
  const [from, setFrom] = useState(addDays(now, -29)),
    [to, setTo] = useState(now);
  const patients = usePatients(),
    labs = useLabTests(),
    medicines = useMedicines(),
    appointments = useAppointments(),
    visits = useVisits();
  const attendance = useRecords<AttendanceRecord>(keys.attendance),
    billing = useRecords<BillRecord>(keys.billing),
    staff = useRecords<StaffRecord>(keys.staff);
  const range = (date: string) => date >= from && date <= to,
    valid = from <= to;
  const metrics: { label: string; value: string | number }[] = [];
  if (access.can("patients"))
    metrics.push(
      {
        label: "Registered patients",
        value: patients.records.filter(
          (row) => row.registeredAt && range(hospitalDate(row.registeredAt)),
        ).length,
      },
      {
        label: "Current admitted patients",
        value: patients.records.filter((row) => row.status === "Admitted")
          .length,
      },
    );
  if (access.can("appointments"))
    metrics.push({
      label: "Appointments in period",
      value: appointments.records.filter(
        (row) => range(row.date) && row.status !== "Cancelled",
      ).length,
    });
  if (access.can("laboratory"))
    metrics.push({
      label: "Completed tests in period",
      value: labs.records.filter(
        (row) =>
          row.status === "Completed" && range(hospitalDate(row.requestedAt)),
      ).length,
    });
  if (access.can("pharmacy"))
    metrics.push({
      label: "Current low stock batches",
      value: medicines.records.filter((row) => row.quantity <= row.reorderLevel)
        .length,
    });
  if (access.can("staff"))
    metrics.push({
      label: "Current active staff",
      value: staff.records.filter((row) => row.status === "Active").length,
    });
  if (access.can("attendance"))
    metrics.push({
      label: "Present attendance entries",
      value: attendance.records.filter(
        (row) => range(row.date) && row.status === "Present",
      ).length,
    });
  if (access.can("billing"))
    metrics.push(
      {
        label: "Invoices issued in period",
        value: billing.records.filter((row) => range(row.date) && !row.voided)
          .length,
      },
      {
        label: "Payments received in period",
        value: money(
          billing.records.reduce(
            (sum, row) =>
              sum +
              (row.payments || [])
                .filter((payment) => range(hospitalDate(payment.receivedAt)))
                .reduce((total, payment) => total + payment.amount / 100, 0),
            0,
          ),
        ),
      },
      {
        label: "Current outstanding",
        value: money(
          billing.records
            .filter((row) => !row.voided)
            .reduce((sum, row) => sum + row.amount - row.paid, 0),
        ),
      },
    );
  const days = Array.from({ length: 7 }, (_, index) => addDays(to, index - 6));
  const counts = days.map((date) => ({
    date,
    count: visits.records.filter((row) => row.date === date && range(date))
      .length,
  }));
  const max = Math.max(1, ...counts.map((item) => item.count));
  return (
    <Page
      path={`/${module}`}
      title={
        module === "patient-analytics"
          ? "Patient Analytics"
          : "Department Reports"
      }
      subtitle="Metrics from records available to your account"
      onLogout={onLogout}
    >
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="From date">
            <input
              required
              type="date"
              className="hms-form-field"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To date">
            <input
              required
              type="date"
              min={from}
              className="hms-form-field"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          {access.can(module, "export") && (
            <button
              type="button"
              disabled={!valid}
              className={`${buttonClass} ml-auto`}
              onClick={() =>
                downloadCsv(`${module}-${from}-${to}.csv`, [
                  ["Metric", "Value", "From", "To"],
                  ...metrics.map((item) => [item.label, item.value, from, to]),
                ])
              }
            >
              <Download size={15} className="mr-2 inline" />
              Export report
            </button>
          )}
        </div>
        <p className="mt-4 text-xs text-[var(--hms-text-muted)]">
          Period metrics use the selected dates. Current occupancy, stock and
          balances reflect the latest available records.
        </p>
      </Card>
      <ErrorMessage
        message={
          !valid
            ? "Choose an end date on or after the start date."
            : patients.error ||
              labs.error ||
              medicines.error ||
              appointments.error ||
              visits.error ||
              attendance.error ||
              billing.error ||
              staff.error
        }
      />
      {valid && <Stats items={metrics} />}
      {access.can("patient-analytics") && (
        <Card>
          <h2 className="font-semibold">
            Patient visits · last 7 days of selected period
          </h2>
          <div
            className="mt-6 grid h-52 grid-cols-7 items-end gap-3"
            role="img"
            aria-label={counts
              .map((item) => `${item.date}: ${item.count} visits`)
              .join(", ")}
          >
            {counts.map((item) => (
              <div
                key={item.date}
                className="flex h-full flex-col justify-end text-center"
              >
                <p className="mb-2 text-xs font-semibold">{item.count}</p>
                <div
                  className="mx-auto w-full max-w-12 rounded-t-lg bg-blue-500/70"
                  style={{
                    height: `${Math.max(2, (item.count / max) * 140)}px`,
                  }}
                />
                <p className="mt-3 text-[10px] text-[var(--hms-text-muted)]">
                  {item.date.slice(5)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Page>
  );
}
