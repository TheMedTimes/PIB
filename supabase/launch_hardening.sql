-- Launch hardening. Run once in the Supabase SQL Editor, AFTER switch_to_ist.sql.
-- Non-destructive: only adds rules, never drops tables or rows. Existing rows
-- are left alone (NOT VALID means the rule applies to new/changed rows only).
--
-- Why this exists: the app is a static website, so anyone technical can skip
-- the app and talk to the database API directly. Rules enforced only in the
-- app's code can be bypassed, rules enforced here cannot.

-- 1. No impossible leaderboard times. A set is 6 pairs (12 taps) and needs
--    reading, so under 5 seconds is not humanly possible. Without this, a
--    direct API call could post a 0 second time and take first place.
alter table public.results drop constraint if exists results_min_time;
alter table public.results
  add constraint results_min_time check (time_seconds >= 5) not valid;

-- 2. Nicknames: same character rules the app enforces (letters, numbers,
--    spaces, dots, dashes, underscores; 2 to 24 long). Stops odd characters,
--    look-alike unicode lettering and markup being injected via the API.
alter table public.profiles drop constraint if exists profiles_nickname_format;
alter table public.profiles
  add constraint profiles_nickname_format check (nickname ~ '^[A-Za-z0-9 ._-]{2,24}$') not valid;

-- 3. Nicknames are unique ignoring letter case ("Ravi" and "ravi" can't both
--    exist). Skipped with a notice if existing nicknames already clash, fix
--    those first (rename one in Table Editor) and re-run this file.
do $$
begin
  if exists (select 1 from public.profiles group by lower(nickname) having count(*) > 1) then
    raise notice 'Skipped the case-insensitive nickname rule: some existing nicknames differ only by letter case. Rename them, then run this file again.';
  else
    create unique index if not exists profiles_nickname_lower_key on public.profiles (lower(nickname));
  end if;
end $$;
