import { supabase, todayIST, yesterdayIST } from './supabaseClient';

const SECTIONS = ['moa', 'adr', 'doc'];

// Which of today's three sections has this user already completed, and
// have they completed all three (the leaderboard eligibility condition).
export async function fetchTodayStatus(userId) {
  const empty = { moa: null, adr: null, doc: null, allThreeDone: false };
  if (!userId) return empty;

  const { data, error } = await supabase
    .from('results')
    .select('section, time_seconds')
    .eq('user_id', userId)
    .eq('day', todayIST());

  if (error) {
    console.error('Failed to fetch today\'s status:', error);
    return empty;
  }

  const status = { ...empty };
  for (const row of data) status[row.section] = row.time_seconds;
  status.allThreeDone = SECTIONS.every((s) => status[s] !== null);
  return status;
}

// Current rank (1-based) on today's cumulative leaderboard, or null if
// this user hasn't completed all three sections today (not eligible yet).
export async function fetchRank(userId) {
  if (!userId) return null;
  const today = todayIST();

  const { data, error } = await supabase.from('results').select('user_id, section, time_seconds').eq('day', today);
  if (error) {
    console.error('Failed to fetch rank:', error);
    return null;
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

export async function fetchStreak(userId) {
  if (!userId) return { current_streak: 0, last_completed_day: null };
  const { data, error } = await supabase
    .from('streaks')
    .select('current_streak, last_completed_day')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch streak:', error);
    return { current_streak: 0, last_completed_day: null };
  }
  return data || { current_streak: 0, last_completed_day: null };
}

// Called right after a save that completes all three sections for today.
// Increments the streak if yesterday was the last completed day, resets
// to 1 on a gap, and is a no-op if already bumped today.
export async function bumpStreakIfNeeded(userId) {
  if (!userId) return;
  const today = todayIST();
  const existing = await fetchStreak(userId);

  if (existing.last_completed_day === today) return; // already counted today

  const nextStreak = existing.last_completed_day === yesterdayIST() ? existing.current_streak + 1 : 1;

  const { error } = await supabase
    .from('streaks')
    .upsert({ user_id: userId, current_streak: nextStreak, last_completed_day: today, updated_at: new Date().toISOString() });

  if (error) console.error('Failed to update streak:', error);
}
