import { getRecordStore } from "./recordStore";
import {
  validPatient,
  validWard,
  validLab,
  validMedicine,
} from "./activityModel";
import { validAppointment, validVisit } from "./dashboardStore";
import { validDoctor, validSurgery } from "./departmentStore";
import { validStaff, validAttendance, validBill } from "./administrationModel";
export interface ModuleRow {
  id: string;
  [key: string]: unknown;
}
export interface ModuleDefinition {
  title: string;
  collection: string;
  key: string;
  columns: string[];
  fields: string[];
}
export const moduleDefinitions: Record<string, ModuleDefinition> = {
  patients: {
    title: "Patients",
    collection: "patients",
    key: "medicore.patients.v1",
    columns: ["patientId", "name", "department", "doctor", "status"],
    fields: [
      "patientId",
      "name",
      "age",
      "gender",
      "phone",
      "doctorRef",
      "status",
      "wardId",
    ],
  },
  doctors: {
    title: "Doctors",
    collection: "doctors",
    key: "medicore.doctors.v1",
    columns: ["name", "specialty", "department", "phone", "status"],
    fields: [
      "name",
      "specialty",
      "department",
      "experience",
      "phone",
      "status",
    ],
  },
  appointments: {
    title: "Appointments",
    collection: "appointments",
    key: "medicore.appointments.v1",
    columns: ["appointmentId", "patient", "doctor", "date", "time", "status"],
    fields: ["patientRef", "doctorRef", "date", "time", "duration", "status"],
  },
  laboratory: {
    title: "Laboratory",
    collection: "tests",
    key: "medicore.operations.tests.v1",
    columns: ["patient", "test", "sampleStatus", "status"],
    fields: [
      "patientRef",
      "test",
      "urgent",
      "sampleStatus",
      "status",
      "result",
    ],
  },
  pharmacy: {
    title: "Pharmacy Inventory",
    collection: "medicines",
    key: "medicore.operations.medicines.v1",
    columns: ["name", "batch", "expiry", "quantity", "reorderLevel"],
    fields: ["name", "batch", "expiry", "quantity", "reorderLevel"],
  },
  wards: {
    title: "Wards & Beds",
    collection: "wards",
    key: "medicore.operations.wards.v1",
    columns: ["name", "capacity", "occupied", "status"],
    fields: ["name", "capacity", "occupied", "status"],
  },
  "operation-theater": {
    title: "Operation Theater",
    collection: "surgeries",
    key: "medicore.surgeries.v1",
    columns: [
      "patient",
      "surgeon",
      "procedure",
      "theater",
      "date",
      "time",
      "status",
    ],
    fields: [
      "patientRef",
      "doctorRef",
      "procedure",
      "theater",
      "date",
      "time",
      "duration",
      "status",
      "team",
    ],
  },
  staff: {
    title: "Staff Directory",
    collection: "staff",
    key: "medicore.admin.staff.v1",
    columns: ["name", "department", "role", "phone", "status"],
    fields: ["name", "department", "role", "phone", "status"],
  },
  attendance: {
    title: "Staff Attendance",
    collection: "attendance",
    key: "medicore.admin.attendance.v1",
    columns: ["name", "date", "checkIn", "checkOut", "status"],
    fields: ["staffId", "date", "status", "checkIn", "checkOut", "nextDay"],
  },
  billing: {
    title: "Billing & Payments",
    collection: "billing",
    key: "medicore.admin.billing.v1",
    columns: ["patient", "service", "date", "amount", "paid", "status"],
    fields: ["patientId", "service", "date", "amount"],
  },
};
const validators: Record<string, (value: unknown) => boolean> = {
  patients: validPatient,
  doctors: validDoctor,
  appointments: validAppointment,
  tests: validLab,
  medicines: validMedicine,
  wards: validWard,
  surgeries: validSurgery,
  staff: validStaff,
  attendance: validAttendance,
  billing: validBill,
  visits: validVisit,
};
export function moduleStore(module: string) {
  const definition = moduleDefinitions[module];
  if (!definition) throw new Error("Unknown hospital module.");
  return getRecordStore<ModuleRow>(
    definition.key,
    (value: unknown): value is ModuleRow =>
      validators[definition.collection](value),
  );
}
export const fieldLabels: Record<string, string> = {
  patientId: "Patient ID",
  patientRef: "Patient",
  doctorRef: "Doctor / surgeon",
  wardId: "Ward",
  staffId: "Staff member",
  name: "Name",
  age: "Age",
  gender: "Gender",
  phone: "Phone",
  department: "Department",
  role: "Designation",
  experience: "Experience",
  specialty: "Specialty",
  status: "Status",
  date: "Date",
  time: "Time",
  duration: "Duration (minutes)",
  test: "Test name",
  urgent: "Urgent request",
  sampleStatus: "Sample status",
  result: "Laboratory result",
  batch: "Batch",
  expiry: "Expiry date",
  quantity: "Stock quantity",
  reorderLevel: "Reorder level",
  capacity: "Bed capacity",
  occupied: "Occupied beds",
  procedure: "Procedure",
  theater: "Theater",
  team: "Surgical team / coordination notes",
  checkIn: "Check-in",
  checkOut: "Check-out",
  nextDay: "Check-out the next day",
  service: "Service",
  amount: "Invoice amount (PKR)",
  appointmentId: "Appointment ID",
  patient: "Patient",
  doctor: "Doctor",
  surgeon: "Surgeon",
  paid: "Paid (PKR)",
};
