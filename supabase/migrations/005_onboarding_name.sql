-- New users start with an empty display_name to trigger the onboarding flow.
-- The dashboard detects display_name = '' and redirects to /onboarding.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, is_admin)
  values (
    new.id,
    new.email,
    '',
    new.email = current_setting('app.admin_email', true)
  );
  return new;
end;
$$;
