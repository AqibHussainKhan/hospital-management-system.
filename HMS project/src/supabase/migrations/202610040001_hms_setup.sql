-- Run once in the Supabase SQL Editor. For ONE hospital and authorized administrators.
-- This migration does not import sample data or grant users administrator membership.
begin;
create table if not exists public.hms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.hms_admins enable row level security;
revoke all on public.hms_admins from public, anon, authenticated;
create or replace function public.is_hospital_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.hms_admins where user_id = auth.uid());
$$;
revoke all on function public.is_hospital_admin() from public, anon;
grant execute on function public.is_hospital_admin() to authenticated;

create or replace function public.hms_valid_date(v text) returns boolean
language plpgsql immutable set search_path = '' as $$
begin return v ~ '^\d{4}-\d{2}-\d{2}$' and to_char(v::date,'YYYY-MM-DD') = v; exception when others then return false; end; $$;
create or replace function public.hms_valid_time(v text) returns boolean
language plpgsql immutable set search_path = '' as $$
begin return v ~ '^\d{4}-\d{2}-\d{2}T' and isfinite(v::timestamptz); exception when others then return false; end; $$;
create or replace function public.hms_minutes(v text) returns integer
language plpgsql immutable set search_path = '' as $$
declare m text[]; h integer; n integer;
begin
 m := regexp_match(trim(v), '^(\d{1,2}):(\d{2})\s*(AM|PM)?$', 'i');
 if m is null then return -1; end if;
 h := m[1]::integer; n := m[2]::integer;
 if n > 59 or (m[3] is null and h > 23) or (m[3] is not null and (h < 1 or h > 12)) then return -1; end if;
 if m[3] is not null then h := h % 12 + case when upper(m[3]) = 'PM' then 12 else 0 end; end if;
 return h * 60 + n;
exception when others then return -1; end; $$;
create or replace function public.hms_integer(v jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
begin return jsonb_typeof(v) = 'number' and (v::text)::numeric >= 0 and (v::text)::numeric <= 9007199254740991 and trunc((v::text)::numeric) = (v::text)::numeric; exception when others then return false; end; $$;
create or replace function public.hms_money(v jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
begin return jsonb_typeof(v) = 'number' and (v::text)::numeric >= 0 and (v::text)::numeric <= 10000000000 and trunc((v::text)::numeric * 100) = (v::text)::numeric * 100; exception when others then return false; end; $$;

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

create table if not exists public.hms_collections (
 name text primary key,
 records jsonb not null default '[]'::jsonb,
 revision bigint not null default 0 check(revision >= 0),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null,
 constraint hms_records_valid check(public.hms_valid_records(name,records) is true)
);
insert into public.hms_collections(name) select unnest(array['patients','wards','tests','medicines','appointments','visits','staff','attendance','billing','doctors','surgeries']) on conflict do nothing;
create table if not exists public.hms_audit (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 occurred_at timestamptz not null default now(),
 collection text not null,
 revision bigint not null,
 changed_ids jsonb not null,
 action text not null check(action in ('save','import'))
);
alter table public.hms_collections enable row level security;
alter table public.hms_audit enable row level security;
revoke all on public.hms_collections, public.hms_audit from public, anon, authenticated;
grant select on public.hms_collections, public.hms_audit to authenticated;
drop policy if exists hms_admin_read on public.hms_collections;
create policy hms_admin_read on public.hms_collections for select to authenticated using ((select public.is_hospital_admin()));
drop policy if exists hms_admin_audit_read on public.hms_audit;
create policy hms_admin_audit_read on public.hms_audit for select to authenticated using ((select public.is_hospital_admin()));

create or replace function public.hms_check_references() returns void
language plpgsql security definer set search_path = '' as $$
declare patients jsonb; doctors jsonb; wards jsonb; staff jsonb; c record; r jsonb; w jsonb; occupied numeric;
begin
 select records into patients from public.hms_collections where name='patients';
 select records into doctors from public.hms_collections where name='doctors';
 select records into wards from public.hms_collections where name='wards';
 select records into staff from public.hms_collections where name='staff';
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
end; $$;

create or replace function public.hms_save_collection(collection_name text, expected_revision bigint, next_records jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare previous jsonb; current_revision bigint; r jsonb; old jsonb; payment jsonb; changed jsonb;
begin
 if public.is_hospital_admin() is not true then raise exception 'Hospital administrator access required' using errcode='42501'; end if;
 -- Serialize cross-collection constraints as well as per-collection revisions.
 perform pg_advisory_xact_lock(846120261004::bigint);
 select records,revision into previous,current_revision from public.hms_collections where name=collection_name for update;
 if not found then raise exception 'HMS_INVALID: unknown collection'; end if;
 if current_revision<>expected_revision then raise exception 'HMS_CONFLICT'; end if;
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

-- Atomic import into an empty database only. Source browser storage is never removed.
create or replace function public.hms_import_legacy(next_collections jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare entry record;
begin
 if public.is_hospital_admin() is not true then raise exception 'Hospital administrator access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(846120261004::bigint);
 if exists(select 1 from public.hms_collections where records<>'[]'::jsonb or revision<>0) then raise exception 'HMS_CONFLICT: import requires empty collections'; end if;
 if jsonb_typeof(next_collections)<>'object' then raise exception 'HMS_INVALID: import format'; end if;
 for entry in select key,value from jsonb_each(next_collections) loop
  if public.hms_valid_records(entry.key,entry.value) is not true then raise exception 'HMS_INVALID: import values'; end if;
  update public.hms_collections set records=entry.value,revision=1,updated_by=auth.uid(),updated_at=now() where name=entry.key;
  if not found then raise exception 'HMS_INVALID: import collection'; end if;
  insert into public.hms_audit(actor_id,collection,revision,changed_ids,action) values(auth.uid(),entry.key,1,(select coalesce(jsonb_agg(v->>'id'),'[]'::jsonb) from jsonb_array_elements(entry.value) v),'import');
 end loop;
 perform public.hms_check_references();
end; $$;
revoke all on function public.hms_import_legacy(jsonb) from public, anon;
grant execute on function public.hms_import_legacy(jsonb) to authenticated;
-- Internal validators and reference checks have no callable client privileges.
revoke all on function public.hms_check_references(), public.hms_valid_records(text,jsonb), public.hms_valid_date(text), public.hms_valid_time(text), public.hms_minutes(text), public.hms_integer(jsonb), public.hms_money(jsonb) from public, anon, authenticated;
commit;
