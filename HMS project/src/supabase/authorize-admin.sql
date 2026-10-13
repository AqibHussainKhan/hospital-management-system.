-- SQL Editor (database owner) only. Apply both database migrations first.
-- Create the account under Authentication > Users, then enter its email below.
do $$
declare administrator_email text := 'YOUR_ADMIN_EMAIL@example.com'; administrator_id uuid; matches integer;
begin
 if administrator_email like 'YOUR_%' then raise exception 'Replace YOUR_ADMIN_EMAIL@example.com with the administrator login email.'; end if;
 select count(*),min(id::text)::uuid into matches,administrator_id from auth.users where lower(email)=lower(administrator_email);
 if matches<>1 then raise exception 'Expected exactly one existing Auth account with this email.'; end if;
 insert into public.hms_admins(user_id) values(administrator_id) on conflict do nothing;
 insert into public.hms_memberships(user_id,role,department,active) values(administrator_id,'admin','Administration',true)
 on conflict(user_id) do update set role='admin',active=true,updated_at=clock_timestamp();
end; $$;
