import { createDemoCollections } from "./demoData";
import { addDays, pakistanDate } from "./dateModel";
import { patientInitials } from "./activityModel";
import type { DemoCollections } from "./demoData";
import type { WorkKind } from "./workModel";

export interface SampleWork {
  kind: WorkKind;
  patientId: string | null;
  staffId: string | null;
  status: string;
  data: Record<string, unknown>;
}
export interface SharedSamples {
  batchId: string;
  collections: DemoCollections;
  work: SampleWork[];
}

// Samples are added once to shared storage. They never replace saved records.
export function createSharedSamples(
  batchId: string,
  now = new Date(),
): SharedSamples {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      batchId,
    )
  ) {
    throw new Error("A valid sample batch is required.");
  }
  batchId = batchId.toLowerCase();
  const base = createDemoCollections(now);
  const tag = batchId.slice(0, 8).toUpperCase();
  const date = (offset: number) => addDays(pakistanDate(now), offset);
  const patientIds = new Map(
    base.patients.map((p, index) => [p.patientId, `SMP-${tag}-${index + 1}`]),
  );
  for (const rows of [
    base.patients,
    base.doctors,
    base.wards,
    base.medicines,
    base.staff,
  ]) {
    for (const row of rows) row.name += " (Sample)";
  }
  for (const patient of base.patients) {
    patient.patientId = patientIds.get(patient.patientId)!;
    patient.initials = patientInitials(patient.name);
    patient.doctor = base.doctors.find((d) => d.id === patient.doctorRef)!.name;
  }
  for (const bill of base.billing) {
    bill.patientId = patientIds.get(bill.patientId)!;
    bill.patient = base.patients.find(
      (p) => p.patientId === bill.patientId,
    )!.name;
    bill.service += " — Sample";
  }
  for (const [index, appointment] of base.appointments.entries()) {
    appointment.appointmentId = `SMP-APT-${tag}-${index + 1}`;
    appointment.patient = base.patients.find(
      (p) => p.id === appointment.patientRef,
    )!.name;
    appointment.doctor = base.doctors.find(
      (d) => d.id === appointment.doctorRef,
    )!.name;
    appointment.initials = patientInitials(appointment.patient);
  }
  for (const rows of [base.tests, base.visits, base.surgeries]) {
    for (const row of rows)
      row.patient = base.patients.find((p) => p.id === row.patientRef)!.name;
  }
  for (const surgery of base.surgeries) {
    surgery.surgeon = base.doctors.find(
      (d) => d.id === surgery.doctorRef,
    )!.name;
    Object.assign(surgery, { team: "Sample surgical team" });
  }
  for (const test of base.tests) {
    test.sampleStatus =
      test.status === "Pending"
        ? "Pending"
        : test.status === "Cancelled"
          ? "Rejected"
          : "Received";
    if (test.status === "Completed") {
      test.result =
        "Illustrative laboratory entry. Replace with an actual verified result when using real records.";
      test.completedAt = now.toISOString();
    }
  }
  for (const attendance of base.attendance) {
    attendance.name = base.staff.find((s) => s.id === attendance.staffId)!.name;
  }
  const extraStaff = [
    ...base.doctors
      .filter((d) => d.status === "Active")
      .map((d, index) => ({
        id: `demo-doctor-staff-${index + 1}`,
        name: d.name,
        department: d.department,
        role: "Doctor",
        phone: "",
        status: "Active" as const,
      })),
    {
      id: "demo-hr-staff",
      name: "Areeba Siddiq (Sample)",
      department: "Human Resources",
      role: "HR Officer",
      phone: "",
      status: "Active" as const,
    },
    {
      id: "demo-ward-lead",
      name: "Noman Aslam (Sample)",
      department: "Cardiology",
      role: "Ward In-charge",
      phone: "",
      status: "Active" as const,
    },
    {
      id: "demo-department-head",
      name: "Dr. Farooq Ahmed (Sample)",
      department: "Cardiology",
      role: "Department Head",
      phone: "",
      status: "Active" as const,
    },
    {
      id: "demo-support-staff",
      name: "Imran Akhtar (Sample)",
      department: "Support",
      role: "Support Staff",
      phone: "",
      status: "Active" as const,
    },
  ];
  base.staff.push(...extraStaff);
  for (const person of extraStaff) {
    for (const day of [-2, -1, 0])
      base.attendance.push({
        id: `demo-extra-attendance-${person.id}-${day + 2}`,
        staffId: person.id,
        name: person.name,
        date: date(day),
        status: "Present",
        checkIn: "09:00",
        checkOut: day < 0 ? "17:00" : "",
        nextDay: false,
      });
  }
  // Reviewed sample leave history is consistent with any matching attendance rows.
  const reviewedLeave = base.staff
    .filter((person) => person.status === "Active")
    .map((person, index) => ({
      staffId: person.id,
      status: index === 1 ? "Rejected" : "Approved",
      from: date(index === 0 ? -3 : -3 - (index % 5)),
      to: date(index === 0 ? -2 : -3 - (index % 5)),
    }));
  for (const leave of reviewedLeave.filter(
    (row) => row.status === "Approved",
  )) {
    for (const attendance of base.attendance) {
      if (
        attendance.staffId === leave.staffId &&
        attendance.date >= leave.from &&
        attendance.date <= leave.to
      ) {
        Object.assign(attendance, {
          status: "Leave",
          checkIn: "",
          checkOut: "",
          nextDay: false,
        });
      }
    }
  }
  const collections = JSON.parse(
    JSON.stringify(base, (_key, value: unknown) =>
      typeof value === "string" && value.startsWith("demo-")
        ? `sample-${batchId}-${value}`
        : value,
    ),
  ) as DemoCollections;
  const work: SampleWork[] = [];
  const add = (
    kind: WorkKind,
    status: string,
    patientId: string | null,
    staffId: string | null,
    data: Record<string, unknown>,
  ) => {
    work.push({ kind, status, patientId, staffId, data });
  };
  for (const patient of collections.patients.filter(
    (p) => p.status === "Admitted",
  )) {
    add("clinical", "Final", patient.id, null, {
      body: "Sample clinical note for demonstrating the patient history screen. Enter actual notes through the clinical workflow.",
    });
    add("vitals", "Recorded", patient.id, null, {
      temperature: 37,
      pulse: 80,
      systolic: 120,
      diastolic: 80,
      oxygen: 98,
      measuredAt: now.toISOString(),
    });
    add("prescriptions", "Issued", patient.id, null, {
      medicineId: collections.medicines[0].id,
      quantity: 10,
      instructions:
        "Demonstration prescription only. Replace with the prescribing clinician's actual instructions.",
    });
  }
  for (const person of collections.staff.filter((s) => s.status === "Active")) {
    for (const day of [0, 1])
      add("roster", "Scheduled", null, person.id, {
        date: date(day),
        start: "09:00",
        end: "17:00",
        nextDay: false,
      });
  }
  for (const leave of reviewedLeave) {
    add("leave", leave.status, null, `sample-${batchId}-${leave.staffId}`, {
      from: leave.from,
      to: leave.to,
      reason: `Sample ${leave.status.toLowerCase()} leave history.`,
    });
  }
  for (const person of collections.staff.filter(
    (row) => row.status === "Active",
  )) {
    const target = collections.attendance.find(
      (row) => row.staffId === person.id && row.date === date(-1),
    )!;
    const original = { ...target };
    Object.assign(target, {
      status: "Present",
      checkIn: "09:00",
      checkOut: "16:30",
      nextDay: false,
    });
    add("approvals", "Approved", null, person.id, {
      type: "attendance",
      targetId: target.id,
      reason: "Sample attendance correction history.",
      original,
      proposed: { ...target },
    });
  }
  return { batchId, collections, work };
}
