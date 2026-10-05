import { useState } from "react";
import type { FormEvent } from "react";
import { Page, Card, Stats, Field, Table, Badge, ErrorMessage, useRecords, keys, today, money, inputClass, buttonClass, cellClass, rowClass, downloadCsv } from "../../components/administration/shared";
import type { BillRecord } from "../../data/administrationModel";
import { decimalToPaisa } from "../../data/recordCore";
import { usePatients } from "../../data/activityStore";
import { fullTime } from "../../data/activityModel";
import ActivityDialog from "../../components/dashboard/ActivityDialog";
const blank = () => ({ patientId: "", service: "", date: today(), amount: "" });
const billStatus = (r: BillRecord) => r.voided ? "Voided" : r.paid >= r.amount ? "Paid" : r.paid > 0 ? "Partial" : "Unpaid";
export default function Billing({ onLogout }: { onLogout: () => void }) {
  const state = useRecords<BillRecord>(keys.billing); const patients = usePatients();
  const [form, setForm] = useState(blank); const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [validation, setValidation] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState("All");
  const [paymentId, setPaymentId] = useState<string | null>(null); const [payment, setPayment] = useState(""); const [reference, setReference] = useState("");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const active = state.records.filter(r => !r.voided);
  const filtered = state.records.filter(r => `${r.patient} ${r.patientId} ${r.id} ${r.service}`.toLowerCase().includes(search.toLowerCase()) && (status === "All" || billStatus(r) === status));
  const invoice = state.records.find(r => r.id === paymentId); const detail = state.records.find(r => r.id === detailsId);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const amount = decimalToPaisa(form.amount); const person = patients.records.find(p => p.patientId === form.patientId);
      const old = state.records.find(r => r.id === editing);
      if (!person || !form.service.trim() || amount <= 0) throw new Error("Select a registered patient, service and a positive invoice amount.");
      if (editing && (!old || old.paid || old.voided)) throw new Error("Only unpaid active invoices can be edited.");
      const row: BillRecord = { id: old?.id || crypto.randomUUID(), patient: person.name, patientId: person.patientId, service: form.service.trim(), date: form.date, amount: amount / 100, paid: 0, payments: [], openingPaid: 0, voided: false };
      if (await state.save(old ? state.records.map(r => r.id === old.id ? row : r) : [...state.records, row])) { setOpen(false); setEditing(null); setValidation(""); }
    } catch (error) { setValidation(error instanceof Error ? error.message : "Invoice could not be saved."); }
  }
  async function receive(e: FormEvent) {
    e.preventDefault();
    try {
      if (!invoice || invoice.voided) throw new Error("This invoice is unavailable.");
      const amount = decimalToPaisa(payment);
      if (amount <= 0 || amount > Math.round((invoice.amount - invoice.paid) * 100)) throw new Error("Payment must be positive and no higher than the outstanding balance.");
      const payments = [...(invoice.payments || []), { id: crypto.randomUUID(), amount, receivedAt: new Date().toISOString(), reference: reference.trim() }];
      const openingPaid = invoice.openingPaid ?? (invoice.payments ? 0 : invoice.paid);
      const row = { ...invoice, openingPaid, payments, paid: (Math.round(openingPaid * 100) + payments.reduce((sum,p) => sum+p.amount,0)) / 100 };
      if (await state.save(state.records.map(r => r.id === row.id ? row : r))) { setPaymentId(null); setValidation(""); }
    } catch (error) { setValidation(error instanceof Error ? error.message : "Payment could not be saved."); }
  }
  return <Page title="Billing & Payments" subtitle="Patient invoices and dated payment receipts. Amounts are validated in paisa." path="/billing" onLogout={onLogout}>
    <Stats items={[{label:"Active invoices",value:active.length},{label:"Total billed",value:money(active.reduce((s,r)=>s+Math.round(r.amount*100),0)/100)},{label:"Collected",value:money(active.reduce((s,r)=>s+Math.round(r.paid*100),0)/100)},{label:"Outstanding",value:money(active.reduce((s,r)=>s+Math.round((r.amount-r.paid)*100),0)/100)}]}/>
    <ErrorMessage message={validation || state.error}/>
    <Card><div className="flex flex-wrap gap-3"><input aria-label="Search invoices" className={`${inputClass} flex-1`} value={search} placeholder="Search patient, ID or service…" onChange={e=>setSearch(e.target.value)}/><select aria-label="Payment status" className={`${inputClass} max-w-[160px]`} value={status} onChange={e=>setStatus(e.target.value)}>{["All","Paid","Partial","Unpaid","Voided"].map(s=><option key={s}>{s}</option>)}</select><button disabled={state.loading || state.saving} className={buttonClass} onClick={()=>{setEditing(null);setForm(blank());setValidation("");setOpen(true);}}>Create Invoice</button><button className={buttonClass} onClick={()=>downloadCsv("billing.csv",[["Invoice","Patient","Patient ID","Service","Date","Total PKR","Paid PKR","Due PKR","Status"],...filtered.map(r=>[r.id,r.patient,r.patientId,r.service,r.date,r.amount,r.paid,Math.round((r.amount-r.paid)*100)/100,billStatus(r)])])}>Export CSV</button></div></Card>
    <Table headers={["Invoice / Patient","Service","Date","Total","Paid","Due","Status","Actions"]} empty={!filtered.length}>{filtered.map(r=><tr key={r.id} className={rowClass}><td className={cellClass}><p className="font-semibold">{r.patient}</p><p className="mt-1 text-xs text-[var(--hms-text-muted)]">INV-{r.id.slice(0,8).toUpperCase()} · {r.patientId}</p></td><td className={cellClass}>{r.service}</td><td className={cellClass}>{r.date}</td><td className={cellClass}>{money(r.amount)}</td><td className={cellClass}>{money(r.paid)}</td><td className={cellClass}>{money(Math.round((r.amount-r.paid)*100)/100)}</td><td className={cellClass}><Badge>{billStatus(r)}</Badge></td><td className={cellClass}><div className="flex flex-wrap gap-3 text-xs"><button className="text-blue-500" onClick={()=>setDetailsId(r.id)}>Receipts</button>{!r.voided && r.paid<r.amount && <button disabled={state.saving} className="text-blue-500" onClick={()=>{setPaymentId(r.id);setPayment("");setReference("");setValidation("");}}>Add Payment</button>}{!r.voided && !r.paid && <><button className="text-blue-500" onClick={()=>{setEditing(r.id);setForm({patientId:r.patientId,service:r.service,date:r.date,amount:String(r.amount)});setOpen(true);}}>Edit</button><button className="text-red-500" onClick={async()=>{if(window.confirm("Void this unpaid invoice? Its history will be retained.")) await state.save(state.records.map(v=>v.id===r.id?{...v,voided:true}:v));}}>Void</button></>}</div></td></tr>)}</Table>
    {open && <ActivityDialog title={editing?"Edit Unpaid Invoice":"Create Invoice"} onClose={()=>{if(!state.saving)setOpen(false);}}><form onSubmit={submit} className="grid gap-4"><Field label="Registered patient"><select aria-label="Registered patient" required className={inputClass} value={form.patientId} onChange={e=>setForm({...form,patientId:e.target.value})}><option value="">Select patient</option>{patients.records.map(p=><option key={p.id} value={p.patientId}>{p.patientId} · {p.name}</option>)}</select></Field><Field label="Service / description"><input required maxLength={150} className={inputClass} value={form.service} onChange={e=>setForm({...form,service:e.target.value})}/></Field><Field label="Invoice date"><input required type="date" className={inputClass} value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field><Field label="Amount (PKR)"><input required type="number" min="0.01" step="0.01" className={inputClass} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></Field><ErrorMessage message={validation || state.error}/><button disabled={state.saving} className={buttonClass}>{state.saving?"Saving…":"Save Invoice"}</button></form></ActivityDialog>}
    {invoice && <ActivityDialog title="Record Received Payment" onClose={()=>{if(!state.saving)setPaymentId(null);}}><p className="mb-5 text-sm">{invoice.patient} · Outstanding: {money(Math.round((invoice.amount-invoice.paid)*100)/100)}</p><form onSubmit={receive} className="space-y-4"><Field label="Payment amount (PKR)"><input required type="number" min="0.01" step="0.01" className={inputClass} value={payment} onChange={e=>setPayment(e.target.value)}/></Field><Field label="Receipt / bank reference (optional)"><input maxLength={120} className={inputClass} value={reference} onChange={e=>setReference(e.target.value)}/></Field><ErrorMessage message={validation || state.error}/><button disabled={state.saving} className={buttonClass}>Save Payment Receipt</button><p className="text-xs text-[var(--hms-text-muted)]">Record a payment only after it has been received. This action does not charge a card or transfer money.</p></form></ActivityDialog>}
    {detail && <ActivityDialog title="Invoice Receipts" onClose={()=>setDetailsId(null)}><p className="font-semibold">{detail.patient} · {detail.patientId}</p>{(detail.openingPaid || (!detail.payments && detail.paid)) ? <p className="mt-4 text-sm text-amber-600">Legacy paid balance: {money(detail.openingPaid ?? detail.paid)}. Receipt date was not recorded; this balance is excluded from dated cashflow.</p>:null}<div className="mt-5 space-y-3">{(detail.payments || []).map(p=><div key={p.id} className="rounded-xl border border-[var(--hms-border)] p-4"><p className="font-semibold">{money(p.amount/100)}</p><p className="mt-2 text-xs text-[var(--hms-text-muted)]">{fullTime(p.receivedAt)} · {p.reference || p.id}</p></div>)}{!detail.payments?.length && <p className="text-sm text-[var(--hms-text-muted)]">No dated receipts.</p>}</div></ActivityDialog>}
  </Page>;
}
