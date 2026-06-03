-- Fix infinite recursion in league_members SELECT policy.
-- The original policy checked co-membership via a self-referential subquery,
-- which caused PostgreSQL to recurse infinitely when evaluating it.
drop policy "Members can view their league memberships" on public.league_members;

create policy "Members can view their league memberships"
  on public.league_members for select
  using (user_id = auth.uid());
