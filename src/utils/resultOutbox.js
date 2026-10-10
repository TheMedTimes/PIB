import { supabase, todayIST, withTimeout } from './supabaseClient';

// A finished set is written to this device FIRST, then uploaded. If the
// upload fails, hangs, or the app is closed/suspended mid-request, the time
// is still here and is retried automatically (on a timer, when the app comes
// back to the foreground, when the connection returns, and after login or
// picking a nickname). Nothing is ever lost just because one request failed.
//
// Entries are keyed by user + section + IST day. Only the first completed
// time per key is kept, matching the database's one-attempt-per-day rule.

const KEY = 'pib.unsaved-results.v1';
const SEND_TIMEOUT_MS = 15000;
const REFRESH_COOLDOWN_MS = 60000;
// Errors that will never succeed by retrying (here: the 5s minimum-time rule).
const PERMANENT_CODES = new Set(['23514']);

let lastSessionRefresh = 0;
let inFlight = null;

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full/blocked: the in-flight attempt still goes ahead.
  }
}

const same = (a, b) => a.userId === b.userId && a.section === b.section && a.day === b.day;

// Unsaved results for this person for the current IST day. Anything from a
// past day is dropped: the database only accepts today's date.
export function getPending(userId) {
  const today = todayIST();
  return load().filter((e) => e.userId === userId && e.day === today);
}

export function queueResult(userId, section, seconds) {
  const day = todayIST();
  const list = load().filter((e) => e.day === day);
  const entry = { userId, section, seconds, day, attempts: 0, lastError: null, permanent: false };
  if (!list.some((e) => same(e, entry))) list.push(entry);
  persist(list);
}

function patch(entry, changes) {
  persist(load().map((e) => (same(e, entry) ? { ...e, ...changes } : e)));
}

function remove(entry) {
  persist(load().filter((e) => !same(e, entry)));
}

async function insertOnce(entry) {
  const { signal, clear } = withTimeout(SEND_TIMEOUT_MS);
  try {
    const { error } = await supabase
      .from('results')
      .insert({ user_id: entry.userId, section: entry.section, time_seconds: entry.seconds })
      .abortSignal(signal);
    return error || null;
  } catch (e) {
    return { code: 'NETWORK', message: e?.message || 'Network error' };
  } finally {
    clear();
  }
}

// A request sent with an expired login arrives as "anonymous" and is
// rejected by the security rules (42501) or by the API (JWT errors).
const looksLikeAuthProblem = (e) =>
  e.code === '42501' || e.code === 'PGRST301' || e.code === 'PGRST303' || /jwt/i.test(e.message || '');

async function trySave(entry) {
  let error = await insertOnce(entry);
  if (error && looksLikeAuthProblem(error) && Date.now() - lastSessionRefresh > REFRESH_COOLDOWN_MS) {
    lastSessionRefresh = Date.now();
    try {
      await supabase.auth.refreshSession();
    } catch {
      // fall through, the retry below reports the real outcome
    }
    error = await insertOnce(entry);
  }
  return error;
}

async function run(userId, { force }) {
  const saved = [];
  for (const entry of getPending(userId)) {
    if (entry.permanent && !force) continue;
    const error = await trySave(entry);
    // 23505 = a row for today already exists, so the database has it.
    if (!error || error.code === '23505') {
      remove(entry);
      saved.push(entry);
    } else {
      console.error('Saving result failed:', error);
      patch(entry, {
        attempts: (entry.attempts || 0) + 1,
        lastError: error.message || error.code || 'Unknown error',
        permanent: PERMANENT_CODES.has(error.code),
      });
    }
  }
  return { saved };
}

// Uploads everything pending for this person. Concurrent callers share one
// run, so a timer tick and a manual retry never race each other.
export function flushPending(userId, { force = false } = {}) {
  if (!inFlight) {
    const p = run(userId, { force }).finally(() => {
      inFlight = null;
    });
    inFlight = p;
  }
  return inFlight;
}
