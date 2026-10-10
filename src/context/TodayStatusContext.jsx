import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { todayIST } from '../utils/supabaseClient';
import { SECTIONS, fetchTodayStatus, fetchRank, fetchStreak, bumpStreakIfNeeded } from '../utils/todayStatus';
import { getPending, queueResult, flushPending } from '../utils/resultOutbox';

// One place that knows which sections you've finished today (IST), your
// leaderboard rank, your streak, and any results still waiting to upload.
// It sits above the router, so:
//   - it survives navigating between Home and the section pages
//   - an upload that finishes AFTER you've pressed Back still updates Home
//   - completions only ever get ADDED for the day: a failed or empty
//     refresh can never remove a section you've already finished
//   - a finished set is stored on this device first (see resultOutbox.js)
//     and uploaded with retries, so a failed request never loses it
const EMPTY = { moa: null, adr: null, doc: null };
const RETRY_EVERY_MS = 10000;
const TodayStatusContext = createContext(null);

const allDone = (s) => SECTIONS.every((k) => s[k] !== null);

export function TodayStatusProvider({ children }) {
  const { user, profile } = useAuth();
  const userId = user?.id || null;
  const canSave = !!userId && !!profile; // results need a profile row (foreign key)

  const [status, setStatus] = useState(EMPTY);
  const [rank, setRank] = useState(null);
  const [streak, setStreak] = useState(0);
  const [unsaved, setUnsaved] = useState([]);

  const statusRef = useRef(EMPTY);
  const keyRef = useRef(null);
  const lastRefreshRef = useRef(0);
  const canSaveRef = useRef(false);

  useEffect(() => {
    canSaveRef.current = canSave;
  }, [canSave]);

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

  // Uploads whatever is waiting on this device. Returns how many got saved.
  const flushOutbox = useCallback(
    async (force = false) => {
      if (!userId || !canSaveRef.current) return 0;
      if (!force && typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
      const { saved } = await flushPending(userId, { force });
      setUnsaved(getPending(userId));
      if (saved.length) {
        ensureKey();
        const incoming = {};
        for (const e of saved) incoming[e.section] = e.seconds;
        addCompleted(incoming);
      }
      return saved.length;
    },
    [userId, ensureKey, addCompleted]
  );

  const loadAll = useCallback(async () => {
    if (!userId) return;
    ensureKey();

    // Anything stuck from an earlier failed upload goes first.
    await flushOutbox();

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
  }, [userId, ensureKey, addCompleted, flushOutbox]);

  // Load on login / person change, clear on logout.
  useEffect(() => {
    if (!userId) {
      keyRef.current = null;
      statusRef.current = EMPTY;
      setStatus(EMPTY);
      setRank(null);
      setStreak(0);
      setUnsaved([]);
      return undefined;
    }
    setStreak(0);
    setUnsaved(getPending(userId));
    loadAll();
    return undefined;
  }, [userId, loadAll]);

  // The profile arrives a moment after login (or after picking a nickname):
  // that's the moment anything waiting on it can finally upload.
  useEffect(() => {
    if (canSave) loadAll();
  }, [canSave, loadAll]);

  // Refresh when the app comes back to the foreground (also handles the
  // IST day rolling over while the app stayed open). Throttled. Regaining
  // the connection always refreshes, no throttle.
  useEffect(() => {
    if (!userId) return undefined;
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 10000) return;
      lastRefreshRef.current = now;
      loadAll();
    }
    function onOnline() {
      loadAll();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [userId, loadAll]);

  // While something is waiting to upload, keep trying.
  const hasRetryable = unsaved.some((e) => !e.permanent);
  useEffect(() => {
    if (!canSave || !hasRetryable) return undefined;
    const id = setInterval(async () => {
      const saved = await flushOutbox();
      if (saved) loadAll();
    }, RETRY_EVERY_MS);
    return () => clearInterval(id);
  }, [canSave, hasRetryable, flushOutbox, loadAll]);

  // Called by a section page when a set is finished. The time is stored on
  // this device immediately, the tile turns green, then it's uploaded.
  // Resolves true once the server has it.
  const submitResult = useCallback(
    async (section, seconds) => {
      if (!userId) return false;
      ensureKey();
      queueResult(userId, section, seconds);
      setUnsaved(getPending(userId));
      addCompleted({ [section]: seconds });
      const saved = await flushOutbox(true);
      if (saved) await loadAll();
      return !getPending(userId).some((e) => e.section === section);
    },
    [userId, ensureKey, addCompleted, flushOutbox, loadAll]
  );

  // Manual "Retry" button.
  const retryUnsaved = useCallback(async () => {
    const saved = await flushOutbox(true);
    if (saved) await loadAll();
  }, [flushOutbox, loadAll]);

  // Called when a section page discovers an already-saved result.
  const noteCompleted = useCallback(
    (section, seconds) => {
      if (!userId) return;
      ensureKey();
      addCompleted({ [section]: seconds });
    },
    [userId, ensureKey, addCompleted]
  );

  const value = { status, rank, streak, unsaved, submitResult, retryUnsaved, noteCompleted, refresh: loadAll };
  return <TodayStatusContext.Provider value={value}>{children}</TodayStatusContext.Provider>;
}

export function useTodayStatus() {
  const ctx = useContext(TodayStatusContext);
  if (!ctx) throw new Error('useTodayStatus must be used inside TodayStatusProvider');
  return ctx;
}
