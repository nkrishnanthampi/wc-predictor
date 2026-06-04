-- Fix: current_setting('app.admin_email', true) returns NULL when not configured,
-- causing `email = NULL` to evaluate to NULL instead of false, which violates
-- the `is_admin boolean not null` constraint on profiles.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, is_admin)
  values (
    new.id,
    new.email,
    '',
    coalesce(new.email = current_setting('app.admin_email', true), false)
  );
  return new;
end;
$$;
