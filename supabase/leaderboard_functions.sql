-- Server-side leaderboard and rank. Run once in the Supabase SQL Editor, AFTER
-- launch_hardening.sql. Non-destructive: it only adds functions, never touches
-- tables or rows. Safe to re-run.
--
-- Why: the app used to download EVERY player's rows for the day just to show a
-- top 10 and work out your rank, which gets slow and heavy as players grow.
-- Now the database does the sums and sends back only what is shown.
--
-- Safe to deploy in any order: until this is run, the app quietly falls back
-- to the old method, so nothing breaks.
--
-- Ranking rule (same as before, now with a fixed tie-break): lowest total time
-- across MOA + ADR + DOC for today (IST). Players must have all three. If two
-- players tie on total time, whoever finished their last section first ranks
-- higher.

create or replace function public.todays_ranking()
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
    group by r.user_id
    having count(*) = 3
  ) t
  join public.profiles p on p.id = t.user_id;
$$;

-- Top N for the leaderboard screen (capped at 100).
create or replace function public.get_leaderboard(p_limit integer default 10)
returns table (place integer, nickname text, total_seconds integer)
language sql
stable
set search_path = public
as $$
  select place, nickname, total_seconds
  from public.todays_ranking()
  order by place
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;

-- The signed-in player's own rank today, or NULL if they haven't finished all
-- three sections (or aren't signed in).
create or replace function public.get_my_rank()
returns integer
language sql
stable
set search_path = public
as $$
  select place from public.todays_ranking() where user_id = auth.uid();
$$;

grant execute on function public.todays_ranking() to anon, authenticated;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
grant execute on function public.get_my_rank() to anon, authenticated;
