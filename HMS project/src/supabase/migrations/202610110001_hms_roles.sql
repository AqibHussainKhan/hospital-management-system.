-- Apply AFTER 202610040001_hms_setup.sql. Existing hospital records are preserved.
begin;
create table if not exists public.hms_memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','doctor','nurse','receptionist','lab_staff','pharmacist','cashier','hr','ward_incharge','ot_coordinator','department_head','staff')),
 department text not null default '', staff_id text, doctor_id text,
 ward_ids text[] not null default '{}', active boolean not null default true,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null
);
create unique index if not exists hms_member_staff on public.hms_memberships(staff_id) where staff_id is not null;
create unique index if not exists hms_member_doctor on public.hms_memberships(doctor_id) where doctor_id is not null;
insert into public.hms_memberships(user_id,role) select user_id,'admin' from public.hms_admins on conflict do nothing;
create table if not exists public.hms_role_permissions(role text not null, permission text not null, enabled boolean not null default true, primary key(role,permission));
create table if not exists public.hms_access_audit (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
 occurred_at timestamptz not null default now(), action text not null, subject text not null, details jsonb not null default '{}'
);
create table if not exists public.hms_work_items (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('clinical','prescriptions','vitals','roster','leave','approvals')),
 patient_id text, staff_id text, department text not null default '', data jsonb not null default '{}',
 status text not null, revision bigint not null default 1,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), decided_by uuid references auth.users(id), decision_reason text not null default ''
);
create index if not exists hms_work_patient on public.hms_work_items(patient_id,kind);
create index if not exists hms_work_staff on public.hms_work_items(staff_id,kind);
create table if not exists public.hms_profiles(user_id uuid primary key references auth.users(id) on delete cascade, phone text not null default '', bio text not null default '', updated_at timestamptz not null default now());
create table if not exists public.hms_settings(id boolean primary key default true check(id), data jsonb not null default '{"name":"MediCore Hospital","address":"","phone":"","email":"","departments":["General","Cardiology","Emergency","Laboratory","Pharmacy","Administration"]}');
insert into public.hms_settings(id) values(true) on conflict do nothing;
alter table public.hms_memberships enable row level security;
alter table public.hms_role_permissions enable row level security;
alter table public.hms_access_audit enable row level security;
alter table public.hms_work_items enable row level security;
alter table public.hms_profiles enable row level security;
alter table public.hms_settings enable row level security;
revoke all on public.hms_memberships,public.hms_role_permissions,public.hms_access_audit,public.hms_work_items,public.hms_profiles,public.hms_settings from public,anon,authenticated;

create or replace function public.hms_current_member() returns public.hms_memberships
language sql stable security definer set search_path='' as $$
 select m from public.hms_memberships m where m.user_id=auth.uid() and m.active
 and (m.role='admin' or exists(select 1 from public.hms_collections c,jsonb_array_elements(c.records) s where c.name='staff' and s->>'id'=m.staff_id and s->>'status'='Active' and s->>'department'=m.department))
 and (m.role<>'doctor' or exists(select 1 from public.hms_collections c,jsonb_array_elements(c.records) d where c.name='doctors' and d->>'id'=m.doctor_id and d->>'status'='Active' and d->>'department'=m.department));
$$;
create or replace function public.is_hospital_admin() returns boolean
language sql stable security definer set search_path='' as $$ select coalesce((public.hms_current_member()).role='admin',false); $$;
create or replace function public.hms_can(module_name text, action_name text default 'view') returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(m.role='admin' or exists(select 1 from public.hms_role_permissions p where p.role=m.role and p.permission=module_name||':'||action_name and p.enabled),false) from public.hms_current_member() m;
$$;
create or replace function public.hms_get_access() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare m public.hms_memberships; permissions jsonb;
begin
 m:=public.hms_current_member();
 if m.user_id is null then raise exception 'HMS_FORBIDDEN: active hospital membership required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(permission order by permission),'[]') into permissions from public.hms_role_permissions where role=m.role and enabled;
 return jsonb_build_object('userId',m.user_id,'role',m.role,'department',m.department,'staffId',m.staff_id,'doctorId',m.doctor_id,'wardIds',to_jsonb(m.ward_ids),'permissions',permissions,'version',m.updated_at::text);
end; $$;
create or replace function public.hms_collection_module(kind text) returns text language sql immutable set search_path='' as $$
 select case kind when 'tests' then 'laboratory' when 'medicines' then 'pharmacy' when 'surgeries' then 'operation-theater' when 'visits' then 'patient-analytics' else kind end;
$$;
create or replace function public.hms_patient_visible(p jsonb) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare m public.hms_memberships;
begin
 m:=public.hms_current_member(); if m.user_id is null then return false; end if;
 if m.role='admin' then return true; end if;
 if m.role in ('receptionist','cashier','ot_coordinator') then return true; end if;
 if m.role='doctor' then return nullif(p->>'doctorRef','')=m.doctor_id or exists(select 1 from public.hms_collections c,jsonb_array_elements(c.records) apt where c.name='appointments' and apt->>'patientRef'=p->>'id' and apt->>'doctorRef'=m.doctor_id and apt->>'status'<>'Cancelled' and apt->>'date'>=to_char(now() at time zone 'Asia/Karachi','YYYY-MM-DD')) or exists(select 1 from public.hms_collections c,jsonb_array_elements(c.records) surgery where c.name='surgeries' and surgery->>'patientRef'=p->>'id' and surgery->>'doctorRef'=m.doctor_id and surgery->>'status'<>'Cancelled' and surgery->>'date'>=to_char(now() at time zone 'Asia/Karachi','YYYY-MM-DD')); end if;
 if m.role in ('nurse','ward_incharge') then return p->>'status'='Admitted' and p->>'wardId'=any(m.ward_ids); end if;
 if m.role='department_head' then return m.department<>'' and p->>'department'=m.department; end if;
 if m.role='lab_staff' then return exists(select 1 from public.hms_collections c,jsonb_array_elements(c.records) t where c.name='tests' and t->>'patientRef'=p->>'id'); end if;
 if m.role='pharmacist' then return exists(select 1 from public.hms_work_items w where w.kind='prescriptions' and w.patient_id=p->>'id' and w.status in ('Issued','Partially Dispensed','Dispensed')); end if;
 
 return false;
end; $$;
create or replace function public.hms_row_visible(kind text, r jsonb) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare m public.hms_memberships; p jsonb; s jsonb;
begin
 m:=public.hms_current_member(); if m.user_id is null or public.hms_can(public.hms_collection_module(kind),'view') is not true then return false; end if;
 if m.role='admin' then return true; end if;
 if kind='patients' then return public.hms_patient_visible(r); end if;
 if kind='doctors' then return m.role<>'department_head' or r->>'department'=m.department; end if;
 if kind='medicines' then return m.role in ('pharmacist','doctor'); end if;
 if kind='wards' then
  if m.role in ('nurse','ward_incharge') then return r->>'id'=any(m.ward_ids); end if;
  if m.role='department_head' then return r->>'id'=any(m.ward_ids); end if;
  return m.role in ('receptionist','doctor','ot_coordinator');
 end if;
 if kind='staff' then return m.role='hr' or r->>'id'=m.staff_id or m.role='department_head' and r->>'department'=m.department; end if;
 if kind='attendance' then
  if m.role='hr' or r->>'staffId'=m.staff_id then return true; end if;
  select v into s from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='staff' and v->>'id'=r->>'staffId';
  return m.role='department_head' and s->>'department'=m.department;
 end if;
 if kind='billing' then return m.role='cashier'; end if;
 if kind in ('appointments','tests','visits','surgeries') then
  if kind='appointments' and m.role='receptionist' then return true; end if;
  if kind='surgeries' and m.role='ot_coordinator' then return true; end if;
  select v into p from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='patients' and v->>'id'=r->>'patientRef';
  if p is null then return false; end if;
  if kind in ('appointments','surgeries') and m.role='doctor' then return r->>'doctorRef'=m.doctor_id; end if;
  return public.hms_patient_visible(p);
 end if;
 return false;
end; $$;
create or replace function public.hms_project_row(kind text,r jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare role_name text; linked integer;
begin
 role_name:=(public.hms_current_member()).role;
 if kind='patients' and role_name in ('receptionist','lab_staff','pharmacist','cashier','ot_coordinator') then
  -- Clinical free text and unknown future clinical keys are never sent to these roles.
  return jsonb_build_object('id',r->'id','patientId',r->'patientId','name',r->'name','age',r->'age','gender',r->'gender','department',r->'department','phone',case when role_name in ('receptionist','cashier') then r->'phone' else '""'::jsonb end,'doctor',r->'doctor','status',r->'status','initials',r->'initials','registeredAt',r->'registeredAt','admittedAt',r->'admittedAt','updatedAt',r->'updatedAt','notes','') || case when r ? 'doctorRef' then jsonb_build_object('doctorRef',r->'doctorRef') else '{}' end || case when r ? 'wardId' then jsonb_build_object('wardId',r->'wardId') else '{}' end;
 end if;
 if kind='wards' and role_name<>'admin' then
  select count(*)::integer into linked from public.hms_collections c,jsonb_array_elements(c.records) p where c.name='patients' and p->>'wardId'=r->>'id' and p->>'status'='Admitted';
  return r||jsonb_build_object('actualOccupied',(r->>'occupied')::integer+linked);
 end if;
 return r;
end; $$;
create or replace function public.hms_read_collection(collection_name text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare rows jsonb; version bigint;
begin
 if (public.hms_current_member()).user_id is null then raise exception 'HMS_FORBIDDEN: membership required' using errcode='42501'; end if;
 select coalesce((select jsonb_agg(public.hms_project_row(collection_name,r) order by n) from jsonb_array_elements(c.records) with ordinality a(r,n) where public.hms_row_visible(collection_name,r)),'[]'),c.revision into rows,version from public.hms_collections c where c.name=collection_name;
 if version is null then raise exception 'HMS_INVALID: unknown collection'; end if;
 -- A disabled module returns no records, including when a shared component subscribes.
 return jsonb_build_object('records',rows,'revision',version);
end; $$;
create or replace function public.hms_prepare_collection(kind text, previous jsonb, incoming jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.hms_memberships; old jsonb; r jsonb; projected jsonb; result jsonb:='[]'; candidate jsonb; operation text; changed_keys text[];
begin
 m:=public.hms_current_member(); if m.user_id is null then raise exception 'HMS_FORBIDDEN: membership required' using errcode='42501'; end if;
 if jsonb_typeof(incoming) is distinct from 'array' or jsonb_array_length(incoming)>10000 or exists(select 1 from jsonb_array_elements(incoming) v where jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(v->'id') is distinct from 'string') or (select count(*)<>count(distinct v->>'id') from jsonb_array_elements(incoming) v) then raise exception 'HMS_INVALID: records'; end if;
 if m.role='admin' then return incoming; end if;
 for old in select value from jsonb_array_elements(previous) loop
  select value into r from jsonb_array_elements(incoming) where value->>'id'=old->>'id';
  if public.hms_row_visible(kind,old) is not true then
   if r is not null then raise exception 'HMS_FORBIDDEN: record outside scope' using errcode='42501'; end if;
   result:=result||jsonb_build_array(old); continue;
  end if;
  projected:=public.hms_project_row(kind,old);
  if kind='wards' then projected:=projected-'actualOccupied'; r:=r-'actualOccupied'; end if;
  if r=projected then result:=result||jsonb_build_array(old); continue; end if;
  operation:=case when r is null then 'delete' else 'edit' end;
  if public.hms_can(public.hms_collection_module(kind),operation) is not true then raise exception 'HMS_FORBIDDEN: action denied' using errcode='42501'; end if;
  -- Clinical and financial history cannot be deleted by staff.
  if r is null then raise exception 'HMS_FORBIDDEN: archive through administrator' using errcode='42501'; end if;
  select array_agg(key) into changed_keys from (select coalesce(a.key,b.key) key from jsonb_each(projected) a full join jsonb_each(r) b on a.key=b.key where a.value is distinct from b.value) diffs;
  if kind='patients' then
   if m.role='receptionist' then
    if not changed_keys<@array['patientId','name','age','gender','phone','department','doctor','doctorRef','status','wardId','initials','admittedAt','updatedAt'] then raise exception 'HMS_FORBIDDEN: registration fields only' using errcode='42501'; end if;
    candidate:=(case when r ? 'wardId' then old else old-'wardId' end)||(r-'notes');
   elsif m.role='ward_incharge' then
    if not changed_keys<@array['status','wardId','admittedAt','updatedAt'] then raise exception 'HMS_FORBIDDEN: admission fields only' using errcode='42501'; end if;
    candidate:=r;
   else raise exception 'HMS_FORBIDDEN: use clinical records' using errcode='42501'; end if;
  elsif kind='appointments' and m.role='doctor' then
   if not changed_keys<@array['status'] then raise exception 'HMS_FORBIDDEN: appointment status only' using errcode='42501'; end if; candidate:=r;
  elsif kind='tests' and m.role='lab_staff' then
   if not changed_keys<@array['status','sampleStatus','result','reportPath','completedAt'] then raise exception 'HMS_FORBIDDEN: result fields only' using errcode='42501'; end if; candidate:=r;
  elsif kind='wards' and m.role='ward_incharge' then
   if not changed_keys<@array['status','occupied'] then raise exception 'HMS_FORBIDDEN: ward status only' using errcode='42501'; end if; candidate:=r;
  elsif kind='billing' and coalesce((r->>'voided')::boolean,false) then raise exception 'HMS_FORBIDDEN: request invoice void approval' using errcode='42501';
  else candidate:=r; end if;
  if kind='wards' then candidate:=candidate-'actualOccupied'; end if;
  -- A permitted update cannot transfer a record out of the user's scope.
  if public.hms_row_visible(kind,candidate) is not true and not (kind='patients' and m.role='ward_incharge' and candidate->>'status'='Discharged' and candidate->>'wardId' is null) then raise exception 'HMS_FORBIDDEN: reassignment outside scope' using errcode='42501'; end if;
  result:=result||jsonb_build_array(candidate);
 end loop;
 for r in select value from jsonb_array_elements(incoming) loop
  if exists(select 1 from jsonb_array_elements(previous) v where v->>'id'=r->>'id') then continue; end if;
  if public.hms_can(public.hms_collection_module(kind),'add') is not true or public.hms_row_visible(kind,r) is not true then raise exception 'HMS_FORBIDDEN: cannot add this record' using errcode='42501'; end if;
  if kind='tests' and m.role='doctor' and (r->>'status'<>'Pending' or coalesce(r->>'result','')<>'' or r ? 'reportPath' or r ? 'completedAt' or coalesce(r->>'sampleStatus','Pending')<>'Pending') then raise exception 'HMS_FORBIDDEN: request pending tests only' using errcode='42501'; end if;
  if kind='patients' and m.role='receptionist' and exists(select 1 from jsonb_object_keys(r) key where key not in ('id','patientId','name','age','gender','phone','department','doctor','doctorRef','status','wardId','initials','registeredAt','admittedAt','updatedAt','notes')) then raise exception 'HMS_FORBIDDEN: registration fields only' using errcode='42501'; end if;
  if kind='patients' and (m.role<>'receptionist' or coalesce(r->>'notes','')<>'') then raise exception 'HMS_FORBIDDEN: registration role required' using errcode='42501'; end if;
  if kind='billing' and (coalesce((r->>'voided')::boolean,false) or (r->>'paid')::numeric<>0) then raise exception 'HMS_FORBIDDEN: create unpaid invoice then record receipt' using errcode='42501'; end if;
  result:=result||jsonb_build_array(r);
 end loop;
 return result;
end; $$;
create or replace function public.hms_list_users() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('userId',u.id,'email',u.email,'role',coalesce(m.role,'unassigned'),'department',coalesce(m.department,''),'staffId',m.staff_id,'doctorId',m.doctor_id,'wardIds',coalesce(to_jsonb(m.ward_ids),'[]'),'active',coalesce(m.active,false),'version',m.updated_at::text) order by u.email),'[]') from auth.users u left join public.hms_memberships m on m.user_id=u.id);
end; $$;
create or replace function public.hms_set_membership(target_user uuid, role_name text, department_name text, staff_record text, doctor_record text, assigned_wards text[], is_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare s jsonb; d jsonb; w text;
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(846120261004::bigint);
 if role_name not in ('admin','doctor','nurse','receptionist','lab_staff','pharmacist','cashier','hr','ward_incharge','ot_coordinator','department_head','staff') or is_active is null or department_name is null or length(department_name)>200 then raise exception 'HMS_INVALID: membership'; end if;
 if target_user=auth.uid() and (role_name<>'admin' or not is_active) then raise exception 'HMS_INVALID: ask another administrator to change your access'; end if;
 if not exists(select 1 from auth.users where id=target_user) then raise exception 'HMS_INVALID: account not found'; end if;
 if exists(select 1 from public.hms_memberships where user_id=target_user and role='admin' and active) and (role_name<>'admin' or not is_active) and (select count(*) from public.hms_memberships where role='admin' and active)<=1 then raise exception 'HMS_INVALID: keep one active administrator'; end if;
 if role_name<>'admin' then
  select v into s from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='staff' and v->>'id'=staff_record and (v->>'status'='Active' or not is_active);
  if s is null or department_name<>s->>'department' then raise exception 'HMS_INVALID: choose active staff and matching department'; end if;
 end if;
 if role_name='doctor' then
  select v into d from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='doctors' and v->>'id'=doctor_record and (v->>'status'='Active' or not is_active);
  if d is null or d->>'department'<>department_name then raise exception 'HMS_INVALID: choose active doctor in this department'; end if;
 elsif doctor_record is not null then raise exception 'HMS_INVALID: doctor link belongs to doctor role'; end if;
 if role_name in ('nurse','ward_incharge') and coalesce(cardinality(assigned_wards),0)=0 then raise exception 'HMS_INVALID: assign at least one ward'; end if;
 foreach w in array coalesce(assigned_wards,'{}') loop
  if not exists(select 1 from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='wards' and v->>'id'=w) then raise exception 'HMS_INVALID: ward link'; end if;
 end loop;
 insert into public.hms_memberships(user_id,role,department,staff_id,doctor_id,ward_ids,active,updated_by) values(target_user,role_name,department_name,staff_record,doctor_record,coalesce(assigned_wards,'{}'),is_active,auth.uid()) on conflict(user_id) do update set role=excluded.role,department=excluded.department,staff_id=excluded.staff_id,doctor_id=excluded.doctor_id,ward_ids=excluded.ward_ids,active=excluded.active,updated_at=clock_timestamp(),updated_by=auth.uid();
 insert into public.hms_access_audit(actor_id,action,subject,details) values(auth.uid(),'membership',target_user::text,jsonb_build_object('role',role_name,'department',department_name,'active',is_active));
end; $$;
create or replace function public.hms_get_permissions() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(p) order by role,permission),'[]') from public.hms_role_permissions p);
end; $$;
create or replace function public.hms_set_permission(role_name text, permission_name text, is_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 if role_name='admin' or role_name not in ('doctor','nurse','receptionist','lab_staff','pharmacist','cashier','hr','ward_incharge','ot_coordinator','department_head','staff') or permission_name !~ '^(patients|doctors|appointments|patient-analytics|laboratory|pharmacy|wards|operation-theater|staff|attendance|billing|reports|clinical|prescriptions|vitals|roster|leave|approvals):(view|add|edit|delete|export|approve)$' or is_enabled is null then raise exception 'HMS_INVALID: permission'; end if;
 insert into public.hms_role_permissions(role,permission,enabled) values(role_name,permission_name,is_enabled) on conflict(role,permission) do update set enabled=excluded.enabled;
 insert into public.hms_access_audit(actor_id,action,subject,details) values(auth.uid(),'permission',role_name,jsonb_build_object('permission',permission_name,'enabled',is_enabled));
end; $$;
create or replace function public.hms_hospital_settings(next_settings jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; key text;
begin
 if (public.hms_current_member()).user_id is null then raise exception 'HMS_FORBIDDEN: membership required' using errcode='42501'; end if;
 if next_settings is not null then
  if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
  if jsonb_typeof(next_settings) is distinct from 'object' then raise exception 'HMS_INVALID: settings'; end if;
  foreach key in array array['name','address','phone','email'] loop
   if jsonb_typeof(next_settings->key) is distinct from 'string' or length(next_settings->>key)>500 then raise exception 'HMS_INVALID: settings fields'; end if;
  end loop;
  if trim(next_settings->>'name')='' or jsonb_typeof(next_settings->'departments') is distinct from 'array' or jsonb_array_length(next_settings->'departments')>100 or exists(select 1 from jsonb_array_elements(next_settings->'departments') v where jsonb_typeof(v)<>'string' or length(trim(v#>>'{}'))=0 or length(v#>>'{}')>200) then raise exception 'HMS_INVALID: departments'; end if;
  update public.hms_settings set data=next_settings where id;
  insert into public.hms_access_audit(actor_id,action,subject) values(auth.uid(),'settings','hospital');
 end if;
 select data into result from public.hms_settings where id; return result;
end; $$;
create or replace function public.hms_personal_profile(next_phone text default null,next_bio text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if (public.hms_current_member()).user_id is null then raise exception 'HMS_FORBIDDEN: membership required' using errcode='42501'; end if;
 if next_phone is not null or next_bio is not null then
  if next_phone is null or next_bio is null or length(next_phone)>100 or length(next_bio)>1000 then raise exception 'HMS_INVALID: profile'; end if;
  insert into public.hms_profiles(user_id,phone,bio) values(auth.uid(),next_phone,next_bio) on conflict(user_id) do update set phone=excluded.phone,bio=excluded.bio,updated_at=now();
 end if;
 return coalesce((select jsonb_build_object('phone',phone,'bio',bio) from public.hms_profiles where user_id=auth.uid()),'{"phone":"","bio":""}');
end; $$;
create or replace function public.hms_audit_log() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(a) order by occurred_at desc),'[]') from (select a.id::text,'records' category,u.email actor,a.occurred_at,a.action,a.collection subject,jsonb_build_object('revision',a.revision,'changedIds',a.changed_ids) details from public.hms_audit a left join auth.users u on u.id=a.actor_id union all select a.id::text,'access',u.email,a.occurred_at,a.action,a.subject,a.details from public.hms_access_audit a left join auth.users u on u.id=a.actor_id order by occurred_at desc limit 500) a);
end; $$;

-- Defaults only: rerunning never overwrites administrator permission choices.
insert into public.hms_role_permissions(role,permission,enabled) values
('admin','patients:view',true),
('admin','patients:add',true),
('admin','patients:edit',true),
('admin','patients:delete',true),
('admin','patients:export',true),
('admin','patients:approve',true),
('admin','doctors:view',true),
('admin','doctors:add',true),
('admin','doctors:edit',true),
('admin','doctors:delete',true),
('admin','doctors:export',true),
('admin','doctors:approve',true),
('admin','appointments:view',true),
('admin','appointments:add',true),
('admin','appointments:edit',true),
('admin','appointments:delete',true),
('admin','appointments:export',true),
('admin','appointments:approve',true),
('admin','patient-analytics:view',true),
('admin','patient-analytics:add',true),
('admin','patient-analytics:edit',true),
('admin','patient-analytics:delete',true),
('admin','patient-analytics:export',true),
('admin','patient-analytics:approve',true),
('admin','laboratory:view',true),
('admin','laboratory:add',true),
('admin','laboratory:edit',true),
('admin','laboratory:delete',true),
('admin','laboratory:export',true),
('admin','laboratory:approve',true),
('admin','pharmacy:view',true),
('admin','pharmacy:add',true),
('admin','pharmacy:edit',true),
('admin','pharmacy:delete',true),
('admin','pharmacy:export',true),
('admin','pharmacy:approve',true),
('admin','wards:view',true),
('admin','wards:add',true),
('admin','wards:edit',true),
('admin','wards:delete',true),
('admin','wards:export',true),
('admin','wards:approve',true),
('admin','operation-theater:view',true),
('admin','operation-theater:add',true),
('admin','operation-theater:edit',true),
('admin','operation-theater:delete',true),
('admin','operation-theater:export',true),
('admin','operation-theater:approve',true),
('admin','staff:view',true),
('admin','staff:add',true),
('admin','staff:edit',true),
('admin','staff:delete',true),
('admin','staff:export',true),
('admin','staff:approve',true),
('admin','attendance:view',true),
('admin','attendance:add',true),
('admin','attendance:edit',true),
('admin','attendance:delete',true),
('admin','attendance:export',true),
('admin','attendance:approve',true),
('admin','billing:view',true),
('admin','billing:add',true),
('admin','billing:edit',true),
('admin','billing:delete',true),
('admin','billing:export',true),
('admin','billing:approve',true),
('admin','reports:view',true),
('admin','reports:add',true),
('admin','reports:edit',true),
('admin','reports:delete',true),
('admin','reports:export',true),
('admin','reports:approve',true),
('admin','clinical:view',true),
('admin','clinical:add',true),
('admin','clinical:edit',true),
('admin','clinical:delete',true),
('admin','clinical:export',true),
('admin','clinical:approve',true),
('admin','prescriptions:view',true),
('admin','prescriptions:add',true),
('admin','prescriptions:edit',true),
('admin','prescriptions:delete',true),
('admin','prescriptions:export',true),
('admin','prescriptions:approve',true),
('admin','vitals:view',true),
('admin','vitals:add',true),
('admin','vitals:edit',true),
('admin','vitals:delete',true),
('admin','vitals:export',true),
('admin','vitals:approve',true),
('admin','roster:view',true),
('admin','roster:add',true),
('admin','roster:edit',true),
('admin','roster:delete',true),
('admin','roster:export',true),
('admin','roster:approve',true),
('admin','leave:view',true),
('admin','leave:add',true),
('admin','leave:edit',true),
('admin','leave:delete',true),
('admin','leave:export',true),
('admin','leave:approve',true),
('admin','approvals:view',true),
('admin','approvals:add',true),
('admin','approvals:edit',true),
('admin','approvals:delete',true),
('admin','approvals:export',true),
('admin','approvals:approve',true),
('admin','users:view',true),
('admin','users:add',true),
('admin','users:edit',true),
('admin','users:delete',true),
('admin','users:export',true),
('admin','users:approve',true),
('admin','audit:view',true),
('admin','audit:add',true),
('admin','audit:edit',true),
('admin','audit:delete',true),
('admin','audit:export',true),
('admin','audit:approve',true),
('admin','hospital-settings:view',true),
('admin','hospital-settings:add',true),
('admin','hospital-settings:edit',true),
('admin','hospital-settings:delete',true),
('admin','hospital-settings:export',true),
('admin','hospital-settings:approve',true),
('doctor','attendance:view',true),
('doctor','roster:view',true),
('doctor','leave:view',true),
('doctor','leave:add',true),
('doctor','leave:edit',true),
('doctor','approvals:view',true),
('doctor','approvals:add',true),
('doctor','patients:view',true),
('doctor','doctors:view',true),
('doctor','appointments:view',true),
('doctor','laboratory:view',true),
('doctor','pharmacy:view',true),
('doctor','wards:view',true),
('doctor','operation-theater:view',true),
('doctor','patient-analytics:view',true),
('doctor','clinical:view',true),
('doctor','clinical:add',true),
('doctor','clinical:edit',true),
('doctor','clinical:export',true),
('doctor','prescriptions:view',true),
('doctor','prescriptions:add',true),
('doctor','prescriptions:edit',true),
('doctor','prescriptions:export',true),
('doctor','vitals:view',true),
('doctor','laboratory:add',true),
('doctor','appointments:edit',true),
('nurse','attendance:view',true),
('nurse','roster:view',true),
('nurse','leave:view',true),
('nurse','leave:add',true),
('nurse','leave:edit',true),
('nurse','approvals:view',true),
('nurse','approvals:add',true),
('nurse','patients:view',true),
('nurse','doctors:view',true),
('nurse','wards:view',true),
('nurse','laboratory:view',true),
('nurse','clinical:view',true),
('nurse','prescriptions:view',true),
('nurse','clinical:add',true),
('nurse','vitals:view',true),
('nurse','vitals:add',true),
('nurse','vitals:edit',true),
('nurse','vitals:export',true),
('receptionist','attendance:view',true),
('receptionist','roster:view',true),
('receptionist','leave:view',true),
('receptionist','leave:add',true),
('receptionist','leave:edit',true),
('receptionist','approvals:view',true),
('receptionist','approvals:add',true),
('receptionist','patients:view',true),
('receptionist','patients:add',true),
('receptionist','patients:edit',true),
('receptionist','patients:export',true),
('receptionist','appointments:view',true),
('receptionist','appointments:add',true),
('receptionist','appointments:edit',true),
('receptionist','appointments:export',true),
('receptionist','doctors:view',true),
('receptionist','wards:view',true),
('lab_staff','attendance:view',true),
('lab_staff','roster:view',true),
('lab_staff','leave:view',true),
('lab_staff','leave:add',true),
('lab_staff','leave:edit',true),
('lab_staff','approvals:view',true),
('lab_staff','approvals:add',true),
('lab_staff','patients:view',true),
('lab_staff','laboratory:view',true),
('lab_staff','laboratory:edit',true),
('lab_staff','laboratory:export',true),
('pharmacist','attendance:view',true),
('pharmacist','roster:view',true),
('pharmacist','leave:view',true),
('pharmacist','leave:add',true),
('pharmacist','leave:edit',true),
('pharmacist','approvals:view',true),
('pharmacist','approvals:add',true),
('pharmacist','pharmacy:view',true),
('pharmacist','pharmacy:add',true),
('pharmacist','pharmacy:edit',true),
('pharmacist','pharmacy:export',true),
('pharmacist','patients:view',true),
('pharmacist','prescriptions:view',true),
('pharmacist','prescriptions:edit',true),
('pharmacist','prescriptions:export',true),
('cashier','attendance:view',true),
('cashier','roster:view',true),
('cashier','leave:view',true),
('cashier','leave:add',true),
('cashier','leave:edit',true),
('cashier','approvals:view',true),
('cashier','approvals:add',true),
('cashier','billing:view',true),
('cashier','billing:add',true),
('cashier','billing:edit',true),
('cashier','billing:export',true),
('cashier','patients:view',true),
('cashier','reports:view',true),
('cashier','reports:export',true),
('hr','attendance:view',true),
('hr','roster:view',true),
('hr','leave:view',true),
('hr','leave:add',true),
('hr','leave:edit',true),
('hr','approvals:view',true),
('hr','approvals:add',true),
('hr','staff:view',true),
('hr','staff:add',true),
('hr','staff:edit',true),
('hr','staff:export',true),
('hr','attendance:add',true),
('hr','attendance:edit',true),
('hr','attendance:export',true),
('hr','roster:add',true),
('hr','roster:edit',true),
('hr','roster:export',true),
('hr','reports:view',true),
('hr','reports:export',true),
('hr','leave:approve',true),
('hr','approvals:approve',true),
('ward_incharge','attendance:view',true),
('ward_incharge','roster:view',true),
('ward_incharge','leave:view',true),
('ward_incharge','leave:add',true),
('ward_incharge','leave:edit',true),
('ward_incharge','approvals:view',true),
('ward_incharge','approvals:add',true),
('ward_incharge','patients:view',true),
('ward_incharge','wards:view',true),
('ward_incharge','doctors:view',true),
('ward_incharge','clinical:view',true),
('ward_incharge','vitals:view',true),
('ward_incharge','prescriptions:view',true),
('ward_incharge','patients:edit',true),
('ward_incharge','wards:edit',true),
('ot_coordinator','attendance:view',true),
('ot_coordinator','roster:view',true),
('ot_coordinator','leave:view',true),
('ot_coordinator','leave:add',true),
('ot_coordinator','leave:edit',true),
('ot_coordinator','approvals:view',true),
('ot_coordinator','approvals:add',true),
('ot_coordinator','operation-theater:view',true),
('ot_coordinator','operation-theater:add',true),
('ot_coordinator','operation-theater:edit',true),
('ot_coordinator','operation-theater:export',true),
('ot_coordinator','patients:view',true),
('ot_coordinator','doctors:view',true),
('ot_coordinator','wards:view',true),
('department_head','attendance:view',true),
('department_head','roster:view',true),
('department_head','leave:view',true),
('department_head','leave:add',true),
('department_head','leave:edit',true),
('department_head','approvals:view',true),
('department_head','approvals:add',true),
('department_head','patients:view',true),
('department_head','doctors:view',true),
('department_head','appointments:view',true),
('department_head','laboratory:view',true),
('department_head','wards:view',true),
('department_head','operation-theater:view',true),
('department_head','staff:view',true),
('department_head','patient-analytics:view',true),
('department_head','reports:view',true),
('department_head','clinical:view',true),
('department_head','prescriptions:view',true),
('department_head','vitals:view',true),
('department_head','roster:add',true),
('department_head','roster:edit',true),
('department_head','roster:export',true),
('department_head','leave:approve',true),
('department_head','approvals:approve',true),
('department_head','reports:export',true),
('staff','attendance:view',true),
('staff','roster:view',true),
('staff','leave:view',true),
('staff','leave:add',true),
('staff','leave:edit',true),
('staff','approvals:view',true),
('staff','approvals:add',true)
on conflict do nothing;

-- Preserve the original scheduling, capacity, finance and reference checks.
create or replace function public.hms_save_collection(collection_name text, expected_revision bigint, next_records jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare previous jsonb; current_revision bigint; r jsonb; old jsonb; payment jsonb; changed jsonb;
begin
 if (public.hms_current_member()).user_id is null then raise exception 'HMS_FORBIDDEN: membership required' using errcode='42501'; end if;
 -- Serialize cross-collection constraints as well as per-collection revisions.
 perform pg_advisory_xact_lock(846120261004::bigint);
 select records,revision into previous,current_revision from public.hms_collections where name=collection_name for update;
 if not found then raise exception 'HMS_INVALID: unknown collection'; end if;
 if expected_revision is null or current_revision<>expected_revision then raise exception 'HMS_CONFLICT'; end if;
 next_records:=public.hms_prepare_collection(collection_name,previous,next_records);
 if public.hms_valid_records(collection_name,next_records) is not true then raise exception 'HMS_INVALID: record values'; end if;
 for r in select value from jsonb_array_elements(next_records) loop
  select value into old from jsonb_array_elements(previous) where value->>'id'=r->>'id';
  if old is null then
   if collection_name in ('appointments','tests','visits','surgeries') and nullif(r->>'patientRef','') is null then raise exception 'HMS_INVALID: select registered patient'; end if;
   if collection_name in ('patients','appointments','surgeries') and nullif(r->>'doctorRef','') is null then raise exception 'HMS_INVALID: select doctor'; end if;
  end if;
  if collection_name='patients' and r->>'status'='Admitted' and (old is null or old->>'status'<>'Admitted') and nullif(r->>'wardId','') is null then raise exception 'HMS_INVALID: select ward'; end if;
 end loop;
 if collection_name='billing' then
  for r in select value from jsonb_array_elements(next_records) loop
   if not exists(select 1 from jsonb_array_elements(previous) v where v->>'id'=r->>'id') and (not (r ? 'payments') or coalesce((r->>'openingPaid')::numeric,0)<>0) then raise exception 'HMS_INVALID: new invoices require a receipt ledger'; end if;
  end loop;
  for old in select value from jsonb_array_elements(previous) loop
   select value into r from jsonb_array_elements(next_records) where value->>'id'=old->>'id';
   if r is null then raise exception 'HMS_INVALID: void unpaid invoices instead of deleting history'; end if;
   if coalesce((old->>'voided')::boolean,false) and r<>old then raise exception 'HMS_INVALID: voided invoice is immutable'; end if;
   if (old->>'paid')::numeric>0 then
    if (r->>'amount',r->>'patientId',r->>'patient',r->>'date',r->>'service') is distinct from (old->>'amount',old->>'patientId',old->>'patient',old->>'date',old->>'service') or coalesce((r->>'voided')::boolean,false) then raise exception 'HMS_INVALID: paid invoice is immutable'; end if;
   end if;
   if not (r ? 'payments') and (r->>'paid')::numeric<>(old->>'paid')::numeric then raise exception 'HMS_INVALID: record dated receipt'; end if;
   if (r->>'paid')::numeric < (old->>'paid')::numeric then raise exception 'HMS_INVALID: payment balance cannot decrease'; end if;
   if old ? 'payments' then
    if not (r ? 'payments') or coalesce((r->>'openingPaid')::numeric,0)<>coalesce((old->>'openingPaid')::numeric,0) then raise exception 'HMS_INVALID: opening balance'; end if;
    for payment in select value from jsonb_array_elements(old->'payments') loop
     if not exists(select 1 from jsonb_array_elements(r->'payments') p where p=payment) then raise exception 'HMS_INVALID: existing receipt is immutable'; end if;
    end loop;
   elsif r ? 'payments' and coalesce((r->>'openingPaid')::numeric,0)<>(old->>'paid')::numeric then raise exception 'HMS_INVALID: preserve undated balance'; end if;
  end loop;
 end if;
 if next_records=previous then return current_revision; end if;
 select coalesce(jsonb_agg(coalesce(a.v->>'id',b.v->>'id')),'[]'::jsonb) into changed from jsonb_array_elements(previous) a(v) full join jsonb_array_elements(next_records) b(v) on a.v->>'id'=b.v->>'id' where a.v is distinct from b.v;
 update public.hms_collections set records=next_records,revision=revision+1,updated_at=now(),updated_by=auth.uid() where name=collection_name;
 perform public.hms_check_references();
 insert into public.hms_audit(actor_id,collection,revision,changed_ids,action) values(auth.uid(),collection_name,current_revision+1,changed,'save');
 return current_revision+1;
end; $$;
revoke all on function public.hms_save_collection(text,bigint,jsonb) from public, anon;
grant execute on function public.hms_save_collection(text,bigint,jsonb) to authenticated;

create or replace function public.hms_work_visible(w public.hms_work_items) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare m public.hms_memberships; p jsonb; s jsonb;
begin
 m:=public.hms_current_member(); if m.user_id is null or public.hms_can(w.kind,'view') is not true then return false; end if;
 if m.role='admin' then return true; end if;
 if w.kind in ('clinical','vitals') and m.role not in ('doctor','nurse','ward_incharge','department_head') then return false; end if;
 if w.kind='prescriptions' and m.role not in ('doctor','nurse','pharmacist','ward_incharge','department_head') then return false; end if;
 if w.kind in ('clinical','prescriptions','vitals') then
  select v into p from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='patients' and v->>'id'=w.patient_id;
  return p is not null and public.hms_patient_visible(p);
 end if;
 if w.created_by=auth.uid() or w.staff_id=m.staff_id then return true; end if;
 if w.kind='approvals' and w.data->>'type'='billing_void' then return false; end if;
 if m.role='hr' then return true; end if;
 select v into s from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='staff' and v->>'id'=w.staff_id;
 return m.role='department_head' and s->>'department'=m.department;
end; $$;
drop function if exists public.hms_list_work(text,timestamptz);
create or replace function public.hms_list_work(work_kind text, before_time timestamptz default null, patient_filter text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if (public.hms_current_member()).user_id is null then raise exception 'HMS_FORBIDDEN: membership required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(w)||jsonb_build_object('author',coalesce((select s->>'name' from public.hms_memberships m,public.hms_collections c,jsonb_array_elements(c.records) s where m.user_id=w.created_by and c.name='staff' and s->>'id'=m.staff_id),(select email from auth.users where id=w.created_by))) order by created_at desc,id),'[]') from (select * from public.hms_work_items where kind=work_kind and (patient_filter is null or patient_id=patient_filter) and (before_time is null or created_at<before_time) and public.hms_work_visible(hms_work_items) order by created_at desc,id limit 1000) w);
end; $$;
create or replace function public.hms_save_work(work_id uuid, work_kind text, expected_revision bigint, patient_record text, staff_record text, next_data jsonb, next_status text) returns uuid
language plpgsql security definer set search_path='' as $$
declare m public.hms_memberships; old public.hms_work_items; p jsonb; s jsonb; medicine jsonb; target jsonb; result uuid; field text; rows jsonb; candidate jsonb;
begin
 m:=public.hms_current_member(); if m.user_id is null then raise exception 'HMS_FORBIDDEN: membership required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(846120261004::bigint);
 if work_id is not null then
  select * into old from public.hms_work_items where id=work_id for update;
  if old.id is null or public.hms_work_visible(old) is not true then raise exception 'HMS_FORBIDDEN: record outside scope' using errcode='42501'; end if;
  if expected_revision is null or old.revision<>expected_revision then raise exception 'HMS_CONFLICT'; end if;
  if old.kind<>work_kind or old.patient_id is distinct from patient_record or old.staff_id is distinct from staff_record then raise exception 'HMS_INVALID: immutable record identity'; end if;
 end if;
 if public.hms_can(work_kind,case when old.id is null then 'add' else 'edit' end) is not true then raise exception 'HMS_FORBIDDEN: action denied' using errcode='42501'; end if;
 if jsonb_typeof(next_data) is distinct from 'object' or octet_length(next_data::text)>20000 or exists(select 1 from jsonb_each(next_data) e where jsonb_typeof(e.value)='string' and length(e.value#>>'{}')>5000) then raise exception 'HMS_INVALID: work values'; end if;
 if work_kind in ('clinical','prescriptions','vitals') then
  select v into p from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='patients' and v->>'id'=patient_record;
  if p is null or public.hms_patient_visible(p) is not true then raise exception 'HMS_FORBIDDEN: patient outside scope' using errcode='42501'; end if;
  if old.id is not null then raise exception 'HMS_INVALID: clinical history is append only; add a correction'; end if;
  if work_kind='clinical' then
   if m.role not in ('admin','doctor','nurse') or next_status<>'Final' or jsonb_typeof(next_data->'body') is distinct from 'string' or trim(next_data->>'body')='' then raise exception 'HMS_INVALID: clinical note'; end if;
   next_data:=jsonb_build_object('body',next_data->>'body','category',case when m.role='nurse' then 'Nursing note' else 'Clinical note' end);
  elsif work_kind='prescriptions' then
   if m.role not in ('admin','doctor') or next_status<>'Issued' or public.hms_integer(next_data->'quantity') is not true or (next_data->>'quantity')::numeric not between 1 and 1000 or jsonb_typeof(next_data->'instructions') is distinct from 'string' or trim(next_data->>'instructions')='' then raise exception 'HMS_INVALID: prescription'; end if;
   select v into medicine from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='medicines' and v->>'id'=next_data->>'medicineId';
   if medicine is null then raise exception 'HMS_INVALID: choose inventory medicine'; end if;
   next_data:=jsonb_build_object('medicineId',medicine->>'id','medicine',medicine->>'name','quantity',(next_data->>'quantity')::integer,'instructions',next_data->>'instructions','dispensed',0,'receipts','[]'::jsonb);
  else
   if m.role not in ('admin','nurse') or next_status<>'Recorded' or jsonb_typeof(next_data->'measuredAt') is distinct from 'string' or public.hms_valid_time(next_data->>'measuredAt') is not true then raise exception 'HMS_INVALID: vitals'; end if;
   foreach field in array array['temperature','pulse','systolic','diastolic','oxygen'] loop
    if jsonb_typeof(next_data->field) is distinct from 'number' then raise exception 'HMS_INVALID: vital numbers'; end if;
   end loop;
   if (next_data->>'temperature')::numeric not between 20 and 50 or (next_data->>'pulse')::numeric not between 0 and 300 or (next_data->>'systolic')::numeric not between 0 and 400 or (next_data->>'diastolic')::numeric not between 0 and 300 or (next_data->>'oxygen')::numeric not between 0 and 100 then raise exception 'HMS_INVALID: vital range'; end if;
  end if;
  staff_record:=m.staff_id;
 elsif work_kind in ('roster','leave','approvals') then
  if patient_record is not null then raise exception 'HMS_INVALID: workforce patient reference'; end if;
  select v into s from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='staff' and v->>'id'=staff_record and v->>'status'='Active';
  if s is null then raise exception 'HMS_INVALID: active staff record required'; end if;
  if work_kind='roster' then
   if m.role not in ('admin','hr','department_head') or m.role='department_head' and s->>'department'<>m.department then raise exception 'HMS_FORBIDDEN: team outside scope' using errcode='42501'; end if;
   if next_status not in ('Scheduled','Cancelled') or public.hms_valid_date(next_data->>'date') is not true or public.hms_minutes(next_data->>'start')<0 or public.hms_minutes(next_data->>'end')<0 or jsonb_typeof(next_data->'nextDay') is distinct from 'boolean' or (public.hms_minutes(next_data->>'end')-public.hms_minutes(next_data->>'start')+case when (next_data->>'nextDay')::boolean then 1440 else 0 end) not between 1 and 1440 then raise exception 'HMS_INVALID: shift'; end if;
   if next_status='Scheduled' and exists(select 1 from public.hms_work_items w where w.kind='roster' and w.status='Scheduled' and w.staff_id=staff_record and w.id is distinct from work_id and ((w.data->>'date')::date+(w.data->>'start')::time, (w.data->>'date')::date+(w.data->>'end')::time+case when (w.data->>'nextDay')::boolean then interval '1 day' else interval '0' end) overlaps ((next_data->>'date')::date+(next_data->>'start')::time,(next_data->>'date')::date+(next_data->>'end')::time+case when (next_data->>'nextDay')::boolean then interval '1 day' else interval '0' end)) then raise exception 'HMS_INVALID: overlapping staff shift'; end if;
  elsif work_kind='leave' then
   if staff_record is distinct from m.staff_id then raise exception 'HMS_FORBIDDEN: submit your own leave request' using errcode='42501'; end if;
   if old.id is null then
    if next_status<>'Pending' or public.hms_valid_date(next_data->>'from') is not true or public.hms_valid_date(next_data->>'to') is not true or next_data->>'from'>next_data->>'to' or jsonb_typeof(next_data->'reason') is distinct from 'string' or trim(next_data->>'reason')='' then raise exception 'HMS_INVALID: leave dates and reason'; end if;
    if exists(select 1 from public.hms_work_items w where w.kind='leave' and w.staff_id=staff_record and w.status in ('Pending','Approved') and (w.data->>'from')::date<=(next_data->>'to')::date and (next_data->>'from')::date<=(w.data->>'to')::date) then raise exception 'HMS_INVALID: overlapping leave request'; end if;
   elsif old.status<>'Pending' or next_status<>'Cancelled' or old.data<>next_data or old.created_by<>auth.uid() then raise exception 'HMS_INVALID: only pending requests can be cancelled'; end if;
  else
   if old.id is not null then raise exception 'HMS_INVALID: approval request cannot be edited'; end if;
   if next_status<>'Pending' or jsonb_typeof(next_data->'reason') is distinct from 'string' or trim(next_data->>'reason')='' then raise exception 'HMS_INVALID: approval reason'; end if;
   if next_data->>'type'='attendance' then
    if staff_record is distinct from m.staff_id then raise exception 'HMS_FORBIDDEN: own attendance request required' using errcode='42501'; end if;
    select v into target from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='attendance' and v->>'id'=next_data->>'targetId' and v->>'staffId'=m.staff_id;
    if target is null then raise exception 'HMS_INVALID: select own attendance entry'; end if;
    candidate:=target||jsonb_build_object('status',next_data->>'status','checkIn',next_data->>'checkIn','checkOut',next_data->>'checkOut','nextDay',next_data->'nextDay');
    if public.hms_valid_records('attendance',jsonb_build_array(candidate)) is not true then raise exception 'HMS_INVALID: attendance correction'; end if;
   elsif next_data->>'type'='billing_void' then
    if m.role not in ('admin','cashier') then raise exception 'HMS_FORBIDDEN: billing role required' using errcode='42501'; end if;
    select v into target from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='billing' and v->>'id'=next_data->>'targetId' and (v->>'paid')::numeric=0 and not coalesce((v->>'voided')::boolean,false);
    if target is null then raise exception 'HMS_INVALID: choose unpaid active invoice'; end if;
    candidate:=target||jsonb_build_object('voided',true,'voidReason',next_data->>'reason');
   else raise exception 'HMS_INVALID: approval type'; end if;
   if exists(select 1 from public.hms_work_items w where w.kind='approvals' and w.status='Pending' and w.data->>'type'=next_data->>'type' and w.data->>'targetId'=next_data->>'targetId') then raise exception 'HMS_INVALID: a request is already pending'; end if;
   next_data:=jsonb_build_object('type',next_data->>'type','targetId',target->>'id','reason',next_data->>'reason','original',target,'proposed',candidate);
  end if;
 else raise exception 'HMS_INVALID: work kind'; end if;
 next_data:=next_data || case when p is not null then jsonb_build_object('patientName',p->>'name') else '{}'::jsonb end || case when s is not null then jsonb_build_object('staffName',s->>'name') else '{}'::jsonb end;
 if old.id is null then
  insert into public.hms_work_items(kind,patient_id,staff_id,department,data,status,created_by) values(work_kind,patient_record,staff_record,coalesce(p->>'department',s->>'department',m.department),next_data,next_status,auth.uid()) returning id into result;
 else
  update public.hms_work_items set data=next_data,status=next_status,revision=revision+1,updated_at=now() where id=old.id; result:=old.id;
 end if;
 insert into public.hms_access_audit(actor_id,action,subject,details) values(auth.uid(),'work_saved',result::text,jsonb_build_object('kind',work_kind,'status',next_status));
 return result;
end; $$;
create or replace function public.hms_decide_work(work_id uuid,expected_revision bigint,decision text,reason text) returns void
language plpgsql security definer set search_path='' as $$
declare m public.hms_memberships; w public.hms_work_items; rows jsonb; current_row jsonb; candidate jsonb; collection_name text; version bigint;
begin
 m:=public.hms_current_member(); perform pg_advisory_xact_lock(846120261004::bigint);
 select * into w from public.hms_work_items where id=work_id for update;
 if w.id is null or w.kind not in ('leave','approvals') or public.hms_work_visible(w) is not true or public.hms_can(w.kind,'approve') is not true then raise exception 'HMS_FORBIDDEN: approval denied' using errcode='42501'; end if;
 if w.created_by=auth.uid() or w.staff_id=m.staff_id then raise exception 'HMS_FORBIDDEN: another approver must decide your request' using errcode='42501'; end if;
 if expected_revision is null or w.revision<>expected_revision or w.status<>'Pending' then raise exception 'HMS_CONFLICT'; end if;
 if decision not in ('Approved','Rejected') or reason is null or length(trim(reason))=0 or length(reason)>1000 then raise exception 'HMS_INVALID: decision and reason'; end if;
 if w.kind='approvals' then
  collection_name:=case w.data->>'type' when 'attendance' then 'attendance' when 'billing_void' then 'billing' end;
  if collection_name is null or collection_name='billing' and m.role<>'admin' then raise exception 'HMS_FORBIDDEN: administrator approval required' using errcode='42501'; end if;
  if decision='Approved' then
   select records,revision into rows,version from public.hms_collections where name=collection_name for update;
   select value into current_row from jsonb_array_elements(rows) where value->>'id'=w.data->>'targetId';
   if current_row is null or current_row is distinct from w.data->'original' then raise exception 'HMS_CONFLICT: target changed; submit a new request'; end if;
   candidate:=w.data->'proposed';
   if collection_name='billing' and ((current_row->>'paid')::numeric<>0 or coalesce((current_row->>'voided')::boolean,false)) then raise exception 'HMS_INVALID: invoice no longer eligible'; end if;
   select jsonb_agg(case when v->>'id'=candidate->>'id' then candidate else v end order by n) into rows from jsonb_array_elements(rows) with ordinality a(v,n);
   if public.hms_valid_records(collection_name,rows) is not true then raise exception 'HMS_INVALID: approved values'; end if;
   update public.hms_collections set records=rows,revision=revision+1,updated_at=now(),updated_by=auth.uid() where name=collection_name;
   perform public.hms_check_references();
   insert into public.hms_audit(actor_id,collection,revision,changed_ids,action) values(auth.uid(),collection_name,version+1,jsonb_build_array(candidate->>'id'),'save');
  end if;
 end if;
 update public.hms_work_items set status=decision,decided_by=auth.uid(),decision_reason=trim(reason),revision=revision+1,updated_at=now() where id=w.id;
 insert into public.hms_access_audit(actor_id,action,subject,details) values(auth.uid(),'work_decision',work_id::text,jsonb_build_object('decision',decision,'reason',reason));
end; $$;
create or replace function public.hms_dispense(prescription_id uuid,expected_revision bigint,quantity integer,reference text) returns void
language plpgsql security definer set search_path='' as $$
declare m public.hms_memberships; w public.hms_work_items; medicines jsonb; medicine jsonb; version bigint; fulfilled integer; receipt jsonb;
begin
 m:=public.hms_current_member(); perform pg_advisory_xact_lock(846120261004::bigint);
 select * into w from public.hms_work_items where id=prescription_id for update;
 if m.role not in ('admin','pharmacist') or public.hms_can('prescriptions','edit') is not true or w.kind<>'prescriptions' or public.hms_work_visible(w) is not true then raise exception 'HMS_FORBIDDEN: dispensing denied' using errcode='42501'; end if;
 if expected_revision is null or w.revision<>expected_revision then raise exception 'HMS_CONFLICT'; end if;
 fulfilled:=coalesce((w.data->>'dispensed')::integer,0);
 if w.status not in ('Issued','Partially Dispensed') or quantity is null or quantity<1 or quantity>(w.data->>'quantity')::integer-fulfilled or reference is null or length(reference)>200 then raise exception 'HMS_INVALID: dispensing quantity'; end if;
 select records,revision into medicines,version from public.hms_collections where name='medicines' for update;
 select value into medicine from jsonb_array_elements(medicines) where value->>'id'=w.data->>'medicineId';
 if medicine is null or (medicine->>'quantity')::integer<quantity or (medicine ? 'expiry' and (medicine->>'expiry')::date<(now() at time zone 'Asia/Karachi')::date) then raise exception 'HMS_INVALID: stock unavailable or batch expired'; end if;
 select jsonb_agg(case when v->>'id'=medicine->>'id' then v||jsonb_build_object('quantity',(v->>'quantity')::integer-quantity) else v end order by n) into medicines from jsonb_array_elements(medicines) with ordinality a(v,n);
 update public.hms_collections set records=medicines,revision=revision+1,updated_by=auth.uid(),updated_at=now() where name='medicines';
 receipt:=jsonb_build_object('id',gen_random_uuid(),'quantity',quantity,'at',now(),'by',auth.uid(),'reference',reference);
 update public.hms_work_items set data=data||jsonb_build_object('dispensed',fulfilled+quantity,'receipts',coalesce(data->'receipts','[]')||jsonb_build_array(receipt)),status=case when fulfilled+quantity=(data->>'quantity')::integer then 'Dispensed' else 'Partially Dispensed' end,revision=revision+1,updated_at=now() where id=w.id;
 insert into public.hms_audit(actor_id,collection,revision,changed_ids,action) values(auth.uid(),'medicines',version+1,jsonb_build_array(medicine->>'id'),'save');
 insert into public.hms_access_audit(actor_id,action,subject,details) values(auth.uid(),'dispensed',w.id::text,receipt);
end; $$;
-- Public entry points validate current membership on every call. Helpers remain private.
revoke all on function public.hms_current_member(),public.hms_collection_module(text),public.hms_patient_visible(jsonb),public.hms_row_visible(text,jsonb),public.hms_project_row(text,jsonb),public.hms_prepare_collection(text,jsonb,jsonb),public.hms_work_visible(public.hms_work_items) from public,anon,authenticated;
revoke all on function public.hms_can(text,text),public.hms_get_access(),public.hms_read_collection(text),public.hms_list_users(),public.hms_set_membership(uuid,text,text,text,text,text[],boolean),public.hms_get_permissions(),public.hms_set_permission(text,text,boolean),public.hms_hospital_settings(jsonb),public.hms_personal_profile(text,text),public.hms_audit_log(),public.hms_list_work(text,timestamptz,text),public.hms_save_work(uuid,text,bigint,text,text,jsonb,text),public.hms_decide_work(uuid,bigint,text,text),public.hms_dispense(uuid,bigint,integer,text) from public,anon;
grant execute on function public.hms_can(text,text),public.hms_get_access(),public.hms_read_collection(text),public.hms_list_users(),public.hms_set_membership(uuid,text,text,text,text,text[],boolean),public.hms_get_permissions(),public.hms_set_permission(text,text,boolean),public.hms_hospital_settings(jsonb),public.hms_personal_profile(text,text),public.hms_audit_log(),public.hms_list_work(text,timestamptz,text),public.hms_save_work(uuid,text,bigint,text,text,jsonb,text),public.hms_decide_work(uuid,bigint,text,text),public.hms_dispense(uuid,bigint,integer,text) to authenticated;
create or replace function public.hms_check_references() returns void
language plpgsql security definer set search_path = '' as $$
declare patients jsonb; doctors jsonb; wards jsonb; staff jsonb; medicines jsonb; c record; r jsonb; w jsonb; occupied numeric;
begin
 select records into patients from public.hms_collections where name='patients';
 select records into doctors from public.hms_collections where name='doctors';
 select records into wards from public.hms_collections where name='wards';
 select records into staff from public.hms_collections where name='staff';
 select records into medicines from public.hms_collections where name='medicines';
 for c in select name,records from public.hms_collections loop
  for r in select value from jsonb_array_elements(c.records) loop
   if nullif(r->>'patientRef','') is not null and not exists(select 1 from jsonb_array_elements(patients) p where p->>'id'=r->>'patientRef') then raise exception 'HMS_INVALID: patient reference'; end if;
   if nullif(r->>'doctorRef','') is not null and not exists(select 1 from jsonb_array_elements(doctors) d where d->>'id'=r->>'doctorRef') then raise exception 'HMS_INVALID: doctor reference'; end if;
   if c.name='billing' and not exists(select 1 from jsonb_array_elements(patients) p where upper(p->>'patientId')=upper(r->>'patientId')) then raise exception 'HMS_INVALID: invoice patient'; end if;
   if c.name='attendance' and not exists(select 1 from jsonb_array_elements(staff) s where s->>'id'=r->>'staffId') then raise exception 'HMS_INVALID: staff history'; end if;
   if c.name='patients' and r->>'status'='Admitted' and nullif(r->>'wardId','') is not null and not exists(select 1 from jsonb_array_elements(wards) v where v->>'id'=r->>'wardId' and coalesce(v->>'status','Available')<>'Maintenance') then raise exception 'HMS_INVALID: admission ward'; end if;
  end loop;
 end loop;
 for w in select value from jsonb_array_elements(wards) loop
  select count(*) into occupied from jsonb_array_elements(patients) p where p->>'status'='Admitted' and p->>'wardId'=w->>'id';
  if occupied+(w->>'occupied')::numeric > (w->>'capacity')::numeric or occupied>0 and w->>'status'='Maintenance' then raise exception 'HMS_INVALID: ward capacity'; end if;
 end loop;
if exists(select 1 from public.hms_work_items w where w.patient_id is not null and not exists(select 1 from jsonb_array_elements(patients) p where p->>'id'=w.patient_id)) then raise exception 'HMS_INVALID: preserve clinical patient history'; end if;
 if exists(select 1 from public.hms_work_items w where w.staff_id is not null and not exists(select 1 from jsonb_array_elements(staff) s where s->>'id'=w.staff_id)) then raise exception 'HMS_INVALID: preserve workforce staff history'; end if;
 if exists(select 1 from public.hms_work_items rx where rx.kind='prescriptions' and not exists(select 1 from jsonb_array_elements(medicines) med where med->>'id'=rx.data->>'medicineId')) then raise exception 'HMS_INVALID: preserve prescription inventory history'; end if;
 if exists(select 1 from public.hms_memberships m where m.staff_id is not null and not exists(select 1 from jsonb_array_elements(staff) s where s->>'id'=m.staff_id) or m.doctor_id is not null and not exists(select 1 from jsonb_array_elements(doctors) d where d->>'id'=m.doctor_id) or exists(select 1 from unnest(m.ward_ids) assigned(ward_id) where not exists(select 1 from jsonb_array_elements(wards) v where v->>'id'=assigned.ward_id))) then raise exception 'HMS_INVALID: record is linked to a login account'; end if;
end; $$;

create or replace function public.hms_valid_records(kind text, rows jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare r jsonb; p jsonb; field text; fields text[]; total numeric; duration integer;
begin
 if kind not in ('patients','wards','tests','medicines','appointments','visits','staff','attendance','billing','doctors','surgeries') or jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 10000 then return false; end if;
 if (select count(*) <> count(distinct v->>'id') from jsonb_array_elements(rows) v) then return false; end if;
 for r in select value from jsonb_array_elements(rows) loop
  if jsonb_typeof(r) <> 'object' or jsonb_typeof(r->'id') <> 'string' or length(trim(r->>'id')) = 0 or length(r->>'id') > 2000 then return false; end if;
  fields := case kind
   when 'patients' then array['patientId','name','gender','department','doctor','initials']
   when 'wards' then array['name'] when 'tests' then array['patient','test']
   when 'medicines' then array['name'] when 'appointments' then array['appointmentId','patient','doctor','department','initials','time']
   when 'visits' then array['patient'] when 'staff' then array['name','department','role']
   when 'attendance' then array['staffId','name'] when 'billing' then array['patient','patientId','service']
   when 'doctors' then array['name','specialty','department'] when 'surgeries' then array['patient','surgeon','procedure','theater','time'] end;
  if kind in ('patients','tests','appointments','staff','attendance','doctors','surgeries') then fields := fields || array['status']; end if;
  foreach field in array fields loop
   if jsonb_typeof(r->field) is distinct from 'string' or length(trim(r->>field)) = 0 or length(r->>field) > 2000 then return false; end if;
  end loop;
  -- Text values are bounded; reference values cannot masquerade as objects or numbers.
  if exists(select 1 from jsonb_each(r) e where jsonb_typeof(e.value)='string' and length(e.value #>> '{}') > 2000) then return false; end if;
  foreach field in array array['doctorRef','patientRef','wardId'] loop
   if r ? field and jsonb_typeof(r->field) is distinct from 'string' then return false; end if;
  end loop;
  if kind = 'patients' then
   if public.hms_integer(r->'age') is not true or (r->>'age')::numeric > 130 or r->>'status' not in ('Admitted','Outpatient','Discharged') or jsonb_typeof(r->'phone') is distinct from 'string' or jsonb_typeof(r->'notes') is distinct from 'string' then return false; end if;
   foreach field in array array['registeredAt','admittedAt','updatedAt'] loop
    if not (r ? field) or (r->field <> 'null'::jsonb and public.hms_valid_time(r->>field) is not true) then return false; end if;
   end loop;
  elsif kind = 'wards' then
   if public.hms_integer(r->'capacity') is not true or (r->>'capacity')::numeric < 1 or public.hms_integer(r->'occupied') is not true or (r->>'occupied')::numeric > (r->>'capacity')::numeric or (r ? 'status' and r->>'status' not in ('Available','Maintenance')) then return false; end if;
  elsif kind = 'tests' then
   if r->>'status' not in ('Pending','In Progress','Completed','Cancelled') or public.hms_valid_time(r->>'requestedAt') is not true or (r ? 'urgent' and jsonb_typeof(r->'urgent') is distinct from 'boolean') then return false; end if;
  if (r ? 'sampleStatus' and r->>'sampleStatus' not in ('Pending','Collected','Received','Rejected')) or (r ? 'result' and jsonb_typeof(r->'result') is distinct from 'string') or (r ? 'completedAt' and public.hms_valid_time(r->>'completedAt') is not true) or (r ? 'reportPath' and (jsonb_typeof(r->'reportPath') is distinct from 'string' or split_part(r->>'reportPath','/',1)<>r->>'id' or r->>'reportPath' !~ '^[^/]+/[a-f0-9-]+\.pdf$')) then return false; end if;
  elsif kind = 'medicines' then
   if public.hms_integer(r->'quantity') is not true or public.hms_integer(r->'reorderLevel') is not true or (r ? 'expiry' and public.hms_valid_date(r->>'expiry') is not true) then return false; end if;
  elsif kind in ('appointments','surgeries') then
   duration := coalesce((r->>'duration')::integer,30);
   if public.hms_valid_date(r->>'date') is not true or public.hms_minutes(r->>'time') < 0 or duration < 5 or duration > (case when kind='surgeries' then 1440 else 240 end) or public.hms_minutes(r->>'time') + duration > 1440 then return false; end if;
   if (kind='appointments' and r->>'status' not in ('Confirmed','Waiting','Completed','Cancelled')) or (kind='surgeries' and r->>'status' not in ('Scheduled','In Progress','Completed','Cancelled')) then return false; end if;
  elsif kind = 'visits' then
   if public.hms_valid_date(r->>'date') is not true then return false; end if;
  elsif kind = 'staff' then
   if r->>'status' not in ('Active','Inactive') or jsonb_typeof(r->'phone') is distinct from 'string' then return false; end if;
  elsif kind = 'doctors' then
   if r->>'status' not in ('Active','Inactive') or jsonb_typeof(r->'phone') is distinct from 'string' or jsonb_typeof(r->'experience') is distinct from 'string' or jsonb_typeof(r->'photo') is distinct from 'string' or (r->>'photo' <> '' and r->>'photo' !~ '^https://') then return false; end if;
  elsif kind = 'attendance' then
   if public.hms_valid_date(r->>'date') is not true or r->>'status' not in ('Present','Absent','Leave') or jsonb_typeof(r->'checkIn') is distinct from 'string' or jsonb_typeof(r->'checkOut') is distinct from 'string' or (r ? 'nextDay' and jsonb_typeof(r->'nextDay') is distinct from 'boolean') then return false; end if;
   if r->>'status' = 'Present' then
    if public.hms_minutes(r->>'checkIn') < 0 then return false; end if;
    if r->>'checkOut' <> '' then
     duration := public.hms_minutes(r->>'checkOut') - public.hms_minutes(r->>'checkIn') + case when (r->>'nextDay')::boolean is true then 1440 else 0 end;
     if public.hms_minutes(r->>'checkOut') < 0 or duration <= 0 or duration > 1440 then return false; end if;
    end if;
   elsif r->>'checkIn' <> '' or r->>'checkOut' <> '' then return false; end if;
  elsif kind = 'billing' then
   if public.hms_valid_date(r->>'date') is not true or public.hms_money(r->'amount') is not true or (r->>'amount')::numeric <= 0 or public.hms_money(r->'paid') is not true or (r->>'paid')::numeric > (r->>'amount')::numeric or (r ? 'voided' and jsonb_typeof(r->'voided') is distinct from 'boolean') then return false; end if;
   if r ? 'payments' then
    if jsonb_typeof(r->'payments') <> 'array' or public.hms_money(coalesce(r->'openingPaid','0'::jsonb)) is not true then return false; end if;
    total := coalesce((r->>'openingPaid')::numeric,0)*100;
    if (select count(*) <> count(distinct v->>'id') from jsonb_array_elements(r->'payments') v) then return false; end if;
    for p in select value from jsonb_array_elements(r->'payments') loop
     if jsonb_typeof(p->'id') is distinct from 'string' or length(trim(p->>'id')) = 0 or public.hms_integer(p->'amount') is not true or (p->>'amount')::numeric <= 0 or public.hms_valid_time(p->>'receivedAt') is not true or jsonb_typeof(p->'reference') is distinct from 'string' then return false; end if;
     total := total + (p->>'amount')::numeric;
    end loop;
    if total <> (r->>'paid')::numeric*100 then return false; end if;
   end if;
  end if;
 end loop;
 if kind='patients' and (select count(*) <> count(distinct upper(v->>'patientId')) from jsonb_array_elements(rows) v) then return false; end if;
 if kind='appointments' and (select count(*) <> count(distinct upper(v->>'appointmentId')) from jsonb_array_elements(rows) v) then return false; end if;
 if kind='attendance' and (select count(*) <> count(distinct (v->>'staffId',v->>'date')) from jsonb_array_elements(rows) v) then return false; end if;
 -- Server scheduling checks apply even when the browser is bypassed.
 if kind in ('appointments','surgeries') and exists(
  select 1 from jsonb_array_elements(rows) with ordinality a(v,i)
  join jsonb_array_elements(rows) with ordinality b(v,i) on a.i<b.i
  where a.v->>'status'<>'Cancelled' and b.v->>'status'<>'Cancelled' and a.v->>'date'=b.v->>'date'
   and ((case when nullif(a.v->>'doctorRef','') is not null and nullif(b.v->>'doctorRef','') is not null then a.v->>'doctorRef'=b.v->>'doctorRef' else lower(a.v->>(case when kind='surgeries' then 'surgeon' else 'doctor' end))=lower(b.v->>(case when kind='surgeries' then 'surgeon' else 'doctor' end)) end)
    or (case when nullif(a.v->>'patientRef','') is not null and nullif(b.v->>'patientRef','') is not null then a.v->>'patientRef'=b.v->>'patientRef' else lower(a.v->>'patient')=lower(b.v->>'patient') end)
    or (kind='surgeries' and lower(a.v->>'theater')=lower(b.v->>'theater')))
   and public.hms_minutes(a.v->>'time') < public.hms_minutes(b.v->>'time')+coalesce((b.v->>'duration')::integer,30)
   and public.hms_minutes(b.v->>'time') < public.hms_minutes(a.v->>'time')+coalesce((a.v->>'duration')::integer,30)
 ) then return false; end if;
 return true;
exception when others then return false; end; $$;


create or replace function public.hms_log_account_action(target_user uuid,account_action text) returns void language plpgsql security definer set search_path='' as $$
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 if account_action not in ('password_reset_sent','invitation_sent','account_created') or not exists(select 1 from public.hms_memberships where user_id=target_user) then raise exception 'HMS_INVALID: account audit'; end if;
 insert into public.hms_access_audit(actor_id,action,subject) values(auth.uid(),account_action,target_user::text);
end; $$;
create or replace function public.hms_export_backup() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 return jsonb_build_object('format','medicore-hospital-backup','version',3,'exportedAt',now(),'collections',(select jsonb_object_agg(name,records) from public.hms_collections),'workItems',(select coalesce(jsonb_agg(to_jsonb(w)),'[]') from public.hms_work_items w),'memberships',(select coalesce(jsonb_agg(to_jsonb(m)),'[]') from public.hms_memberships m),'rolePermissions',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.hms_role_permissions p),'settings',(select data from public.hms_settings where id),'profiles',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.hms_profiles p),'recordAudit',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.hms_audit a),'accessAudit',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.hms_access_audit a));
end; $$;
create or replace function public.hms_personal_notifications() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.hms_memberships;
begin
 m:=public.hms_current_member(); if m.user_id is null then raise exception 'HMS_FORBIDDEN: membership required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',case kind when 'roster' then 'Duty shift' when 'leave' then 'Leave request' else 'Approval request' end,'message',case kind when 'roster' then concat(data->>'date',' · ',data->>'start','–',data->>'end') else status end,'path','/'||kind,'updatedAt',updated_at) order by updated_at desc),'[]') from (select * from public.hms_work_items w where w.staff_id=m.staff_id and w.kind in ('roster','leave','approvals') and public.hms_work_visible(w) order by updated_at desc limit 30) n);
end; $$;
revoke all on function public.hms_log_account_action(uuid,text),public.hms_export_backup(),public.hms_personal_notifications() from public,anon;
grant execute on function public.hms_log_account_action(uuid,text),public.hms_export_backup(),public.hms_personal_notifications() to authenticated;

commit;
