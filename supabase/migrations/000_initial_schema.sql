-- World Cup Predictor — Base schema
-- Captures the initial schema applied directly in Supabase cloud.
-- Excludes app_config (added by 001) and manual_override column (added by 002).

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  email         text not null,
  display_name  text not null,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email = current_setting('app.admin_email', true)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── LEAGUES ─────────────────────────────────────────────────────────────────
create table public.leagues (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  created_by    uuid not null references public.profiles on delete cascade,
  invite_code   text not null unique default substr(md5(random()::text), 1, 8),
  created_at    timestamptz not null default now()
);

alter table public.leagues enable row level security;

create policy "Authenticated users can create leagues"
  on public.leagues for insert
  with check (auth.uid() = created_by);

create policy "League creator can update league"
  on public.leagues for update
  using (auth.uid() = created_by);

create policy "League creator can delete league"
  on public.leagues for delete
  using (auth.uid() = created_by);

-- ─── LEAGUE MEMBERS ──────────────────────────────────────────────────────────
create table public.league_members (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references public.leagues on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  joined_at   timestamptz not null default now(),
  unique (league_id, user_id)
);

alter table public.league_members enable row level security;

create policy "Members can view their league memberships"
  on public.league_members for select
  using (user_id = auth.uid());

create policy "Users can join leagues"
  on public.league_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave leagues"
  on public.league_members for delete
  using (auth.uid() = user_id);

create policy "League members can view their leagues"
  on public.leagues for select
  using (
    exists (
      select 1 from public.league_members
      where league_id = leagues.id and user_id = auth.uid()
    )
  );

-- ─── MATCHES ─────────────────────────────────────────────────────────────────
create type public.match_stage as enum (
  'group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'
);

create type public.match_status as enum ('scheduled', 'live', 'finished', 'postponed');

create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  api_match_id    integer unique,
  stage           public.match_stage not null,
  group_name      text,
  match_number    integer,
  home_team       text,
  away_team       text,
  kickoff_time    timestamptz not null,
  home_score      integer,
  away_score      integer,
  status          public.match_status not null default 'scheduled',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "Everyone can view matches"
  on public.matches for select using (true);

-- ─── PREDICTIONS ─────────────────────────────────────────────────────────────
create table public.predictions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles on delete cascade,
  match_id              uuid not null references public.matches on delete cascade,
  predicted_home_score  integer not null check (predicted_home_score >= 0),
  predicted_away_score  integer not null check (predicted_away_score >= 0),
  points_awarded        integer,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, match_id)
);

alter table public.predictions enable row level security;

create policy "Users can view all predictions"
  on public.predictions for select using (true);

create policy "Users can create their own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own predictions (enforced in app before kickoff)"
  on public.predictions for update
  using (auth.uid() = user_id);

-- ─── TOURNAMENT PREDICTIONS ──────────────────────────────────────────────────
create table public.tournament_predictions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles on delete cascade,
  league_id         uuid not null references public.leagues on delete cascade,
  predicted_winner  text not null,
  created_at        timestamptz not null default now(),
  unique (user_id, league_id)
);

alter table public.tournament_predictions enable row level security;

create policy "League members can view tournament predictions"
  on public.tournament_predictions for select
  using (exists (
    select 1 from public.league_members
    where league_id = tournament_predictions.league_id and user_id = auth.uid()
  ));

create policy "Users can create their own tournament predictions"
  on public.tournament_predictions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tournament predictions"
  on public.tournament_predictions for update
  using (auth.uid() = user_id);

-- ─── LEADERBOARD VIEW ────────────────────────────────────────────────────────
create view public.leaderboard as
select
  p.user_id,
  p.league_id,
  pr.display_name,
  pr.email,
  coalesce(sum(pred.points_awarded), 0) as total_points,
  count(pred.id) filter (where pred.points_awarded is not null) as predictions_scored,
  count(pred.id) as total_predictions
from public.league_members p
join public.profiles pr on pr.id = p.user_id
left join public.predictions pred on pred.user_id = p.user_id
group by p.user_id, p.league_id, pr.display_name, pr.email;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
create index on public.predictions (user_id);
create index on public.predictions (match_id);
create index on public.league_members (league_id);
create index on public.league_members (user_id);
create index on public.matches (kickoff_time);
create index on public.matches (status);
