const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/202610040001_hms_setup.sql'),'utf8');
const admin='11111111-1111-4111-8111-111111111111', outsider='22222222-2222-4222-8222-222222222222';
test('database migration, RLS, concurrency, relationships and receipt history',async t=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);grant usage on schema public,auth to anon,authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${admin}','admin@example.test'),('${outsider}','outsider@example.test');`);
  await t.test('migration installs and can be safely rerun',async()=>{await db.exec(migration);await db.exec(migration);const result=await db.query('select count(*)::integer as n from public.hms_collections');assert.equal(result.rows[0].n,11);});
  const identity=async(id,role='authenticated')=>{await db.exec(`reset role;set request.jwt.claim.sub='${id || ''}';set role ${role};`);};
  await t.test('anonymous users cannot read records or call save RPC',async()=>{
   await identity(null,'anon');await assert.rejects(db.query('select * from public.hms_collections'),/permission denied/);await assert.rejects(db.query("select public.hms_save_collection('staff',0,'[]')"),/permission denied/);
  });
  await t.test('signed-in non-admin sees no records and cannot self-promote',async()=>{
   await identity(outsider);assert.equal((await db.query('select * from public.hms_collections')).rows.length,0);
   await assert.rejects(db.query(`insert into public.hms_admins(user_id) values('${outsider}')`),/permission denied/);
   await assert.rejects(db.query("select public.hms_save_collection('staff',0,'[]')"),/administrator access/);
  });
  await db.exec(`reset role;insert into public.hms_admins(user_id) values('${admin}');`);await identity(admin);
  const save=(name,revision,rows)=>db.query('select public.hms_save_collection($1,$2,$3::jsonb) as revision',[name,revision,JSON.stringify(rows)]);
  const doctor={id:'doctor',name:'Test Doctor',specialty:'General',department:'General',experience:'5 years',phone:'',photo:'',status:'Active'};
  const ward={id:'ward',name:'Ward A',capacity:1,occupied:0,status:'Available'};
  const patient={id:'patient',patientId:'HMS-1',name:'Test Patient',age:30,gender:'Other',department:'General',phone:'',doctor:'Test Doctor',doctorRef:'doctor',status:'Admitted',wardId:'ward',initials:'TP',registeredAt:'2026-10-04T08:00:00Z',admittedAt:'2026-10-04T08:00:00Z',updatedAt:'2026-10-04T08:00:00Z',notes:''};
  await t.test('admin reads but cannot bypass RPC with direct table writes',async()=>{assert.equal((await db.query('select * from public.hms_collections')).rows.length,11);await assert.rejects(db.query("update public.hms_collections set records='[]'"),/permission denied/);});
  await t.test('RPC validates fields and revisions',async()=>{await assert.rejects(save('doctors',0,[null]),/HMS_INVALID/);await assert.rejects(save('doctors',0,[{...doctor,status:undefined}]),/HMS_INVALID/);assert.equal((await save('doctors',0,[doctor])).rows[0].revision,1);await assert.rejects(save('doctors',0,[]),/HMS_CONFLICT/);});
  await t.test('ward and patient linkage prevents overcapacity and deletion',async()=>{
   await save('wards',0,[ward]);await save('patients',0,[patient]);
   await assert.rejects(save('patients',1,[patient,{...patient,id:'patient2',patientId:'HMS-2'}]),/HMS_INVALID/);
   await assert.rejects(save('wards',1,[]),/HMS_INVALID/);await assert.rejects(save('doctors',1,[]),/HMS_INVALID/);
   await assert.rejects(save('wards',1,[{...ward,status:'Maintenance'}]),/HMS_INVALID/);
  });
  const appointment={id:'appointment',appointmentId:'APT-1',patient:'Test Patient',patientRef:'patient',doctor:'Test Doctor',doctorRef:'doctor',department:'General',date:'2026-10-04',time:'09:00',duration:30,status:'Confirmed',initials:'TP'};
  await t.test('overlapping appointments are rejected at the database',async()=>{await save('appointments',0,[appointment]);await assert.rejects(save('appointments',1,[appointment,{...appointment,id:'appointment2',appointmentId:'APT-2',time:'09:15'}]),/HMS_INVALID/);});
  const invoice={id:'invoice',patient:'Test Patient',patientId:'HMS-1',service:'Consultation',date:'2026-10-04',amount:100,paid:0,openingPaid:0,payments:[],voided:false};
  const receipt={id:'receipt',amount:2000,receivedAt:'2026-10-04T09:00:00Z',reference:'TEST'};
  const paid={...invoice,paid:20,payments:[receipt]};
  await t.test('payment sums and existing receipt history are enforced',async()=>{
   await save('billing',0,[invoice]);await save('billing',1,[paid]);
   await assert.rejects(save('billing',2,[{...paid,paid:101,payments:[{...receipt,amount:10100}]}]),/HMS_INVALID/);
   await assert.rejects(save('billing',2,[{...paid,payments:[{...receipt,reference:'edited'}]}]),/HMS_INVALID/);
   await assert.rejects(save('billing',2,[]),/HMS_INVALID/);await assert.rejects(save('billing',2,[{...paid,voided:true}]),/HMS_INVALID/);
   await assert.rejects(save('patients',1,[]),/HMS_INVALID/);
  });
  await t.test('audit is appended and cannot be mutated by clients',async()=>{const rows=await db.query('select * from public.hms_audit');assert.ok(rows.rows.length>=6);await assert.rejects(db.query('delete from public.hms_audit'),/permission denied/);});
  await t.test('import cannot overwrite existing hospital data',async()=>{await assert.rejects(db.query("select public.hms_import_legacy('{}')"),/HMS_CONFLICT/);});
  await t.test('non-admin access remains denied after data exists',async()=>{await identity(outsider);assert.equal((await db.query('select * from public.hms_collections')).rows.length,0);assert.equal((await db.query('select * from public.hms_audit')).rows.length,0);});
 }finally{await db.close();}
});
test('legacy import is atomic and preserves undated balances',async t=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);grant usage on schema public,auth to anon,authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${admin}','admin@example.test');`);
  await db.exec(migration);await db.exec(`insert into public.hms_admins(user_id) values('${admin}');set request.jwt.claim.sub='${admin}';set role authenticated;`);
  const patient={id:'legacy-patient',patientId:'HMS-1',name:'Test Patient',age:30,gender:'Other',department:'General',phone:'',doctor:'Test Doctor',status:'Outpatient',initials:'TP',registeredAt:null,admittedAt:null,updatedAt:null,notes:''};
  const bill={id:'legacy-invoice',patient:'Test Patient',patientId:'HMS-1',service:'Consultation',date:'2026-10-04',amount:100,paid:10};
  const imported=rows=>db.query('select public.hms_import_legacy($1::jsonb)',[JSON.stringify(rows)]);
  await t.test('failed import rolls back every collection and audit entry',async()=>{
   await assert.rejects(imported({patients:[patient],billing:[{...bill,patientId:'missing'}]}),/HMS_INVALID/);
   assert.equal((await db.query("select count(*)::integer as n from public.hms_collections where records<>'[]' or revision<>0")).rows[0].n,0);
   assert.equal((await db.query('select count(*)::integer as n from public.hms_audit')).rows[0].n,0);
  });
  await t.test('valid legacy records and paid balances import together',async()=>{await imported({patients:[patient],billing:[bill]});assert.equal((await db.query("select records->0->>'paid' as paid from public.hms_collections where name='billing'")).rows[0].paid,'10');});
  const save=row=>db.query("select public.hms_save_collection('billing',1,$1::jsonb)",[JSON.stringify([row])]);
  await t.test('legacy balances cannot be increased without receipts',async()=>{await assert.rejects(save({...bill,paid:20}),/HMS_INVALID/);});
  await t.test('new receipts preserve the legacy opening balance',async()=>{
   const updated={...bill,paid:20,openingPaid:10,payments:[{id:'receipt',amount:1000,receivedAt:'2026-10-04T12:00:00Z',reference:''}]};
   await save(updated);assert.equal((await db.query("select records->0->>'openingPaid' as paid from public.hms_collections where name='billing'")).rows[0].paid,'10');
  });
 }finally{await db.close();}
});
