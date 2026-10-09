import { supabase, todayIST, yesterdayIST } from './supabaseClient';

export const SECTIONS = ['moa', 'adr', 'doc'];

// IMPORTANT: every fetch helper below returns `null` (or `undefined` for
// rank) when the request FAILED, which is deliberately different from
// "succeeded and found nothing". A dropped connection must never be read
// as "you haven't solved anything today", that is what used to wipe the
// green tinge from Home whenever a request failed.

// Today's (IST) completed sections for this user, as { moa, adr, doc }
// with seconds or null. Returns null on failure.
export async function fetchTodayStatus(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('results')
    .select('section, time_seconds')
    .eq('user_id', userId)
    .eq('day', todayIST());

  if (error) {
    console.error("Failed to fetch today's status:", error);
    return null;
  }

  const status = { moa: null, adr: null, doc: null };
  for (const row of data) status[row.section] = row.time_seconds;
  return status;
}

// Current rank (1-based) on today's cumulative leaderboard. null = not
// ranked (hasn't completed all three sections), undefined = request failed.
export async function fetchRank(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('results')
    .select('user_id, section, time_seconds')
    .eq('day', todayIST());
  if (error) {
    console.error('Failed to fetch rank:', error);
    return undefined;
  }

  const byUser = new Map();
  for (const row of data) {
    const entry = byUser.get(row.user_id) || {};
    entry[row.section] = row.time_seconds;
    byUser.set(row.user_id, entry);
  }

  const totals = [...byUser.entries()]
    .filter(([, sections]) => SECTIONS.every((s) => sections[s] !== undefined))
    .map(([uid, sections]) => ({ uid, total: SECTIONS.reduce((sum, s) => sum + sections[s], 0) }))
    .sort((a, b) => a.total - b.total);

  const index = totals.findIndex((t) => t.uid === userId);
  return index === -1 ? null : index + 1;
}

// { current_streak, last_completed_day }, or null on failure.
export async function fetchStreak(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('streaks')
    .select('current_streak, last_completed_day')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch streak:', error);
    return null;
  }
  return data || { current_streak: 0, last_completed_day: null };
}

// Safe to call repeatedly: does nothing if today is already counted.
// Increments if yesterday was the last completed day, otherwise restarts
// at 1.
export async function bumpStreakIfNeeded(userId) {
  if (!userId) return;
  const today = todayIST();
  const existing = await fetchStreak(userId);
  if (!existing) return; // couldn't read it, don't guess

  if (existing.last_completed_day === today) return; // already counted today

  const nextStreak = existing.last_completed_day === yesterdayIST() ? existing.current_streak + 1 : 1;

  const { error } = await supabase
    .from('streaks')
    .upsert({ user_id: userId, current_streak: nextStreak, last_completed_day: today, updated_at: new Date().toISOString() });

  if (error) console.error('Failed to update streak:', error);
}
