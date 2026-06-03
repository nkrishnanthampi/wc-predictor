-- App-wide key/value configuration (e.g. effective_date for time simulation)
create table public.app_config (
  key    text primary key,
  value  text not null
);

alter table public.app_config enable row level security;

create policy "Anyone can read app config"
  on public.app_config for select using (true);

create policy "Admins can manage app config"
  on public.app_config for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
