-- Per-user generated knockout fixtures
-- generated_for_user_id null = real match (API-sourced); non-null = generated for that user's bracket
alter table public.matches
  add column generated_for_user_id uuid references public.profiles(id) on delete cascade;

create index on public.matches (generated_for_user_id);

-- Tighten visibility: real matches are public; generated matches visible only to their owner
drop policy "Everyone can view matches" on public.matches;

create policy "Users can view real or own generated matches"
  on public.matches for select
  using (generated_for_user_id is null or generated_for_user_id = auth.uid());
