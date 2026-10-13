-- Supabase Storage is required. Apply after both database migrations.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('hms-lab-reports','hms-lab-reports',false,10485760,array['application/pdf']) on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];
create or replace function public.hms_report_access(object_name text,requested_action text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare row jsonb; m public.hms_memberships;
begin
 m:=public.hms_current_member();
 if m.user_id is null or requested_action not in ('view','edit') then return false; end if;
 if requested_action='edit' and m.role not in ('admin','lab_staff') then return false; end if;
 if public.hms_can('laboratory',requested_action) is not true then return false; end if;
 select v into row from public.hms_collections c,jsonb_array_elements(c.records) v where c.name='tests' and v->>'id'=split_part(object_name,'/',1);
 return row is not null and public.hms_row_visible('tests',row);
end; $$;
revoke all on function public.hms_report_access(text,text) from public,anon;
grant execute on function public.hms_report_access(text,text) to authenticated;
drop policy if exists hms_report_read on storage.objects;
create policy hms_report_read on storage.objects for select to authenticated using(bucket_id='hms-lab-reports' and public.hms_report_access(name,'view'));
drop policy if exists hms_report_upload on storage.objects;
create policy hms_report_upload on storage.objects for insert to authenticated with check(bucket_id='hms-lab-reports' and public.hms_report_access(name,'edit'));
-- No client update/delete policy: issued report objects retain their history.
commit;
