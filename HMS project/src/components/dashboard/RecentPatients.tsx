import { MoreHorizontal } from "lucide-react";

export interface RecentPatient {
  id: number;
  name: string;
  patientId: string;
  department: string;
  doctor: string;
  status: "Admitted" | "Outpatient" | "Discharged";
  time: string;
  initials: string;
}

interface RecentPatientsProps {
  patients: RecentPatient[];
}

function RecentPatients({
  patients,
}: RecentPatientsProps) {
  const getStatusClass = (
    status: RecentPatient["status"]
  ) => {
    if (status === "Admitted") {
      return "bg-blue-500/10 text-blue-400";
    }

    if (status === "Outpatient") {
      return "bg-amber-500/10 text-amber-400";
    }

    return "bg-emerald-500/10 text-emerald-400";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px]">
        <thead>
          <tr className="border-y border-[var(--hms-border)] bg-[var(--hms-surface-secondary)]">
            <th className="px-6 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.15em] 
             text-[var(--hms-text-muted)]">
              Patient
            </th>
            <th className="px-4 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.15em]
             text-[var(--hms-text-muted)]">
              Department
            </th>

            <th className="px-4 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.15em]
             text-[var(--hms-text-muted)]">
              Doctor
            </th>

            <th className="px-4 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.15em]
             text-[var(--hms-text-muted)]">
              Status
            </th>

            <th className="px-4 py-3.5" />
          </tr>
        </thead>

        <tbody>
          {patients.map((patient) => (
            <tr
              key={patient.id}
              className=" border-b border-[var(--hms-border)] transition-colors last:border-0
               hover:bg-[var(--hms-surface-secondary)]"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-[10px] font-bold text-blue-500">
                    {patient.initials}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[var(--hms-text)]">
                      {patient.name}
                    </p>

                    <p className="mt-1 text-[9px] text-[var(--hms-text-muted)]">
                      {patient.patientId} • {patient.time}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-4 text-[11px] text-[var(--hms-text-secondary)]">
                {patient.department}
              </td>

              <td className="px-4 py-4 text-[11px] text-[var(--hms-text-secondary)]">
                {patient.doctor}
              </td>

              <td className="px-4 py-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-[9px] font-medium ${getStatusClass(
                    patient.status
                  )}`}
                >
                  {patient.status}
                </span>
              </td>

              <td className="px-4 py-4">
                <button className="rounded-lg p-2 text-[var(--hms-text-muted)] transition hover:bg-[var(--hms-surface-secondary)] hover:text-[var(--hms-text)]">
                  <MoreHorizontal size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RecentPatients;