import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig';
import { IST_OFFSET_MS } from './dailyRotation';

// persistSession (on by default) is what makes login survive closing and
// reopening the app, the session is kept in localStorage automatically.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// India Standard Time calendar day as 'YYYY-MM-DD'. This is the single
// definition of "today" for the whole app: the daily question set, the
// results table, the leaderboard, and streaks all flip at midnight IST,
// for every visitor, regardless of their own device timezone. It has to
// match the `day` column default in the database (Asia/Kolkata), see
// supabase/switch_to_ist.sql.
export function todayIST() {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function yesterdayIST() {
  return new Date(Date.now() + IST_OFFSET_MS - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
