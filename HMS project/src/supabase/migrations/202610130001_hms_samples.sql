-- Apply after the roles migration. Installs an explicit administrator-only sample loader.
-- Running this migration alone never inserts or overwrites hospital records.
begin;
create table if not exists public.hms_sample_installation (
 id boolean primary key default true check(id), batch_id uuid not null,
 installed_at timestamptz not null default now(), installed_by uuid references auth.users(id),
 collection_counts jsonb not null, work_count integer not null
);
alter table public.hms_sample_installation enable row level security;
revoke all on public.hms_sample_installation from public,anon,authenticated;

create or replace function public.hms_sample_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare installed public.hms_sample_installation;
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 select * into installed from public.hms_sample_installation where id;
 return jsonb_build_object('installed',installed.batch_id is not null,'installedAt',installed.installed_at,'counts',coalesce(installed.collection_counts,'{}'::jsonb),'workCount',coalesce(installed.work_count,0));
end; $$;

create or replace function public.hms_add_samples(sample_batch uuid, sample_collections jsonb, sample_work jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c record; incoming jsonb; merged jsonb; counts jsonb:='{}'; prefix text; w jsonb; person jsonb; target jsonb; work_id uuid; work_count integer:=0; kind text; data jsonb;
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(846120261004::bigint);
 if exists(select 1 from public.hms_sample_installation where id) then return public.hms_sample_status(); end if;
 if sample_batch is null or jsonb_typeof(sample_collections) is distinct from 'object' or octet_length(sample_collections::text)>2000000 or jsonb_typeof(sample_work) is distinct from 'array' or jsonb_array_length(sample_work)>200 or octet_length(sample_work::text)>250000 then raise exception 'HMS_INVALID: sample payload'; end if;
 if exists(select 1 from jsonb_object_keys(sample_collections) k where k not in ('patients','doctors','appointments','visits','wards','tests','medicines','surgeries','staff','attendance','billing')) then raise exception 'HMS_INVALID: sample collection'; end if;
 prefix:='sample-'||sample_batch::text||'-';
 for c in select * from public.hms_collections order by name for update loop
  incoming:=sample_collections->c.name;
  if jsonb_typeof(incoming) is distinct from 'array' or jsonb_array_length(incoming)=0 or jsonb_array_length(incoming)>1000 or public.hms_valid_records(c.name,incoming) is not true then raise exception 'HMS_INVALID: sample records'; end if;
  if exists(select 1 from jsonb_array_elements(incoming) r where left(r->>'id',length(prefix))<>prefix) then raise exception 'HMS_INVALID: sample record namespace'; end if;
  if exists(select 1 from jsonb_array_elements(incoming) r,jsonb_array_elements(c.records) old where old->>'id'=r->>'id') then raise exception 'HMS_CONFLICT: sample identity already exists'; end if;
  merged:=c.records||incoming;
  if public.hms_valid_records(c.name,merged) is not true then raise exception 'HMS_INVALID: sample values, capacity or scheduling conflict'; end if;
  update public.hms_collections set records=merged,revision=revision+1,updated_at=now(),updated_by=auth.uid() where name=c.name;
  counts:=counts||jsonb_build_object(c.name,jsonb_array_length(incoming));
  insert into public.hms_audit(actor_id,collection,revision,changed_ids,action) values(auth.uid(),c.name,c.revision+1,(select jsonb_agg(r->>'id') from jsonb_array_elements(incoming) r),'import');
 end loop;
 perform public.hms_check_references();
 for w in select value from jsonb_array_elements(sample_work) loop
  kind:=w->>'kind'; data:=w->'data';
  if jsonb_typeof(w) is distinct from 'object' or jsonb_typeof(w->'status') is distinct from 'string' or jsonb_typeof(data) is distinct from 'object' or octet_length(data::text)>20000 or kind is null or kind not in ('clinical','prescriptions','vitals','roster','leave','approvals') then raise exception 'HMS_INVALID: sample work'; end if;
  if nullif(w->>'patientId','') is not null and left(w->>'patientId',length(prefix))<>prefix or nullif(w->>'staffId','') is not null and left(w->>'staffId',length(prefix))<>prefix then raise exception 'HMS_INVALID: sample work scope'; end if;
  if kind in ('clinical','prescriptions','vitals','roster') then
   work_id:=public.hms_save_work(null,kind,0,nullif(w->>'patientId',''),nullif(w->>'staffId',''),data,w->>'status');
   update public.hms_work_items set data=hms_work_items.data||jsonb_build_object('sampleBatch',sample_batch) where id=work_id;
  else
   -- Only already-reviewed illustrative history is imported. Real pending requests
   -- still use hms_save_work and the normal independent-approver rules.
   select r into person from public.hms_collections col,jsonb_array_elements(col.records) r where col.name='staff' and r->>'id'=w->>'staffId' and r->>'status'='Active';
   if person is null or nullif(w->>'patientId','') is not null or jsonb_typeof(data->'reason') is distinct from 'string' or trim(data->>'reason')='' or w->>'status' not in ('Approved','Rejected') then raise exception 'HMS_INVALID: sample history'; end if;
   if kind='leave' then
    if public.hms_valid_date(data->>'from') is not true or public.hms_valid_date(data->>'to') is not true or data->>'from'>data->>'to' then raise exception 'HMS_INVALID: sample leave dates'; end if;
    data:=jsonb_build_object('from',data->'from','to',data->'to','reason',data->'reason');
   else
    select r into target from public.hms_collections col,jsonb_array_elements(col.records) r where col.name='attendance' and r->>'id'=data->>'targetId' and r->>'staffId'=person->>'id';
    if data->>'type' is distinct from 'attendance' or target is null or target is distinct from data->'proposed' or public.hms_valid_records('attendance',jsonb_build_array(data->'original')) is not true or data->'original'->>'id' is distinct from target->>'id' or data->'original'->>'staffId' is distinct from person->>'id' then raise exception 'HMS_INVALID: sample correction history'; end if;
   end if;
   insert into public.hms_work_items(kind,staff_id,department,data,status,created_by,decision_reason) values(kind,person->>'id',person->>'department',data||jsonb_build_object('staffName',person->>'name','sampleBatch',sample_batch,'importedSampleHistory',true),w->>'status',auth.uid(),'Imported illustrative history; no real approval action was performed.');
  end if;
  work_count:=work_count+1;
 end loop;
 perform public.hms_check_references();
 insert into public.hms_sample_installation(id,batch_id,installed_by,collection_counts,work_count) values(true,sample_batch,auth.uid(),counts,work_count);
 insert into public.hms_access_audit(actor_id,action,subject,details) values(auth.uid(),'sample_data_loaded',sample_batch::text,jsonb_build_object('collections',counts,'workItems',work_count));
 return public.hms_sample_status();
end; $$;
revoke all on function public.hms_sample_status(),public.hms_add_samples(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.hms_sample_status(),public.hms_add_samples(uuid,jsonb,jsonb) to authenticated;
-- Include the one-time sample marker in the administrator backup.
create or replace function public.hms_export_backup() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if public.is_hospital_admin() is not true then raise exception 'HMS_FORBIDDEN: administrator required' using errcode='42501'; end if;
 return jsonb_build_object('format','medicore-hospital-backup','version',3,'exportedAt',now(),'collections',(select jsonb_object_agg(name,records) from public.hms_collections),'workItems',(select coalesce(jsonb_agg(to_jsonb(w)),'[]') from public.hms_work_items w),'memberships',(select coalesce(jsonb_agg(to_jsonb(m)),'[]') from public.hms_memberships m),'rolePermissions',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.hms_role_permissions p),'settings',(select data from public.hms_settings where id),'profiles',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.hms_profiles p),'recordAudit',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.hms_audit a),'accessAudit',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.hms_access_audit a),'sampleInstallation',(select to_jsonb(s) from public.hms_sample_installation s where id));
end; $$;
commit;
