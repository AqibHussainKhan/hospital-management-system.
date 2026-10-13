import { useDoctors } from "../../data/departmentStore";
import { useAppointments, useToday } from "../../data/dashboardStore";
import { useRecords, keys } from "../../components/administration/shared";
import type { AttendanceRecord } from "../../data/administrationModel";
import HospitalOperations from "../../components/dashboard/HospitalOperations";
import RecentPatientsSection from "../../components/dashboard/RecentPatientsSection";
import { occupancy } from "../../data/activityModel";
import { usePatients, useWards, useLabTests } from "../../data/activityStore";
import DashboardInsights from "../../components/dashboard/DashboardInsights";
import type { User } from "../../App";
import { type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BedDouble,
  CalendarDays,
  CircleCheck,
  FlaskConical,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import DashboardFooter from "../../components/layout/DashboardFooter";
import HeroCarousel from "../../components/dashboard/HeroCarousel";
import DoctorsSection from "../../components/dashboard/DoctorsSection";
import HospitalNews from "../../components/dashboard/HospitalNews";
import { lazy, Suspense } from "react";
const HospitalMap = lazy(() => import("../../components/maps/HospitalMap"));
interface DashboardProps {
  user?: User;
  onLogout: () => void;
}
function Dashboard({
  onLogout,
}: DashboardProps) {
  const patients = usePatients();
  const wards = useWards();
  const doctors = useDoctors(); const appointments = useAppointments(); const labs = useLabTests();
  const attendance = useRecords<AttendanceRecord>(keys.attendance); const today = useToday();
  const activeDoctors = doctors.records.filter(d => d.status === "Active");
  const todayAppointments = appointments.records.filter(a => a.date === today);
  const todayAttendance = attendance.records.filter(a => a.date === today);
  const presentCount = todayAttendance.filter(a => a.status === "Present").length;
  const beds = occupancy(wards.records, patients.records);
  return (
    <Layout
      activePage="/dashboard"
      title="Dashboard"
      subtitle="Hospital overview and daily operations"
      onLogout={onLogout}
    >
      <div id="dashboard-overview" tabIndex={-1} className="relative mx-auto w-full min-w-0 max-w-[1600px] space-y-8 overflow-x-hidden focus:outline-none">
        {/* =========================
                HERO CAROUSEL
          ========================== */}
           <HeroCarousel />
        {/* =========================
            PRIMARY STATS
        ========================== */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <PremiumStat
            delay={0}
            icon={<Users size={20} />}
            label="Total Patients"
            value={patients.loading || patients.error ? "—" : String(patients.records.length)}
            detail={patients.error ? "Records unavailable" : `${patients.records.filter((patient) => patient.status === "Admitted").length} admitted · ${patients.records.filter((patient) => patient.status === "Outpatient").length} outpatient`}
            trend="Registered"
          />
          <PremiumStat
            delay={0.06}
            icon={
              <UserRound size={20} />
            }
            label="Active Doctors"
            value={doctors.loading || doctors.error ? "—" : String(activeDoctors.length)}
            detail={`${new Set(activeDoctors.map(d => d.department)).size} departments`}
            trend="Directory"
          />
          <PremiumStat
            delay={0.12}
            icon={
              <CalendarDays size={20} />
            }
            label="Appointments"
            value={appointments.loading || appointments.error ? "—" : String(todayAppointments.length)}
            detail={`${todayAppointments.filter(a => a.status === "Waiting").length} waiting today`}
            trend="Today"
          />
          <PremiumStat
            delay={0.18}
            icon={
              <BedDouble size={20} />
            }
            label="Available Beds"
            value={wards.error || !beds.capacity ? "—" : String(beds.available)}
            detail={beds.capacity ? `${beds.capacity} total capacity` : "Add ward capacity in Operations"}
            trend={beds.capacity ? `${(beds.available / beds.capacity * 100).toFixed(1)}%` : "Not configured"}
          />
        </section>
         {/* =========================
                FEATURED DOCTORS
         ========================== */}
            <DoctorsSection />
        {/* =========================
            ANALYTICS
        ========================== */}
        <DashboardInsights />
       {/* =========================
                 HOSPITAL NEWS
          ========================== */}
            <HospitalNews />
        {/* Shared operations and patient records */}
        <HospitalOperations />
        <RecentPatientsSection />
        {/* =========================
            BOTTOM SUMMARY
        ========================== */}
        <section className="grid gap-5 md:grid-cols-3">
          <MiniSummary
            icon={
              <CircleCheck size={18} />
            }
            title="Staff Attendance"
            value={attendance.error || attendance.loading ? "—" : `${presentCount} Present`}
            detail={todayAttendance.length ? `${(presentCount / todayAttendance.length * 100).toFixed(1)}% of marked attendance today` : "No marked attendance today"}
          />
          <MiniSummary
            icon={
              <FlaskConical size={18} />
            }
            title="Lab Reports"
            value={labs.error || labs.loading ? "—" : `${labs.records.filter(t => t.status === "Completed").length} Ready`}
            detail={`${labs.records.filter(t => t.urgent && t.status !== "Completed" && t.status !== "Cancelled").length} urgent open requests`}
          />
          <MiniSummary
            icon={
              <Stethoscope size={18} />
            }
            title="Active Doctors"
            value={doctors.error || doctors.loading ? "—" : `${activeDoctors.length} Active`}
            detail="From the current doctor directory"
          />
        </section>
        {/* =========================
            HOSPITAL LOCATION MAP
          ========================== */}
               <Suspense fallback={<p className="text-sm text-[var(--hms-text-muted)]">Loading hospital location…</p>}><HospitalMap /></Suspense>
        <DashboardFooter />
      </div>
    </Layout>
  );
}
/* =====================================================
   COMPONENTS
===================================================== */
function PremiumStat({
  icon,
  label,
  value,
  detail,
  trend,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  trend: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.5,
        delay,
      }}
      whileHover={{
        y: -4,
      }}
      className="hms-card group relative overflow-hidden rounded-[24px] p-6 transition-all duration-300"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-blue-500/[0.06] blur-2xl transition group-hover:bg-blue-500/[0.11]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-blue-500/[0.12] bg-blue-500/[0.07] text-blue-400">
            {icon}
          </div>
          <span className="rounded-full bg-emerald-500/[0.07] px-2 py-1 text-[8px] font-semibold text-emerald-400">
            {trend}
          </span>
        </div>
        <p className="mt-6 text-[10px] font-medium text-[var(--hms-text-secondary)]">
          {label}
        </p>
        <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-[var(--hms-text)]">
          {value}
        </p>
        <p className="mt-2 text-[9px] text-[var(--hms-text-muted)]">
          {detail}
        </p>
      </div>
    </motion.div>
  );
}
function MiniSummary({
  icon,
  title,
  value,
  detail,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      className="
  hms-card
  flex items-center gap-4
  rounded-[20px]
  p-5
  transition-all duration-300
"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/[0.07] text-blue-400">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-medium text-[var(--hms-text-secondary)]">
          {title}
        </p>
        <p className="mt-1 text-[13px] font-semibold text-[var(--hms-text)]">
          {value}
        </p>
        <p className="mt-1 text-[8px] text-[var(--hms-text-muted)]">
          {detail}
        </p>
      </div>
    </motion.div>
  );
}
export default Dashboard;
