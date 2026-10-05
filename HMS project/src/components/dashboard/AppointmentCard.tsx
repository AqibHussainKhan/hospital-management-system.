import { motion } from "framer-motion";
import { Clock3, Stethoscope } from "lucide-react";

export interface Appointment {
  id: number;
  patient: string;
  doctor: string;
  department: string;
  time: string;
  status: "Confirmed" | "Waiting" | "Completed";
  initials: string;
}

interface AppointmentCardProps {
  appointment: Appointment;
}

function AppointmentCard({
  appointment,
}: AppointmentCardProps) {
  const statusStyle =
    appointment.status === "Confirmed"
      ? "bg-blue-500/10 text-blue-400"
      : appointment.status === "Waiting"
        ? "bg-amber-500/10 text-amber-400"
        : "bg-emerald-500/10 text-emerald-400";

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className=" group flex items-center gap-3 rounded-2xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] p-3.5 transition-all duration-200 hover:border-blue-500/20"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-xs font-bold text-blue-500">
        {appointment.initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--hms-text)]">
              {appointment.patient}
            </p>

            <p className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-[var(--hms-text-secondary)]">
              <Stethoscope size={11} />
              {appointment.doctor}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-[var(--hms-text-secondary)]">
            <Clock3 size={11} />
            {appointment.time}
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <span className="truncate text-[9px] text-[var(--hms-text-muted)]">
            {appointment.department}
          </span>

          <span
            className={`rounded-full px-2 py-1 text-[8px] font-semibold ${statusStyle}`}
          >
            {appointment.status}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default AppointmentCard;


