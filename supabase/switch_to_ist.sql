-- Switches the database's definition of "today" from UTC to India Standard
-- Time (Asia/Kolkata, UTC+5:30, no daylight saving). Run this once in the
-- Supabase SQL Editor.
--
-- Non-destructive: it only changes one column default and two security
-- policies. It does NOT drop or recreate any table, so existing data is
-- untouched.
--
-- Must match the app: src/utils/supabaseClient.js (todayIST) and
-- src/utils/dailyRotation.js both use IST as the day boundary.

-- 1. New rows get today's IST date by default.
alter table public.results
  alter column day set default ((timezone('Asia/Kolkata', now()))::date);

-- 2. A result may only be inserted for today (IST), by its own user.
drop policy if exists "Users can submit only their own result for today" on public.results;
create policy "Users can submit only their own result for today"
  on public.results for insert
  with check (
    auth.uid() = user_id
    and day = (timezone('Asia/Kolkata', now()))::date
  );

-- 3. Only past days (IST) are deletable by the opportunistic cleanup.
drop policy if exists "Anyone can delete results from a past day" on public.results;
create policy "Anyone can delete results from a past day"
  on public.results for delete
  using (day < (timezone('Asia/Kolkata', now()))::date);
