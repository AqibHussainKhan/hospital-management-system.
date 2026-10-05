import { shiftMinutes } from "../../data/recordCore";
import { useState } from "react";
import type { FormEvent } from "react";
import { Page, Card, Stats, Field, Table, Badge, ErrorMessage, useRecords, keys, today, inputClass, buttonClass, cellClass, rowClass, downloadCsv } from "../../components/administration/shared";
import type { StaffRecord, AttendanceRecord } from "../../components/administration/shared";
export default function Attendance({ onLogout }: { onLogout: () => void }) {
  const { records: staff } = useRecords<StaffRecord>(keys.staff);
  const { records, save, error } = useRecords<AttendanceRecord>(keys.attendance);
  const [date, setDate] = useState(today());
  const [staffId, setStaffId] = useState("");
  const [status, setStatus] = useState<AttendanceRecord["status"]>("Present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [nextDay, setNextDay] = useState(false);
  const [validation, setValidation] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const daily = records.filter(r => r.date === date);
  const filtered = daily.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) && (filter === "All" || r.status === filter));
  async function submit(e: FormEvent) {
    e.preventDefault(); const person = staff.find(r => r.id === staffId); if (!person) return;
    if (status === "Present") { try { if (!checkIn) throw new Error("Enter check-in time."); shiftMinutes(checkIn, checkOut, nextDay); } catch (e) { setValidation(e instanceof Error ? e.message : "Invalid shift."); return; } }
    const existing = records.find(r => r.staffId === staffId && r.date === date);
    const record: AttendanceRecord = { id: existing?.id || crypto.randomUUID(), staffId, name: person.name, date, status, checkIn: status === "Present" ? checkIn : "", checkOut: status === "Present" ? checkOut : "", nextDay: status === "Present" && nextDay };
    if (await save(existing ? records.map(r => r.id === existing.id ? record : r) : [...records, record])) { setValidation(""); setStaffId(""); setCheckIn(""); setCheckOut(""); }
  }
  return <Page title="Staff Attendance" subtitle="Record daily status and check-in / check-out times. Times are entered in Pakistan time." path="/attendance" onLogout={onLogout}>
    <Stats items={[{ label: "Recorded on selected date", value: daily.length }, { label: "Present", value: daily.filter(r => r.status === "Present").length }, { label: "Absent", value: daily.filter(r => r.status === "Absent").length }, { label: "On leave", value: daily.filter(r => r.status === "Leave").length }]} />
    <ErrorMessage message={error || validation} />
    <Card><form className="grid gap-4 md:grid-cols-3" onSubmit={submit}><Field label="Attendance date"><input required type="date" className={inputClass} value={date} onChange={e => { setDate(e.target.value); setStaffId(""); setCheckIn(""); setCheckOut(""); }} /></Field><Field label="Staff member"><select aria-label="Staff member" required className={inputClass} value={staffId} onChange={e => { const id = e.target.value; setStaffId(id); const r = records.find(v => v.staffId === id && v.date === date); setStatus(r?.status || "Present"); setCheckIn(r?.checkIn || ""); setCheckOut(r?.checkOut || ""); setNextDay(r?.nextDay || false); }}><option value="">Select active staff</option>{staff.filter(s => s.status === "Active").map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}</select></Field><Field label="Status"><select className={inputClass} value={status} onChange={e => setStatus(e.target.value as AttendanceRecord["status"])}><option>Present</option><option>Absent</option><option>Leave</option></select></Field><Field label="Check-in"><input type="time" required={status === "Present"} disabled={status !== "Present"} className={inputClass} value={checkIn} onChange={e => setCheckIn(e.target.value)} /></Field><Field label="Check-out (optional)"><input type="time" disabled={status !== "Present"} className={inputClass} value={checkOut} onChange={e => setCheckOut(e.target.value)} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nextDay} disabled={status !== "Present"} onChange={e => setNextDay(e.target.checked)}/>Check-out on next day</label><div className="flex items-end"><button disabled={!staffId} className={buttonClass}>Save Attendance</button></div></form><p className="mt-4 text-xs text-[var(--hms-text-muted)]">One record per staff member per date. Saving again updates the record. Add active staff on the Staff page first.</p></Card>
    <Card><div className="flex flex-col gap-3 md:flex-row"><input aria-label="Search attendance" className={inputClass} placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Attendance status" className={inputClass} value={filter} onChange={e => setFilter(e.target.value)}>{["All", "Present", "Absent", "Leave"].map(s => <option key={s}>{s}</option>)}</select><button className={`${buttonClass} shrink-0`} onClick={() => downloadCsv(`attendance-${date}.csv`, [["Date", "Staff", "Status", "Check-in", "Check-out"], ...filtered.map(r => [r.date, r.name, r.status, r.checkIn, `${r.checkOut}${r.nextDay ? " (+1 day)" : ""}`])])}>Export CSV</button></div></Card>
    <Table headers={["Staff", "Date", "Status", "Check-in", "Check-out", "Actions"]} empty={!filtered.length}>{filtered.map(r => <tr key={r.id} className={rowClass}><td className={cellClass}>{r.name}</td><td className={cellClass}>{r.date}</td><td className={cellClass}><Badge>{r.status}</Badge></td><td className={cellClass}>{r.checkIn || "—"}</td><td className={cellClass}>{r.checkOut ? `${r.checkOut}${r.nextDay ? " (+1 day)" : ""}` : "—"}</td><td className={cellClass}><button className="text-red-500" onClick={() => { if (window.confirm(`Delete attendance for ${r.name} on ${r.date}?`)) save(records.filter(a => a.id !== r.id)); }}>Delete</button></td></tr>)}</Table>
  </Page>;
}
