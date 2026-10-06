-- P.I.B. login, timer, and leaderboard schema.
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: it drops and recreates these two tables only.

drop table if exists public.results;
drop table if exists public.profiles;

-- One row per signed-up user. Only public-safe data lives here, never email.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 2 and 24),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- One row per user, per section, per UTC calendar day.
-- The primary key itself enforces "one attempt per day": a second insert
-- for the same user/section/day fails outright.
create table public.results (
  user_id uuid not null references public.profiles(id) on delete cascade,
  section text not null check (section in ('moa', 'adr', 'doc')),
  day date not null default (timezone('utc', now()))::date,
  time_seconds integer not null check (time_seconds >= 0 and time_seconds < 86400),
  created_at timestamptz not null default now(),
  primary key (user_id, section, day)
);

alter table public.results enable row level security;

-- Public read access is what makes the leaderboard viewable by anyone,
-- logged in or not.
create policy "Results are publicly readable"
  on public.results for select
  using (true);

-- A user may only insert their own result, and only dated today (UTC).
-- Combined with the primary key above, this makes today's row a
-- one-shot write: no backdating, no overwriting, no padding.
create policy "Users can submit only their own result for today"
  on public.results for insert
  with check (
    auth.uid() = user_id
    and day = (timezone('utc', now()))::date
  );

-- Minimal data retention: once a day is over, its rows are fair game for
-- deletion by anyone. The app calls this opportunistically whenever the
-- leaderboard loads, so stale rows don't linger. The condition means this
-- can never be used to delete today's (or future) data, only past days.
create policy "Anyone can delete results from a past day"
  on public.results for delete
  using (day < (timezone('utc', now()))::date);

-- Helpful index for the daily leaderboard query (filter by day, fetched often).
create index results_day_idx on public.results (day);
