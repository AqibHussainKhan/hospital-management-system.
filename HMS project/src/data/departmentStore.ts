import { getRecordStore, useRecordStore } from "./recordStore";
import { isObject, isText } from "./activityModel";
import { isDate, timeMinutes } from "./dateModel";

export interface DoctorRecord {
  id: string;
  name: string;
  specialty: string;
  department: string;
  experience: string;
  phone: string;
  status: "Active" | "Inactive";
  photo: string
}

export interface SurgeryRecord {
  id: string;
  patient: string;
  patientRef?: string;
  surgeon: string;
  doctorRef?: string;
  procedure: string;
  theater: string;
  date: string;
  time: string;
  duration: number;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled"
}

const required = (v: unknown) => isText(v) && !!v.trim();

export function validDoctor(v: unknown): v is DoctorRecord {
  if (
    !isObject(v) ||
    ![v.id, v.name, v.specialty, v.department].every(required) ||
    ![v.experience, v.phone, v.photo].every(isText) ||
    !["Active", "Inactive"].includes(String(v.status))
  ) return false;

  try {
    return !v.photo || new URL(String(v.photo)).protocol === "https:";
  } catch {
    return false;
  }
}

export function validSurgery(v: unknown): v is SurgeryRecord {
  return isObject(v) &&
    [v.id, v.patient, v.surgeon, v.procedure, v.theater].every(required) &&
    isDate(v.date) &&
    typeof v.time === "string" &&
    Number.isFinite(timeMinutes(v.time)) &&
    Number.isInteger(v.duration) &&
    Number(v.duration) >= 5 &&
    Number(v.duration) <= 1440 &&
    timeMinutes(v.time) + Number(v.duration) <= 1440 &&
    ["Scheduled", "In Progress", "Completed", "Cancelled"].includes(
      String(v.status)
    );
}

export function checkSurgeries(rows: SurgeryRecord[]) {
  const active = rows.filter(r => r.status !== "Cancelled");

  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i],
        b = active[j];

      if (
        a.date === b.date &&
        (
          a.theater.toLowerCase() === b.theater.toLowerCase() ||
          (a.doctorRef || a.surgeon.toLowerCase()) ===
            (b.doctorRef || b.surgeon.toLowerCase()) ||
          (a.patientRef || a.patient.toLowerCase()) ===
            (b.patientRef || b.patient.toLowerCase())
        ) &&
        timeMinutes(a.time) < timeMinutes(b.time) + b.duration &&
        timeMinutes(b.time) < timeMinutes(a.time) + a.duration
      )
        throw new Error(
          "This theater, surgeon or patient has an overlapping procedure."
        );
    }
}

export const doctorStore = getRecordStore("medicore.doctors.v1", validDoctor);

export const surgeryStore = getRecordStore(
  "medicore.surgeries.v1",
  validSurgery,
  checkSurgeries
);

export const useDoctors = () => useRecordStore(doctorStore);
export const useSurgeries = () => useRecordStore(surgeryStore);