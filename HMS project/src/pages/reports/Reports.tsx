import { hospitalDate } from "../../data/activityModel";
import { useState } from "react";
import {
  Page,
  Card,
  Stats,
  Field,
  Table,
  useRecords,
  keys,
  today,
  money,
  buttonClass,
  cellClass,
  rowClass,
  downloadCsv,
  ErrorMessage,
} from "../../components/administration/shared";
import type {
  StaffRecord,
  AttendanceRecord,
  BillRecord,
} from "../../components/administration/shared";

export default function Reports({ onLogout }: { onLogout: () => void }) {
  const { records: staff, error: staffError } = useRecords<StaffRecord>(keys.staff);
  const { records: attendance, error: attendanceError } = useRecords<AttendanceRecord>(keys.attendance);
  const { records: bills, error: billingError } = useRecords<BillRecord>(keys.billing);
  const [start, setStart] = useState(() => today().slice(0, 7) + "-01");
  const [end, setEnd] = useState(today());
  const valid = !!start && !!end && start <= end;
  const inRange = (date: string) => valid && date >= start && date <= end;
  const selectedBills = bills.filter(b => !b.voided && inRange(b.date));
  const selectedAttendance = attendance.filter(a => inRange(a.date));
  const billed = selectedBills.reduce((sum, b) => sum + b.amount, 0);
  const collected = selectedBills.reduce((sum, b) => sum + b.paid, 0);
  const receipts = bills.filter(b => !b.voided).flatMap(b => b.payments || []).filter(p => inRange(hospitalDate(p.receivedAt)));
  const cashflow = receipts.reduce((sum,p) => sum+p.amount,0)/100;
  const present = selectedAttendance.filter(a => a.status === "Present").length;
  const departments = [...new Set(staff.map(s => s.department))].map(department => ({ department, count: staff.filter(s => s.department === department).length, active: staff.filter(s => s.department === department && s.status === "Active").length }));
  return (
    <Page
      title="Administration Reports"
      subtitle="Summaries from the staff, attendance and billing shared hospital records."
      path="/reports"
      onLogout={onLogout}
    >
      <Card>
        <div className="grid items-end gap-4 md:grid-cols-3">
          <Field label="Start date">
            <input
              aria-label="Start date"
              required
              type="date"
              className="hms-form-field"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </Field>

          <Field label="End date">
            <input
              aria-label="End date"
              required
              type="date"
              className="hms-form-field"
              value={end}
              onChange={e => setEnd(e.target.value)}
            />
          </Field>

          <button
            disabled={!valid}
            className={buttonClass + " h-11"}
            onClick={() =>
              downloadCsv(`report-${start}-${end}.csv`, [
                ["Metric", "Value"],
                ["Start date", start],
                ["End date", end],
                ["Current staff", staff.length],
                ["Invoices in date range", selectedBills.length],
                ["Billed PKR", billed],
                ["Paid to date on selected invoices PKR", collected],
                ["Outstanding PKR", billed - collected],
                ["Dated receipts in date range PKR", cashflow],
                ["Attendance records", selectedAttendance.length],
                ["Present records", present],
                [
                  "Absent records",
                  selectedAttendance.filter(a => a.status === "Absent").length,
                ],
                [
                  "Leave records",
                  selectedAttendance.filter(a => a.status === "Leave").length,
                ],
              ])
            }
          >
            Export Summary CSV
          </button>
        </div>
      </Card>

      <ErrorMessage
        message={
          valid
            ? ""
            : "Select a valid date range; start date must be before or equal to end date."
        }
      />
      <ErrorMessage
        message={[staffError, attendanceError, billingError]
          .filter(Boolean)
          .join(" ")}
      />

      <Stats
        items={[
          { label: "Billed in date range", value: money(billed) },
          { label: "Paid on selected invoices", value: money(collected) },
          {
            label: "Outstanding on selected invoices",
            value: money(billed - collected),
          },
          { label: "Invoices in date range", value: selectedBills.length },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-5 font-semibold">Attendance summary</h2>

          {(["Present", "Absent", "Leave"] as const).map(status => {
            const count = selectedAttendance.filter(
              a => a.status === status
            ).length;
            const percent = selectedAttendance.length
              ? count / selectedAttendance.length * 100
              : 0;

            return (
              <div key={status} className="mb-5">
                <div className="mb-2 flex justify-between text-sm">
                  <span>{status}</span>
                  <span>
                    {count} records · {percent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-blue-500/10">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}

          <p className="text-xs text-[var(--hms-text-muted)]">
            Percentages use recorded attendance entries. Unmarked staff are
            excluded, so this is not an absence rate for all scheduled shifts.
          </p>
        </Card>

        <Card>
          <h2 className="mb-5 font-semibold">Report scope</h2>
          <p className="text-sm leading-7 text-[var(--hms-text-muted)]">
            Staff counts reflect the current directory. Billing uses invoice
            dates; paid amounts show the current total received on those
            invoices, even if a payment was made later. Dated payment receipts
            received in this range total {money(cashflow)}. Undated legacy
            balances are excluded from cashflow. Current staff totals are
            independent of the report date range.
          </p>
          <p className="mt-4 text-sm">
            Current staff: <strong>{staff.length}</strong> · Active:{" "}
            <strong>
              {staff.filter(s => s.status === "Active").length}
            </strong>
          </p>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 font-semibold">Current staff by department</h2>
        <Table
          headers={["Department", "Total staff", "Active", "Inactive"]}
          empty={!departments.length}
        >
          {departments.map(d => (
            <tr key={d.department} className={rowClass}>
              <td className={cellClass}>{d.department}</td>
              <td className={cellClass}>{d.count}</td>
              <td className={cellClass}>{d.active}</td>
              <td className={cellClass}>{d.count - d.active}</td>
            </tr>
          ))}
        </Table>
      </div>
    </Page>
  );
}
