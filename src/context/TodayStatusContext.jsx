import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { todayIST } from '../utils/supabaseClient';
import { SECTIONS, fetchTodayStatus, fetchRank, fetchStreak, bumpStreakIfNeeded } from '../utils/todayStatus';

// One place that knows which sections you've finished today (IST), your
// leaderboard rank and your streak. It sits above the router, so:
//   - it survives navigating between Home and the section pages (no
//     blank/flash on every return to Home)
//   - a save that finishes AFTER you've already pressed Back still updates
//     Home, because the save reports in here rather than to a page that
//     may no longer exist
//   - completions only ever get ADDED for the day: a failed or empty
//     refresh can never remove a section you've already finished
const EMPTY = { moa: null, adr: null, doc: null };
const TodayStatusContext = createContext(null);

const allDone = (s) => SECTIONS.every((k) => s[k] !== null);

export function TodayStatusProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id || null;

  const [status, setStatus] = useState(EMPTY);
  const [rank, setRank] = useState(null);
  const [streak, setStreak] = useState(0);

  const statusRef = useRef(EMPTY);
  const keyRef = useRef(null);
  const lastRefreshRef = useRef(0);

  // New person or new IST day => start the day's picture from scratch.
  const ensureKey = useCallback(() => {
    const key = `${userId}|${todayIST()}`;
    if (keyRef.current !== key) {
      keyRef.current = key;
      statusRef.current = EMPTY;
      setStatus(EMPTY);
      setRank(null);
    }
  }, [userId]);

  const addCompleted = useCallback((incoming) => {
    const next = { ...statusRef.current };
    let changed = false;
    for (const s of SECTIONS) {
      if (incoming[s] !== null && incoming[s] !== undefined && next[s] !== incoming[s]) {
        next[s] = incoming[s];
        changed = true;
      }
    }
    if (changed) {
      statusRef.current = next;
      setStatus(next);
    }
  }, []);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    ensureKey();

    const server = await fetchTodayStatus(userId);
    if (server) addCompleted(server);

    const complete = allDone(statusRef.current);

    // Idempotent and cheap, so it's safe on every refresh: also repairs a
    // streak update that failed earlier (e.g. dropped connection).
    if (complete) await bumpStreakIfNeeded(userId);

    const s = await fetchStreak(userId);
    if (s) setStreak(s.current_streak || 0);

    if (complete) {
      const r = await fetchRank(userId);
      if (r !== undefined) setRank(r);
    }
  }, [userId, ensureKey, addCompleted]);

  // Load on login / person change, clear on logout.
  useEffect(() => {
    if (!userId) {
      keyRef.current = null;
      statusRef.current = EMPTY;
      setStatus(EMPTY);
      setRank(null);
      setStreak(0);
      return undefined;
    }
    setStreak(0);
    loadAll();
    return undefined;
  }, [userId, loadAll]);

  // Refresh when the app comes back to the foreground (also handles the
  // IST day rolling over while the app stayed open). Throttled.
  useEffect(() => {
    if (!userId) return undefined;
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 10000) return;
      lastRefreshRef.current = now;
      loadAll();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [userId, loadAll]);

  // Called by a section page after its result is confirmed saved.
  const markCompleted = useCallback(
    async (section, seconds) => {
      if (!userId) return;
      ensureKey();
      addCompleted({ [section]: seconds }); // green immediately
      await loadAll(); // then reconcile with the server, bump streak, get rank
    },
    [userId, ensureKey, addCompleted, loadAll]
  );

  // Called when a section page discovers an already-saved result.
  const noteCompleted = useCallback(
    (section, seconds) => {
      if (!userId) return;
      ensureKey();
      addCompleted({ [section]: seconds });
    },
    [userId, ensureKey, addCompleted]
  );

  const value = { status, rank, streak, markCompleted, noteCompleted, refresh: loadAll };
  return <TodayStatusContext.Provider value={value}>{children}</TodayStatusContext.Provider>;
}

export function useTodayStatus() {
  const ctx = useContext(TodayStatusContext);
  if (!ctx) throw new Error('useTodayStatus must be used inside TodayStatusProvider');
  return ctx;
}
