const test=require('node:test');const assert=require('node:assert/strict');
const createLoader=require('./load-source.cjs');
const load=createLoader();
const core=load('src/data/recordCore.ts');
const model=load('src/data/administrationModel.ts');
const date=load('src/data/dateModel.ts');
const base=[{id:'a',name:'A'}];
test('stale editors preserve unrelated additions',()=>assert.deepEqual(JSON.parse(JSON.stringify(core.mergeRecords(base,[...base,{id:'c',name:'C'}],[...base,{id:'b',name:'B'}]))).map(r=>r.id),['a','b','c']));
test('stale edits and deletes reject concurrent changes',()=>{
 assert.throws(()=>core.mergeRecords(base,[{id:'a',name:'edited'}],[{id:'a',name:'newer'}]),/another tab/);
 assert.throws(()=>core.mergeRecords(base,[],[{id:'a',name:'newer'}]),/another tab/);
});
test('JSONB field order changes do not cause false edit conflicts',()=>{
 const opened=[{id:'a',name:'A',payments:[{id:'p',amount:2001}]}];
 const current=[{payments:[{amount:2001,id:'p'}],name:'A',id:'a'}];
 const next=[{...opened[0],name:'Updated'}];
 assert.equal(core.mergeRecords(opened,next,current)[0].name,'Updated');
});
test('invalid arrays and duplicate identities cannot be saved',()=>{
 const valid=v=>v&&typeof v.id==='string'&&typeof v.name==='string';
 assert.throws(()=>core.validateRecords([null],valid),/invalid/);
 assert.throws(()=>core.validateRecords([...base,...base],valid),/invalid/);
});
test('decimal money is converted without floating point accumulation',()=>{
 assert.equal(core.decimalToPaisa('10.01'),1001);assert.equal(core.decimalToPaisa('0.10')+core.decimalToPaisa('0.20'),30);
 for(const value of ['-1','1.001','1e3','Infinity',''])assert.throws(()=>core.decimalToPaisa(value));
});
test('overnight shifts are explicit and bounded',()=>{
 assert.equal(core.shiftMinutes('22:00','06:00',true),480);assert.throws(()=>core.shiftMinutes('22:00','06:00',false));assert.throws(()=>core.shiftMinutes('06:00','22:00',true));
});
test('administration records reject corrupt and overpaid data',()=>{
 assert.equal(model.validStaff(null),false);assert.equal(model.validBill({id:'b',patient:'Test',patientId:'HMS-1',service:'Consultation',date:'2026-10-04',amount:100,paid:101}),false);
 const bill={id:'b',patient:'Test',patientId:'HMS-1',service:'Consultation',date:'2026-10-04',amount:100,paid:20,openingPaid:0,payments:[{id:'p',amount:2000,receivedAt:'2026-10-04T08:00:00Z',reference:''}]};
 assert.equal(model.validBill(bill),true);assert.equal(model.validBill({...bill,paid:30}),false);
});
test('dates and time values have real bounds',()=>{
 assert.equal(date.isDate('2026-02-30'),false);assert.equal(date.isDate('2024-02-29'),true);assert.ok(Number.isNaN(date.timeMinutes('25:99')));assert.equal(date.timeMinutes('12:30 AM'),30);assert.equal(date.pakistanDate(new Date('2026-10-03T20:00:00Z')),'2026-10-04');
});
const react={useEffect(){},useState(){},useSyncExternalStore(){}};
const recordsStub={getRecordStore(){return {}},useRecordStore(){}};
const domain=createLoader({react,'./recordStore':recordsStub});
const dashboard=domain('src/data/dashboardStore.ts');
test('appointment overlaps reject doctor and patient collisions',()=>{
 const a={id:'a',appointmentId:'APT-A',patient:'Test Patient',doctor:'Test Doctor',department:'General',date:'2026-10-04',time:'09:00',status:'Confirmed',initials:'TP',duration:30};
 assert.throws(()=>dashboard.checkAppointments([a,{...a,id:'b',appointmentId:'APT-B',time:'09:15'}]),/overlapping/);
 dashboard.checkAppointments([a,{...a,id:'b',appointmentId:'APT-B',time:'09:30'}]);
 assert.throws(()=>dashboard.checkAppointments([{...a,time:'23:45'}]),/same date/);
});
const notifications=load('src/data/notificationModel.ts');
test('today appointment alert is detected on date rollover',()=>{
 const appointment={id:'a',appointmentId:'APT-A',patient:'Test',doctor:'Doctor',department:'General',date:'2026-10-05',time:'09:00',status:'Confirmed'};
 const before=Date.parse('2026-10-04T10:00:00Z'),after=Date.parse('2026-10-05T10:00:00Z');
 let state=notifications.reconcileNotifications(notifications.emptyNotificationState(),{appointments:notifications.observeRecords('appointments',[appointment],before)},before);
 state=notifications.reconcileNotifications(state,{appointments:notifications.observeRecords('appointments',[appointment],after)},after);
 assert.equal(state.notifications.length,1);
});
test('undated opening balances do not invent today receipts',()=>{
 const activity=load('src/data/activityModel.ts');
 const summary=activity.revenueSummary({version:1,invoices:[{id:'i',patientName:'Test',issuedOn:'2026-10-04',openingPaid:2000,items:[{quantity:1,unitAmount:10000}],payments:[{id:'r',amount:1000,receivedAt:'2026-10-04T08:00:00Z'}]}]},null,'2026-10-04');
 assert.equal(summary.paid,3000);assert.equal(summary.today,1000);assert.equal(summary.outstanding,7000);
});
test('maintenance beds are excluded and linked admissions count once',()=>{
 const activity=load('src/data/activityModel.ts');
 const summary=activity.occupancy([{id:'w',name:'Ward',capacity:10,occupied:2},{id:'m',name:'Maintenance',capacity:5,occupied:0,status:'Maintenance'}],[{status:'Admitted',wardId:'w'}]);
 assert.equal(summary.capacity,10);assert.equal(summary.occupied,3);assert.equal(summary.available,7);
});
test('corrupt local storage blocks writes without overwriting data',async()=>{
 const memory=new Map();const target=new EventTarget();const window={dispatchEvent:e=>target.dispatchEvent(e),addEventListener:(...args)=>target.addEventListener(...args),removeEventListener:(...args)=>target.removeEventListener(...args),setInterval,clearInterval};
 const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 const source=createLoader({react,'../lib/supabaseClient':{}},{window,localStorage:storage,navigator:{locks:{request:async(_k,fn)=>fn()}},Event});
 const repo=source('src/data/recordStore.ts');repo.setRecordSession('account-a');
 const key='medicore.hms.v2.account-a.staff';memory.set(key,'corrupt-json');
 const store=repo.getRecordStore('medicore.admin.staff.v1',v=>v&&typeof v.id==='string');
 await assert.rejects(store.update(rows=>[...rows,{id:'new'}]));assert.equal(memory.get(key),'corrupt-json');
 repo.setRecordSession('account-b');await store.refresh();assert.equal(store.getSnapshot().records.length,0);
 repo.setRecordSession(null);assert.equal(store.getSnapshot().records.length,0);
});
