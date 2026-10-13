import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, ShieldCheck, Clock3 } from "lucide-react";
import { useAccount } from "../../context/AccountContext";
import { useAccess } from "../../features/access/useAccess";
import { useHospitalRpc } from "../../features/access/rpc";
import {
  usePatients,
  useLabTests,
  useMedicines,
} from "../../data/activityStore";
import { useAppointments } from "../../data/dashboardStore";
import {
  useRecords,
  keys,
  Page,
  Card,
  Stats,
  Badge,
  money,
  today,
  ErrorMessage,
} from "../../components/administration/shared";
import type {
  AttendanceRecord,
  BillRecord,
  StaffRecord,
} from "../../data/administrationModel";
import type { WorkItem } from "../../data/workModel";
import { profileNavigation } from "../../components/layout/profileNavigation";
import { EmptyState } from "../../components/common/WorkspaceControls";
export default function StaffDashboard({ onLogout }: { onLogout: () => void }) {
  const access = useAccess(),
    user = useAccount(),
    date = today();
  const patients = usePatients(),
    appointments = useAppointments(),
    labs = useLabTests(),
    medicines = useMedicines();
  const attendance = useRecords<AttendanceRecord>(keys.attendance),
    billing = useRecords<BillRecord>(keys.billing),
    staff = useRecords<StaffRecord>(keys.staff);
  const shifts = useHospitalRpc<WorkItem[]>(
    "hms_list_work",
    { work_kind: "roster" },
    access.can("roster"),
  );
  const leaves = useHospitalRpc<WorkItem[]>(
    "hms_list_work",
    { work_kind: "leave" },
    access.can("leave"),
  );
  const ownAttendance = attendance.records.filter(
    (row) => row.staffId === access.staffId && row.date === date,
  );
  const ownShifts = (shifts.data || [])
    .filter(
      (row) =>
        row.staff_id === access.staffId &&
        row.status === "Scheduled" &&
        String(row.data.date) >= date,
    )
    .sort((a, b) => String(a.data.date).localeCompare(String(b.data.date)))
    .slice(0, 4);
  const metrics =
    access.role === "cashier"
      ? [
          {
            label: "Active invoices",
            value: billing.records.filter((row) => !row.voided).length,
          },
          {
            label: "Outstanding",
            value: money(
              billing.records
                .filter((row) => !row.voided)
                .reduce((sum, row) => sum + row.amount - row.paid, 0),
            ),
          },
          { label: "Patients", value: patients.records.length },
          {
            label: "Today’s attendance",
            value: ownAttendance[0]?.status || "Not recorded",
          },
        ]
      : access.role === "pharmacist"
        ? [
            { label: "Inventory batches", value: medicines.records.length },
            {
              label: "Low stock",
              value: medicines.records.filter(
                (row) => row.quantity <= row.reorderLevel,
              ).length,
            },
            {
              label: "Expired batches",
              value: medicines.records.filter(
                (row) => row.expiry && row.expiry < date,
              ).length,
            },
            {
              label: "Today’s attendance",
              value: ownAttendance[0]?.status || "Not recorded",
            },
          ]
        : access.role === "hr"
          ? [
              {
                label: "Active staff",
                value: staff.records.filter((row) => row.status === "Active")
                  .length,
              },
              {
                label: "Present today",
                value: attendance.records.filter(
                  (row) => row.date === date && row.status === "Present",
                ).length,
              },
              {
                label: "Pending leave",
                value: (leaves.data || []).filter(
                  (row) => row.status === "Pending",
                ).length,
              },
              {
                label: "Your attendance",
                value: ownAttendance[0]?.status || "Not recorded",
              },
            ]
          : access.role === "staff"
            ? [
                {
                  label: "Today’s attendance",
                  value: ownAttendance[0]?.status || "Not recorded",
                },
                { label: "Upcoming shifts", value: ownShifts.length },
                {
                  label: "Pending leave",
                  value: (leaves.data || []).filter(
                    (row) =>
                      row.staff_id === access.staffId &&
                      row.status === "Pending",
                  ).length,
                },
                { label: "Department", value: access.department },
              ]
            : [
                {
                  label: "Patients in your scope",
                  value: patients.records.length,
                },
                {
                  label: "Appointments today",
                  value: appointments.records.filter(
                    (row) => row.date === date && row.status !== "Cancelled",
                  ).length,
                },
                {
                  label: "Pending lab orders",
                  value: labs.records.filter((row) =>
                    ["Pending", "In Progress"].includes(row.status),
                  ).length,
                },
                {
                  label: "Today’s attendance",
                  value: ownAttendance[0]?.status || "Not recorded",
                },
              ];
  const links = profileNavigation
    .flatMap((section) => section.items)
    .filter(
      (item) =>
        access.canVisit(item.path) &&
        !["/dashboard", "/administrator", "/settings"].includes(item.path),
    );
  return (
    <Page
      path="/dashboard"
      title="My Dashboard"
      subtitle={`${access.label} · ${access.department || "Hospital"} · ${date}`}
      onLogout={onLogout}
    >
      <section className="relative overflow-hidden rounded-[28px] border border-blue-500/15 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-[var(--hms-surface)] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-blue-500">
              Your hospital workspace
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Welcome, {user.name.split(" ")[0]}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--hms-text-secondary)]">
              Your assigned records, daily responsibilities and requests are
              available here.
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs text-blue-500">
            <ShieldCheck size={15} />
            {access.label}
          </span>
        </div>
      </section>
      <Stats items={metrics} />
      <ErrorMessage
        message={
          patients.error ||
          appointments.error ||
          labs.error ||
          medicines.error ||
          attendance.error ||
          billing.error ||
          staff.error ||
          shifts.error ||
          leaves.error
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <h2 className="mb-5 text-lg font-semibold">Your modules</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className="group flex items-center gap-3 rounded-2xl border border-[var(--hms-border)] p-4 transition hover:border-blue-500/30 hover:bg-blue-500/5"
              >
                <span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-500">
                  <Icon size={19} />
                </span>
                <span className="flex-1 text-sm font-medium">{label}</span>
                <ArrowUpRight
                  size={16}
                  className="text-[var(--hms-text-muted)] group-hover:text-blue-500"
                />
              </Link>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock3 size={18} className="text-blue-500" />
              My duty schedule
            </h2>
            {ownShifts.length ? (
              <div className="mt-5 space-y-3">
                {ownShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-xl bg-[var(--hms-surface-secondary)] p-4"
                  >
                    <p className="text-sm font-semibold">
                      {String(shift.data.date)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--hms-text-muted)]">
                      {String(shift.data.start)} – {String(shift.data.end)}
                      {shift.data.nextDay ? " · next day" : ""} · Pakistan time
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                loading={shifts.loading}
                text="No upcoming shifts assigned."
              />
            )}
            <Link to="/roster" className="text-xs font-semibold text-blue-500">
              View duty roster →
            </Link>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarDays size={18} className="text-blue-500" />
              My attendance today
            </h2>
            <div className="mt-4">
              <Badge>{ownAttendance[0]?.status || "Not recorded"}</Badge>
              {ownAttendance[0]?.checkIn && (
                <p className="mt-3 text-sm text-[var(--hms-text-muted)]">
                  Check-in {ownAttendance[0].checkIn}
                  {ownAttendance[0].checkOut
                    ? ` · Check-out ${ownAttendance[0].checkOut}`
                    : ""}
                </p>
              )}
            </div>
            <Link
              to="/attendance"
              className="mt-4 inline-block text-xs font-semibold text-blue-500"
            >
              Open attendance →
            </Link>
          </Card>
        </div>
      </div>
    </Page>
  );
}
