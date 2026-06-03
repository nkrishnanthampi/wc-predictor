-- Add manual_override flag to matches so sync-results skips manually set scores
alter table public.matches
  add column manual_override boolean not null default false;
