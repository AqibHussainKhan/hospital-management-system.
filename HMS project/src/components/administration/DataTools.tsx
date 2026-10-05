import { useState } from "react";
import { getSupabase } from "../../lib/supabaseClient";
import { dataMode, collectionName, recordAccountId, recordsEvent } from "../../data/recordStore";
import { validateRecords } from "../../data/recordCore";
import type { Identified, Validator } from "../../data/recordCore";
import { activityKeys, patientStore, wardStore, labStore, medicineStore } from "../../data/activityStore";
import { validPatient, validWard, validLab, validMedicine } from "../../data/activityModel";
import { appointmentKey, visitKey, validAppointment, validVisit, appointmentStore, visitStore, checkAppointments } from "../../data/dashboardStore";
import { validStaff, validAttendance, validBill, checkAttendance } from "../../data/administrationModel";
import { validDoctor, validSurgery, doctorStore, surgeryStore, checkSurgeries } from "../../data/departmentStore";
import { keys, staffStore, attendanceStore, billingStore, buttonClass } from "./shared";
const sources = [
 {key:activityKeys.patients,validate:validPatient,store:patientStore}, {key:activityKeys.wards,validate:validWard,store:wardStore},
 {key:activityKeys.tests,validate:validLab,store:labStore}, {key:activityKeys.medicines,validate:validMedicine,store:medicineStore},
 {key:appointmentKey,validate:validAppointment,store:appointmentStore}, {key:visitKey,validate:validVisit,store:visitStore},
 {key:keys.staff,validate:validStaff,store:staffStore}, {key:keys.attendance,validate:validAttendance,store:attendanceStore},
 {key:keys.billing,validate:validBill,store:billingStore}, {key:"medicore.doctors.v1",validate:validDoctor,store:doctorStore},
 {key:"medicore.surgeries.v1",validate:validSurgery,store:surgeryStore},
];
function download(name: string, data: unknown) {
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
 const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function DataTools() {
 const [preview,setPreview]=useState<Record<string,Identified[]> | null>(null); const [error,setError]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 function inspect() {
  try {
   const result: Record<string,Identified[]>={};
   for(const source of sources) {
    const raw=localStorage.getItem(source.key);
    if(raw!==null) result[collectionName(source.key)]=validateRecords(JSON.parse(raw),source.validate as Validator<Identified>);
   }
   if(result.appointments) checkAppointments(result.appointments as Parameters<typeof checkAppointments>[0]);
   if(result.attendance) checkAttendance(result.attendance as Parameters<typeof checkAttendance>[0]);
   if(result.surgeries) checkSurgeries(result.surgeries as Parameters<typeof checkSurgeries>[0]);
   setPreview(result);setError("");setMessage(Object.keys(result).length?"Review the counts below before importing.":"No stored legacy records were found. Sample cards were not saved records.");
  } catch(e) {setPreview(null);setError(e instanceof Error?e.message:"Legacy data cannot be read. Download its raw backup before repairing it.");}
 }
 async function backupCurrent() {
  setBusy(true);setError("");
  try {
   if(dataMode==="supabase") {
    const result=await getSupabase().from("hms_collections").select("name,records,revision,updated_at");
    if(result.error)throw result.error;
    download("hms-backup.json",{version:2,exportedAt:new Date().toISOString(),collections:result.data});
   } else {
    const collections=sources.map(s=>({name:collectionName(s.key),value:JSON.parse(localStorage.getItem(`medicore.hms.v2.${recordAccountId()}.${collectionName(s.key)}`)||'{"revision":0,"records":[]}')}));
    download("hms-backup.json",{version:2,exportedAt:new Date().toISOString(),collections});
   }
   setMessage("Backup downloaded. Store it with the same care as your hospital records.");
  } catch(e){setError((e as Error).message || "Backup failed.");} finally {setBusy(false);}
 }
 async function importRecords() {
  if(!preview || !Object.values(preview).some(rows=>rows.length))return;
  setBusy(true);setError("");
  try {
   if(dataMode!=="supabase")throw new Error("Legacy import is available in Supabase mode. Keep your raw backup and finish database setup first.");
   const result=await getSupabase().rpc("hms_import_legacy",{next_collections:preview});
   if(result.error)throw result.error;
   await Promise.all(sources.map(s=>s.store.refresh()));
   window.dispatchEvent(new Event(recordsEvent));setPreview(null);setMessage("Legacy records imported. Original browser storage was kept.");
  }catch(e){setError((e as Error).message || "Import failed. Original records were kept.");}finally{setBusy(false);}
 }
 async function audit() {
  setBusy(true);setError("");
  try { const result=await getSupabase().from("hms_audit").select("id,actor_id,occurred_at,collection,revision,changed_ids,action").order("id",{ascending:false}).limit(1000);if(result.error)throw result.error;download("hms-audit-latest-1000.json",result.data); }
  catch(e){setError((e as Error).message || "Audit export failed.");}finally{setBusy(false);}
 }
 return <section className="hms-card rounded-[24px] p-6"><h2 className="text-lg font-semibold">Data Backup & Migration</h2><p className="mt-3 text-sm leading-7 text-[var(--hms-text-muted)]">Export your current records, or review records saved by the previous app. Import requires an empty hospital database and validates linked records together.</p><div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} className={buttonClass} onClick={()=>void backupCurrent()}>Download Current Backup</button><button className={buttonClass} onClick={()=>download("hms-legacy-raw-backup.json",Object.fromEntries(sources.map(s=>[s.key,localStorage.getItem(s.key)])))}>Download Old Raw Backup</button><button disabled={busy} className={buttonClass} onClick={inspect}>Review Old Browser Records</button>{dataMode==="supabase" && <button disabled={busy} className={buttonClass} onClick={()=>void audit()}>Export Audit History</button>}</div>{preview && <div className="mt-5"><ul className="space-y-2 text-sm">{Object.entries(preview).map(([name,rows])=><li key={name}>{name}: {rows.length} records</li>)}</ul>{Object.values(preview).some(rows=>rows.length) && <button disabled={busy} className={`${buttonClass} mt-4`} onClick={()=>void importRecords()}>{busy?"Importing…":"Import Reviewed Records"}</button>}</div>}{error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-[var(--hms-text-muted)]">{message}</p>}</section>;
}
