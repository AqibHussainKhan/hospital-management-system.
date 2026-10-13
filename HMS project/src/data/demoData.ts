import { patientInitials } from "./activityModel";
import { addDays, isDate, pakistanDate } from "./dateModel";
import type { PatientRecord, WardRecord, LabRecord, MedicineRecord } from "./activityModel";
import type { DoctorRecord, SurgeryRecord } from "./departmentStore";
import type { AppointmentRecord, VisitRecord } from "./dashboardStore";
import type { StaffRecord, AttendanceRecord, BillRecord } from "./administrationModel";

export interface DemoCollections {
  patients: PatientRecord[];
  doctors: DoctorRecord[];
  appointments: AppointmentRecord[];
  visits: VisitRecord[];
  wards: WardRecord[];
  tests: LabRecord[];
  medicines: MedicineRecord[];
  surgeries: SurgeryRecord[];
  staff: StaffRecord[];
  attendance: AttendanceRecord[];
  billing: BillRecord[];
}

// Edit the sample records here, then use Settings > Restore Sample Records.
// Dates are relative to the first demo launch (or the latest explicit restore).
// These records never get inserted into the live Supabase database.
export function createDemoCollections(now = new Date()): DemoCollections {
  const today = pakistanDate(now);
  const date = (offset: number) => addDays(today, offset);
  const timestamp = (offset: number, time = "09:00") => new Date(`${date(offset)}T${time}:00+05:00`).toISOString();
  const dayStart = Date.parse(`${today}T00:00:00+05:00`);
  const recent = (minutes: number) => new Date(Math.max(dayStart, now.getTime() - minutes * 60_000)).toISOString();

  const doctors: DoctorRecord[] = [
    { id: "demo-doctor-1", name: "Dr. Ali Raza", specialty: "Consultant Cardiologist", department: "Cardiology", experience: "12 years", phone: "0300-0001001", status: "Active", photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=600&q=80" },
    { id: "demo-doctor-2", name: "Dr. Ayesha Malik", specialty: "Consultant Neurologist", department: "Neurology", experience: "10 years", phone: "0300-0001002", status: "Active", photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80" },
    { id: "demo-doctor-3", name: "Dr. Hamza Khan", specialty: "Orthopedic Surgeon", department: "Orthopedics", experience: "9 years", phone: "0300-0001003", status: "Active", photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80" },
    { id: "demo-doctor-4", name: "Dr. Sana Ali", specialty: "Gynecology Consultant", department: "Gynecology", experience: "11 years", phone: "0300-0001004", status: "Active", photo: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=600&q=80" },
    { id: "demo-doctor-5", name: "Dr. Hassan Rauf", specialty: "General Surgeon", department: "General Surgery", experience: "14 years", phone: "0300-0001005", status: "Active", photo: "" },
    { id: "demo-doctor-6", name: "Dr. Usman Tariq", specialty: "Eye Specialist", department: "Ophthalmology", experience: "8 years", phone: "0300-0001006", status: "Active", photo: "" },
    { id: "demo-doctor-7", name: "Dr. Hina Shah", specialty: "Pediatric Consultant", department: "Pediatrics", experience: "7 years", phone: "0300-0001007", status: "Active", photo: "" },
    { id: "demo-doctor-8", name: "Dr. Bilal Ahmed", specialty: "General Physician", department: "General", experience: "6 years", phone: "0300-0001008", status: "Inactive", photo: "" },
  ];
  const wards: WardRecord[] = [
    { id: "demo-ward-1", name: "General Ward A", capacity: 24, occupied: 8, status: "Available" },
    { id: "demo-ward-2", name: "Cardiac Care Unit", capacity: 12, occupied: 4, status: "Available" },
    { id: "demo-ward-3", name: "Orthopedic Ward", capacity: 18, occupied: 5, status: "Available" },
    { id: "demo-ward-4", name: "Maternity & Gynecology", capacity: 16, occupied: 3, status: "Available" },
    { id: "demo-ward-5", name: "Private Side Rooms", capacity: 8, occupied: 2, status: "Available" },
    { id: "demo-ward-6", name: "Ward B — Renovation", capacity: 10, occupied: 0, status: "Maintenance" },
  ];

  const people: { name: string; age: number; gender: string; doctor: number; status: PatientRecord["status"]; ward?: number }[] = [
    { name: "Muhammad Ahmad", age: 32, gender: "Male", doctor: 0, status: "Admitted", ward: 1 },
    { name: "Ayesha Khan", age: 28, gender: "Female", doctor: 1, status: "Outpatient" },
    { name: "Hamza Ali", age: 41, gender: "Male", doctor: 2, status: "Admitted", ward: 2 },
    { name: "Maryam Iqbal", age: 35, gender: "Female", doctor: 3, status: "Admitted", ward: 3 },
    { name: "Usman Khalid", age: 52, gender: "Male", doctor: 5, status: "Outpatient" },
    { name: "Sara Ahmed", age: 24, gender: "Female", doctor: 0, status: "Outpatient" },
    { name: "Bilal Hussain", age: 46, gender: "Male", doctor: 4, status: "Admitted", ward: 0 },
    { name: "Fatima Noor", age: 8, gender: "Female", doctor: 6, status: "Outpatient" },
    { name: "Ahmed Saeed", age: 61, gender: "Male", doctor: 0, status: "Admitted", ward: 4 },
    { name: "Zainab Aslam", age: 30, gender: "Female", doctor: 3, status: "Discharged" },
    { name: "Hassan Rafiq", age: 37, gender: "Male", doctor: 2, status: "Discharged" },
    { name: "Noor Fatima", age: 19, gender: "Female", doctor: 1, status: "Outpatient" },
  ];
  const patients: PatientRecord[] = people.map((person, i) => ({
    id: `demo-patient-${i + 1}`, patientId: `HMS-${10241 + i}`, name: person.name,
    age: person.age, gender: person.gender, phone: `0301-000${String(i + 1).padStart(4, "0")}`,
    department: doctors[person.doctor].department, doctor: doctors[person.doctor].name,
    doctorRef: doctors[person.doctor].id, status: person.status, initials: patientInitials(person.name),
    registeredAt: i < 4 ? recent((i + 1) * 35) : timestamp(-i),
    admittedAt: person.status === "Admitted" ? i < 4 ? recent((i + 1) * 20) : timestamp(-i, "10:00") : null,
    updatedAt: i < 4 ? recent((i + 1) * 20) : timestamp(-i, "10:00"),
    notes: "Sample patient record for the hospital demonstration. Edit these details from Patients.",
    ...(person.ward !== undefined ? { wardId: wards[person.ward].id } : {}),
  }));

  const schedule: { patient: number; offset: number; time: string; status: AppointmentRecord["status"] }[] = [
    { patient: 0, offset: 0, time: "09:00", status: "Completed" },
    { patient: 1, offset: 0, time: "09:30", status: "Waiting" },
    { patient: 2, offset: 0, time: "10:00", status: "Confirmed" },
    { patient: 3, offset: 0, time: "11:00", status: "Confirmed" },
    { patient: 4, offset: 0, time: "12:00", status: "Waiting" },
    { patient: 5, offset: 0, time: "14:00", status: "Confirmed" },
    { patient: 7, offset: 1, time: "09:30", status: "Confirmed" },
    { patient: 8, offset: 1, time: "11:00", status: "Confirmed" },
    { patient: 6, offset: -1, time: "10:00", status: "Completed" },
    { patient: 9, offset: -2, time: "11:30", status: "Completed" },
    { patient: 10, offset: -3, time: "14:00", status: "Cancelled" },
    { patient: 11, offset: 2, time: "10:30", status: "Confirmed" },
  ];
  const appointments: AppointmentRecord[] = schedule.map((item, i) => {
    const patient = patients[item.patient];
    return { id: `demo-appointment-${i + 1}`, appointmentId: `APT-${1001 + i}`, patient: patient.name,
      patientRef: patient.id, doctor: patient.doctor, doctorRef: patient.doctorRef, department: patient.department,
      date: date(item.offset), time: item.time, duration: 30, status: item.status, initials: patient.initials };
  });
  // Thirty days of actual editable visit rows drive both charts and exports.
  const visitCounts = [4, 6, 5, 7, 8, 4, 6, 5, 7, 6, 8, 5, 7, 6, 8, 9, 7, 10, 8, 6, 9, 10, 8, 11, 9, 12, 10, 13, 11, 8];
  const visits: VisitRecord[] = visitCounts.flatMap((count, day) => Array.from({ length: count }, (_, i) => {
    const patient = patients[(day + i) % patients.length];
    return { id: `demo-visit-${day + 1}-${i + 1}`, patient: patient.name, patientRef: patient.id, date: date(day - 29) };
  }));

  const testNames = ["Complete Blood Count", "Lipid Profile", "Liver Function Test", "Thyroid Profile", "Blood Glucose", "Renal Function Test", "Urinalysis", "Electrolyte Panel", "HbA1c", "Coagulation Profile"];
  const testStates: LabRecord["status"][] = ["Completed", "Pending", "In Progress", "Completed", "Pending", "Completed", "In Progress", "Pending", "Completed", "Cancelled"];
  const tests: LabRecord[] = testNames.map((test, i) => ({
    id: `demo-test-${i + 1}`, patient: patients[i].name, patientRef: patients[i].id,
    test, status: testStates[i], urgent: i === 1 || i === 2,
    requestedAt: i < 4 ? recent((i + 1) * 50) : timestamp(-1),
  }));
  const medicines: MedicineRecord[] = [
    { id: "demo-medicine-1", name: "Paracetamol 500mg", quantity: 250, reorderLevel: 50, batch: "DEMO-PAR-01", expiry: date(240) },
    { id: "demo-medicine-2", name: "Amoxicillin 500mg", quantity: 18, reorderLevel: 30, batch: "DEMO-AMX-02", expiry: date(180) },
    { id: "demo-medicine-3", name: "Saline 0.9% 500ml", quantity: 85, reorderLevel: 25, batch: "DEMO-SAL-03", expiry: date(300) },
    { id: "demo-medicine-4", name: "Insulin — Sample Batch", quantity: 0, reorderLevel: 15, batch: "DEMO-INS-04", expiry: date(120) },
    { id: "demo-medicine-5", name: "Omeprazole 20mg", quantity: 120, reorderLevel: 30, batch: "DEMO-OMP-05", expiry: date(365) },
    { id: "demo-medicine-6", name: "Cetirizine 10mg", quantity: 70, reorderLevel: 20, batch: "DEMO-CET-06", expiry: date(210) },
    { id: "demo-medicine-7", name: "ORS Sachets", quantity: 14, reorderLevel: 20, batch: "DEMO-ORS-07", expiry: date(160) },
    { id: "demo-medicine-8", name: "Vitamin D — Expired Sample", quantity: 32, reorderLevel: 10, batch: "DEMO-VIT-08", expiry: date(-5) },
    { id: "demo-medicine-9", name: "Surgical Gloves (Boxes)", quantity: 55, reorderLevel: 15, batch: "DEMO-GLV-09", expiry: date(450) },
    { id: "demo-medicine-10", name: "Sterile Gauze (Packs)", quantity: 110, reorderLevel: 25, batch: "DEMO-GAZ-10", expiry: date(400) },
  ];
  const procedureRows: { patient: number; doctor: number; procedure: string; theater: string; offset: number; time: string; duration: number; status: SurgeryRecord["status"] }[] = [
    { patient: 6, doctor: 4, procedure: "Appendectomy — Demo", theater: "OT-01", offset: 0, time: "09:00", duration: 60, status: "Completed" },
    { patient: 2, doctor: 2, procedure: "Knee Arthroscopy — Demo", theater: "OT-02", offset: 0, time: "12:00", duration: 90, status: "In Progress" },
    { patient: 3, doctor: 3, procedure: "Gynecology Procedure — Demo", theater: "OT-01", offset: 0, time: "14:00", duration: 60, status: "Scheduled" },
    { patient: 4, doctor: 5, procedure: "Cataract Procedure — Demo", theater: "OT-03", offset: 1, time: "10:00", duration: 45, status: "Scheduled" },
    { patient: 10, doctor: 2, procedure: "Fracture Fixation — Demo", theater: "OT-02", offset: -2, time: "11:00", duration: 120, status: "Completed" },
    { patient: 6, doctor: 4, procedure: "Follow-up Procedure — Demo", theater: "OT-01", offset: 2, time: "15:00", duration: 45, status: "Cancelled" },
  ];
  const surgeries: SurgeryRecord[] = procedureRows.map((row, i) => ({
    id: `demo-surgery-${i + 1}`, patient: patients[row.patient].name, patientRef: patients[row.patient].id,
    surgeon: doctors[row.doctor].name, doctorRef: doctors[row.doctor].id, procedure: row.procedure,
    theater: row.theater, date: date(row.offset), time: row.time, duration: row.duration, status: row.status,
  }));

  const staffRows = [
    ["Sadia Anwar", "Cardiology", "Head Nurse"], ["Ali Hassan", "Emergency", "Duty Nurse"],
    ["Hina Aslam", "Laboratory", "Lab Technician"], ["Faisal Mahmood", "Pharmacy", "Pharmacist"],
    ["Nadia Iqbal", "Gynecology", "Staff Nurse"], ["Bilal Shah", "Administration", "Receptionist"],
    ["Amina Noor", "Billing", "Accounts Officer"], ["Asad Raza", "Operation Theater", "OT Technician"],
    ["Maryam Saeed", "Pediatrics", "Staff Nurse"], ["Usman Ahmed", "Wards", "Ward Assistant"],
    ["Zeeshan Ali", "Maintenance", "Maintenance Officer"], ["Farah Khan", "Administration", "Records Officer"],
  ];
  const staff: StaffRecord[] = staffRows.map(([name, department, role], i) => ({
    id: `demo-staff-${i + 1}`, name, department, role, phone: `0302-000${String(i + 1).padStart(4, "0")}`,
    status: i < 10 ? "Active" : "Inactive",
  }));
  const attendance: AttendanceRecord[] = Array.from({ length: 14 }, (_, day) => staff.slice(0, 10).map((person, i) => {
    const status: AttendanceRecord["status"] = i === (day + 7) % 10 ? "Absent" : i === (day + 8) % 10 ? "Leave" : "Present";
    return { id: `demo-attendance-${day + 1}-${i + 1}`, staffId: person.id, name: person.name, date: date(day - 13),
      status, checkIn: status === "Present" ? i % 2 ? "08:15" : "08:00" : "",
      checkOut: status === "Present" && day < 13 ? "16:00" : "", nextDay: false };
  })).flat();

  const charges = [12500, 3500, 48000, 22000, 6000, 4500, 65000, 2800, 18000, 8500];
  const paidAmounts = [7500, 3500, 20000, 0, 6000, 1500, 30000, 2800, 0, 8500];
  const services = ["Cardiology consultation & tests", "Neurology consultation", "Orthopedic procedure", "Maternity ward charges", "Eye consultation & tests", "Outpatient consultation", "Surgery & ward charges", "Pediatric consultation", "Private room charges", "Follow-up & discharge charges"];
  const billing: BillRecord[] = charges.map((amount, i) => ({
    id: `demo-invoice-${i + 1}`, patient: patients[i].name, patientId: patients[i].patientId,
    service: services[i], date: date(i < 6 ? 0 : -(i - 5)), amount, paid: paidAmounts[i], openingPaid: 0,
    payments: paidAmounts[i] ? [{ id: `demo-receipt-${i + 1}`, amount: paidAmounts[i] * 100,
      receivedAt: i < 6 ? recent((i + 1) * 8) : timestamp(-(i - 5), "12:00"), reference: `DEMO-RECEIPT-${String(i + 1).padStart(3, "0")}` }] : [],
  }));
  return { patients, doctors, appointments, visits, wards, tests, medicines, surgeries, staff, attendance, billing };
}

export const demoCollectionKey = (account: string, name: string) => `medicore.hms.demo.v1.${account}.${name}`;
export const demoAnchorKey = (account: string) => `medicore.hms.demo.v1.${account}.anchor`;
export const demoNotificationKey = (account: string) => `medicore.demo.notifications.v1:${encodeURIComponent(account.trim().toLowerCase())}`;
export const demoProfileKey = (account: string) => `medicore.demo.profile.v1:${account.toLowerCase()}`;

export function initialDemoRecords(account: string, name: string) {
  const raw = localStorage.getItem(demoAnchorKey(account));
  const now = raw === null ? new Date() : new Date(raw);
  if (!Number.isFinite(now.getTime()) || !isDate(pakistanDate(now))) throw new Error("Saved demo dates are invalid. Restore sample records from Settings.");
  const rows = createDemoCollections(now)[name as keyof DemoCollections];
  if (!rows) throw new Error("Unknown demo collection.");
  if (raw === null) localStorage.setItem(demoAnchorKey(account), now.toISOString());
  return rows;
}

export function restoreDemoCollections(account: string, notificationAccount: string) {
  const now = new Date();
  const entries = Object.entries(createDemoCollections(now)).map(([name, records]) => {
    const key = demoCollectionKey(account, name);
    let revision = 0;
    try { const saved = JSON.parse(localStorage.getItem(key) || "null"); if (Number.isSafeInteger(saved?.revision) && saved.revision >= 0) revision = saved.revision + 1; } catch { /* An explicit restore can repair corrupt demo data. */ }
    return [key, JSON.stringify({ revision, records })];
  });
  entries.push([demoAnchorKey(account), now.toISOString()]);
  const notificationKey = demoNotificationKey(notificationAccount);
  const prior = [...entries.map(([key]) => key), notificationKey].map(key => [key, localStorage.getItem(key)] as const);
  try {
    for (const [key, value] of entries) localStorage.setItem(key, value);
    localStorage.removeItem(notificationKey);
  } catch (error) {
    for (const [key, value] of prior) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
    throw error;
  }
}
