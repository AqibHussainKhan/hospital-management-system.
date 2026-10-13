import { useEffect, useState } from "react";
import { getRecordStore, useRecordStore } from "./recordStore";
import { isDate, pakistanDate, timeMinutes, addDays } from "./dateModel";

export { isDate, pakistanDate, timeMinutes, addDays, dateLabel } from "./dateModel";

export interface AppointmentRecord {
  id: string;
  appointmentId: string;
  patient: string;
  patientRef?: string;
  doctor: string;
  doctorRef?: string;
  department: string;
  date: string;
  time: string;
  duration?: number;
  status: "Confirmed" | "Waiting" | "Completed" | "Cancelled";
  initials: string
}

export interface VisitRecord {
  id: string;
  patient: string;
  patientRef?: string;
  date: string
}

export const appointmentKey = "medicore.appointments.v1";
export const visitKey = "medicore.patient-visits.v1";

export function validAppointment(value: unknown): value is AppointmentRecord {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;

  return ["id", "appointmentId", "patient", "doctor", "department", "initials"].every(
    k => typeof v[k] === "string" && !!String(v[k]).trim()
  ) &&
    typeof v.time === "string" &&
    Number.isFinite(timeMinutes(v.time)) &&
    isDate(v.date) &&
    ["Confirmed", "Waiting", "Completed", "Cancelled"].includes(String(v.status)) &&
    (v.duration === undefined ||
      Number.isInteger(v.duration) &&
        Number(v.duration) >= 5 &&
        Number(v.duration) <= 240) &&
    [v.patientRef, v.doctorRef].every(
      ref => ref === undefined || typeof ref === "string"
    );
}

export function validVisit(value: unknown): value is VisitRecord {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;

  return typeof v.id === "string" &&
    !!v.id &&
    typeof v.patient === "string" &&
    !!v.patient.trim() &&
    isDate(v.date) &&
    (v.patientRef === undefined || typeof v.patientRef === "string");
}

export function checkAppointments(rows: AppointmentRecord[]) {
  if (new Set(rows.map(r => r.appointmentId.toUpperCase())).size !== rows.length)
    throw new Error("Appointment IDs must be unique.");

  if (rows.some(r => timeMinutes(r.time) + (r.duration || 30) > 1440))
    throw new Error("Appointments must finish on the same date.");

  const active = rows.filter(r => r.status !== "Cancelled");

  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i],
        b = active[j];

      const sameDoctor = a.doctorRef && b.doctorRef
        ? a.doctorRef === b.doctorRef
        : a.doctor.toLowerCase() === b.doctor.toLowerCase();

      const samePatient = a.patientRef && b.patientRef
        ? a.patientRef === b.patientRef
        : a.patient.toLowerCase() === b.patient.toLowerCase();

      if (
        a.date === b.date &&
        (sameDoctor || samePatient) &&
        timeMinutes(a.time) < timeMinutes(b.time) + (b.duration || 30) &&
        timeMinutes(b.time) < timeMinutes(a.time) + (a.duration || 30)
      )
        throw new Error(
          "This doctor or patient already has an overlapping appointment. Choose another time."
        );
    }
}

export const appointmentStore = getRecordStore(
  appointmentKey,
  validAppointment,
  checkAppointments
);

export const visitStore = getRecordStore(visitKey, validVisit);

export const useAppointments = () => useRecordStore(appointmentStore);
export const useVisits = () => useRecordStore(visitStore);

export function useToday() {
  const [today, setToday] = useState(pakistanDate);

  useEffect(() => {
    const tick = () => setToday(pakistanDate());
    const timer = window.setInterval(tick, 30000);

    window.addEventListener("focus", tick);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);

  return today;
}

export function dailyVisits(
  records: VisitRecord[],
  today: string,
  days: number
) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);

    return {
      date,
      count: records.filter(v => v.date === date).length
    };
  });
}