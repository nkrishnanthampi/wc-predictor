-- Allow league creators to see their own league immediately after creation,
-- before they are added as a member. Fixes RLS violation on insert+select.
create policy "League creator can view own league"
  on public.leagues for select
  using (auth.uid() = created_by);
