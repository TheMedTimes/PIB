-- Adds the streak feature. This is a separate, additive migration, run it
-- once in the Supabase SQL Editor. Unlike schema.sql, this does NOT drop
-- any existing tables, it's safe to run alongside real user data.

create table if not exists public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  last_completed_day date,
  updated_at timestamptz not null default now()
);

alter table public.streaks enable row level security;

-- Only two integers and a date, nothing sensitive, public read keeps this
-- consistent with the other tables and leaves room to show streaks on
-- the leaderboard later if ever wanted.
drop policy if exists "Streaks are publicly readable" on public.streaks;
create policy "Streaks are publicly readable"
  on public.streaks for select
  using (true);

drop policy if exists "Users can create their own streak row" on public.streaks;
create policy "Users can create their own streak row"
  on public.streaks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own streak row" on public.streaks;
create policy "Users can update their own streak row"
  on public.streaks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
