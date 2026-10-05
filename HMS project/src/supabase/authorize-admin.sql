-- Run AFTER the migration, in Supabase SQL Editor (owner access).
-- First create your account in Supabase Authentication > Users.
-- Replace the email below with YOUR existing account email.
do $$
declare
  administrator_email text := 'haqib0196@gmail.com';
  administrator_id uuid;
  matches integer;
begin
  if administrator_email like 'YOUR_%' then
    raise exception 'Replace YOUR_ADMIN_EMAIL@example.com with your actual administrator email.';
  end if;
  select count(*), min(id::text)::uuid into matches, administrator_id
    from auth.users where lower(email)=lower(administrator_email);
  if matches<>1 then raise exception 'Expected exactly one account with this email. Create/check the account in Authentication > Users first.'; end if;
  insert into public.hms_admins(user_id) values(administrator_id) on conflict do nothing;
end;
$$;
