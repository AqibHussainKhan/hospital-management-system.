import { doctorStore } from "./departmentStore";
import { stableJson } from "./recordCore";
import { useEffect, useState } from "react";
import {
  labStatuses, nextPatientId, patientInitials, patientStatuses,
  validLab, validMedicine, validPatient, validWard,
} from "./activityModel";
import type { LabRecord, MedicineRecord, OperationKind, PatientRecord, WardRecord } from "./activityModel";
import { getRecordStore, useRecordStore } from "./recordStore";
import { validBill } from "./administrationModel";

export const activityKeys = {
  patients: "medicore.patients.v1",
  wards: "medicore.operations.wards.v1",
  tests: "medicore.operations.tests.v1",
  medicines: "medicore.operations.medicines.v1",
  billing: "medicore-administration-v1",
  legacyBilling: "medicore.admin.billing.v1",
};
function checkPatients(rows: PatientRecord[]) {
  if (new Set(rows.map(r => r.patientId.toUpperCase())).size !== rows.length) throw new Error("This patient ID is already in use.");
}
export const patientStore = getRecordStore(activityKeys.patients, validPatient, checkPatients);
export const wardStore = getRecordStore(activityKeys.wards, validWard);
export const labStore = getRecordStore(activityKeys.tests, validLab);
export const medicineStore = getRecordStore(activityKeys.medicines, validMedicine);
export const usePatients = () => useRecordStore(patientStore);
export const useWards = () => useRecordStore(wardStore);
export const useLabTests = () => useRecordStore(labStore);
export const useMedicines = () => useRecordStore(medicineStore);

function recordId() {
  return globalThis.crypto?.randomUUID?.() || `record-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export async function savePatient(draft: Record<string, string>, editingId?: string, expected?: PatientRecord) {
  await doctorStore.refresh(); await wardStore.refresh();
  await patientStore.update((records) => {
    const existing = records.find((record) => record.id === editingId);
    if (editingId && !existing) throw new Error("This patient was removed. Close the editor and refresh the list.");
    if (expected && stableJson(existing) !== stableJson(expected)) throw new Error("This patient changed on another device. Reopen the editor before saving.");
    const name = (draft.name || "").trim();
    const patientId = (draft.patientId || "").trim().toUpperCase() || nextPatientId(records);
    const age = draft.age?.trim() ? Number(draft.age) : NaN;
    const status = draft.status as PatientRecord["status"];
    if (records.some((record) => record.id !== editingId && record.patientId.toUpperCase() === patientId)) throw new Error("This patient ID is already in use.");
    if (!patientStatuses.includes(status)) throw new Error("Choose a valid patient status.");
    const now = new Date().toISOString();
    const record: PatientRecord = {
      id: existing?.id || recordId(), patientId, name, age,
      gender: (draft.gender || "").trim(), phone: (draft.phone || "").trim(),
      department: (draft.department || "").trim(), doctor: (draft.doctor || "").trim(),
      status, initials: patientInitials(name),
      registeredAt: existing ? existing.registeredAt : now,
      admittedAt: status === "Admitted" && (!existing || existing.status !== "Admitted") ? now : existing?.admittedAt || null,
      doctorRef: draft.doctorRef || existing?.doctorRef, wardId: status === "Admitted" ? draft.wardId || existing?.wardId : undefined,
      updatedAt: now, notes: (draft.notes || "").trim(),
    };
    if (!record.doctorRef || !doctorStore.getSnapshot().records.some(d => d.id === record.doctorRef && d.status === "Active")) throw new Error("Select an active doctor from the directory.");
    if (status === "Admitted") {
      const ward = wardStore.getSnapshot().records.find(w => w.id === record.wardId);
      if (!ward || ward.status === "Maintenance" || ward.occupied + records.filter(p => p.id !== record.id && p.status === "Admitted" && p.wardId === ward.id).length >= ward.capacity) throw new Error("Select an available ward with a free bed.");
    }
    if (!validPatient(record)) throw new Error("Enter name, department, doctor, gender and a whole-number age from 0 to 130.");
    return existing ? records.map((item) => item.id === existing.id ? record : item) : [...records, record];
  });
}

export async function setPatientStatus(id: string, status: PatientRecord["status"]) {
  if (!patientStatuses.includes(status)) throw new Error("Choose a valid patient status.");
  const current = patientStore.getSnapshot().records.find(r => r.id === id);
  if (status === "Admitted" && current?.status !== "Admitted") throw new Error("Use Edit patient to select an admission ward before admitting this patient.");
  await patientStore.update((records) => {
    if (!records.some((record) => record.id === id)) throw new Error("This patient is no longer available.");
    const now = new Date().toISOString();
    return records.map((record) => record.id === id ? {
      ...record, status, updatedAt: now, wardId: status === "Admitted" ? record.wardId : undefined,
      admittedAt: status === "Admitted" && record.status !== "Admitted" ? now : record.admittedAt,
    } : record);
  });
}
export const deletePatient = (id: string) => patientStore.update((records) => records.filter((record) => record.id !== id));

export async function saveOperation(kind: OperationKind, draft: Record<string, string>, editingId?: string) {
  const numeric = (name: string) => draft[name]?.trim() ? Number(draft[name]) : NaN;
  if (kind === "wards") {
    await wardStore.update((records) => {
      if (editingId && !records.some((record) => record.id === editingId)) throw new Error("This ward was removed.");
      const previous = records.find(r => r.id === editingId);
      const record: WardRecord = { ...previous, id: editingId || recordId(), name: (draft.name || "").trim(), capacity: numeric("capacity"), occupied: numeric("occupied") };
      if (!validWard(record)) throw new Error("Enter a ward name, positive whole-number capacity and occupied beds between zero and capacity.");
      return editingId ? records.map((item) => item.id === editingId ? record : item) : [...records, record];
    });
  } else if (kind === "tests") {
    await labStore.update((records) => {
      const existing = records.find((record) => record.id === editingId);
      if (editingId && !existing) throw new Error("This laboratory request was removed.");
      if (!labStatuses.includes(draft.status as LabRecord["status"])) throw new Error("Choose a valid laboratory status.");
      const record: LabRecord = { ...existing, id: editingId || recordId(), patient: (draft.patient || "").trim(), test: (draft.test || "").trim(), status: draft.status as LabRecord["status"], requestedAt: existing?.requestedAt || new Date().toISOString() };
      if (!validLab(record)) throw new Error("Enter a patient and test name.");
      return editingId ? records.map((item) => item.id === editingId ? record : item) : [...records, record];
    });
  } else {
    await medicineStore.update((records) => {
      if (editingId && !records.some((record) => record.id === editingId)) throw new Error("This medicine was removed.");
      const previous = records.find(r => r.id === editingId);
      const record: MedicineRecord = { ...previous, id: editingId || recordId(), name: (draft.name || "").trim(), quantity: numeric("quantity"), reorderLevel: numeric("reorderLevel") };
      if (!validMedicine(record)) throw new Error("Enter a medicine name and non-negative whole-number stock/reorder quantities.");
      return editingId ? records.map((item) => item.id === editingId ? record : item) : [...records, record];
    });
  }
}
export async function deleteOperation(kind: OperationKind, id: string) {
  if (kind === "wards") await wardStore.update((records) => records.filter((record) => record.id !== id));
  else if (kind === "tests") await labStore.update((records) => records.filter((record) => record.id !== id));
  else await medicineStore.update((records) => records.filter((record) => record.id !== id));
}

const invoices = getRecordStore(activityKeys.legacyBilling, validBill);
export function useRevenueSources() {
  const state = useRecordStore(invoices);
  const modern = { version: 1, invoices: state.records.filter(r => !r.voided).map(r => ({
    id: r.id, patientName: r.patient, issuedOn: r.date, openingPaid: Math.round((r.openingPaid ?? (!r.payments ? r.paid : 0))*100),
    items: [{ quantity: 1, unitAmount: Math.round(r.amount * 100) }],
    payments: (r.payments || []).map(p => ({ id: p.id, amount: p.amount, receivedAt: p.receivedAt })),
  })) };
  return { modern, legacy: null, error: state.error, loading: state.loading };
}
export function useActivityClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  return now;
}
