-- Exam / Hard modes. Run once in the Supabase SQL Editor, AFTER
-- leaderboard_functions.sql, and BEFORE merging the app update that uses it.
-- Non-destructive: no rows are deleted, and re-running is safe.
--
-- What it does:
--   * Adds results.mode ('exam' or 'hard'). Every existing row becomes 'hard',
--     because everything played so far used the full question set.
--   * Makes the one-attempt rule per user + section + day + MODE, so each mode
--     has its own attempt, time and leaderboard. Streaks stay shared (the app
--     counts a day if all three sections are done in either mode).
--   * Replaces the ranking/leaderboard functions with versions that take a
--     mode. The mode defaults to 'hard', so older cached copies of the app
--     (which know nothing about modes) keep working exactly as before.

alter table public.results add column if not exists mode text not null default 'hard';

alter table public.results drop constraint if exists results_mode_check;
alter table public.results add constraint results_mode_check check (mode in ('exam', 'hard'));

-- Swap the primary key, whatever it happens to be called.
do $$
declare
  pk text;
begin
  select conname into pk
  from pg_constraint
  where conrelid = 'public.results'::regclass and contype = 'p';
  if pk is not null then
    execute format('alter table public.results drop constraint %I', pk);
  end if;
  alter table public.results add primary key (user_id, section, day, mode);
end
$$;

create index if not exists results_day_mode_idx on public.results (day, mode);

-- Old single-argument versions go; the new ones below default to 'hard'.
drop function if exists public.get_leaderboard(integer);
drop function if exists public.get_my_rank();
drop function if exists public.todays_ranking();

-- Ranking rule per mode: lowest total time across MOA + ADR + DOC for today
-- (IST); all three sections are required. Ties go to whoever finished their
-- last section first.
create or replace function public.todays_ranking(p_mode text default 'hard')
returns table (user_id uuid, nickname text, total_seconds integer, place integer)
language sql
stable
set search_path = public
as $$
  select t.user_id,
         p.nickname,
         t.total_seconds,
         (row_number() over (order by t.total_seconds, t.finished_at, t.user_id))::integer as place
  from (
    select r.user_id,
           sum(r.time_seconds)::integer as total_seconds,
           max(r.created_at) as finished_at
    from public.results r
    where r.day = (timezone('Asia/Kolkata', now()))::date
      and r.mode = p_mode
    group by r.user_id
    having count(*) = 3
  ) t
  join public.profiles p on p.id = t.user_id;
$$;

create or replace function public.get_leaderboard(p_limit integer default 10, p_mode text default 'hard')
returns table (place integer, nickname text, total_seconds integer)
language sql
stable
set search_path = public
as $$
  select place, nickname, total_seconds
  from public.todays_ranking(p_mode)
  order by place
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;

create or replace function public.get_my_rank(p_mode text default 'hard')
returns integer
language sql
stable
set search_path = public
as $$
  select place from public.todays_ranking(p_mode) where user_id = auth.uid();
$$;

grant execute on function public.todays_ranking(text) to anon, authenticated;
grant execute on function public.get_leaderboard(integer, text) to anon, authenticated;
grant execute on function public.get_my_rank(text) to anon, authenticated;

-- Make the API pick up the new column and functions straight away.
notify pgrst, 'reload schema';
