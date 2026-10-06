import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig';

// persistSession (on by default) is what makes login survive closing and
// reopening the app, the session is kept in localStorage automatically.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UTC calendar day as 'YYYY-MM-DD', matching the `day` column default in
// the database so client-side "already played today?" checks line up with
// what the server considers "today".
export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}
