import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";

import { useDoctors } from "../../data/departmentStore";

import DoctorShareButton from "../doctors/DoctorShareButton";

export default function DoctorsSection() {
  const doctors = useDoctors();

  return (
    <section>
      <header className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--hms-text)]">
          <Stethoscope size={18} className="text-blue-500" />
          Medical Team
        </h2>

        <Link to="/doctors" className="text-sm text-blue-500">
          View Directory ↗
        </Link>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {doctors.records
          .filter(d => d.status === "Active")
          .slice(0, 4)
          .map((d, i) => (
            <motion.article
              key={d.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="hms-card rounded-[24px] p-5"
            >
              {d.photo && (
                <img
                  loading="lazy"
                  src={d.photo}
                  alt={d.name}
                  className="mb-4 h-40 w-full rounded-2xl object-cover"
                />
              )}

              <h3 className="font-semibold text-[var(--hms-text)]">
                {d.name}
              </h3>

              <p className="mt-2 text-sm text-[var(--hms-text-muted)]">
                {d.specialty}
              </p>

              <p className="mt-1 text-xs text-[var(--hms-text-muted)]">
                {d.department} · {d.experience || "Experience not recorded"}
              </p>

              <div className="mt-5 flex items-center justify-between">
                <Link
                  to={`/doctors?entity=${encodeURIComponent(d.id)}`}
                  className="text-sm text-blue-500"
                >
                  View Doctor
                </Link>

                <DoctorShareButton doctor={d} />
              </div>
            </motion.article>
          ))}
      </div>

      {doctors.error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {doctors.error}
        </p>
      )}

      {!doctors.loading && !doctors.records.length && (
        <p className="hms-card rounded-2xl p-5 text-sm text-[var(--hms-text-muted)]">
          Add doctors in the directory to display your medical team.
        </p>
      )}
    </section>
  );
}