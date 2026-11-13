import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useMode, MODES } from './ModeContext';
import { todayIST } from '../utils/supabaseClient';
import { SECTIONS, fetchTodayStatus, fetchRank, fetchStreak, bumpStreakIfNeeded } from '../utils/todayStatus';
import { getPending, queueResult, flushPending } from '../utils/resultOutbox';

// One place that knows, for each mode (Exam / Hard), which sections you've
// finished today (IST), your leaderboard rank, plus your streak (shared
// across modes) and any results still waiting to upload.
// It sits above the router, so:
//   - it survives navigating between Home and the section pages
//   - an upload that finishes AFTER you've pressed Back still updates Home
//   - completions only ever get ADDED for the day: a failed or empty
//     refresh can never remove a section you've already finished
//   - a finished set is stored on this device first (see resultOutbox.js)
//     and uploaded with retries, so a failed request never loses it
const EMPTY_MODE = { moa: null, adr: null, doc: null };
const EMPTY = { exam: EMPTY_MODE, hard: EMPTY_MODE };
const NO_RANKS = { exam: null, hard: null };
const RETRY_EVERY_MS = 10000;
const TodayStatusContext = createContext(null);

const allDone = (s) => SECTIONS.every((k) => s[k] !== null);

export function TodayStatusProvider({ children }) {
  const { user, profile } = useAuth();
  const { mode } = useMode();
  const userId = user?.id || null;
  const canSave = !!userId && !!profile; // results need a profile row (foreign key)

  const [statusByMode, setStatusByMode] = useState(EMPTY);
  const [ranks, setRanks] = useState(NO_RANKS);
  const [streak, setStreak] = useState(0);
  const [unsaved, setUnsaved] = useState([]);
  // True once the server has told us today's progress at least once, so a
  // page can tell "nothing finished yet" apart from "haven't heard back yet".
  const [statusLoaded, setStatusLoaded] = useState(false);

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
      setStatusByMode(EMPTY);
      setRanks(NO_RANKS);
      setStatusLoaded(false);
    }
  }, [userId]);

  // incoming: { moa, adr, doc } seconds for one mode. Only ever adds.
  const addCompleted = useCallback((forMode, incoming) => {
    const current = statusRef.current[forMode];
    const next = { ...current };
    let changed = false;
    for (const s of SECTIONS) {
      if (incoming[s] !== null && incoming[s] !== undefined && next[s] !== incoming[s]) {
        next[s] = incoming[s];
        changed = true;
      }
    }
    if (changed) {
      statusRef.current = { ...statusRef.current, [forMode]: next };
      setStatusByMode(statusRef.current);
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
        for (const e of saved) addCompleted(e.mode, { [e.section]: e.seconds });
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
    if (server) {
      for (const m of MODES) addCompleted(m, server[m]);
      setStatusLoaded(true);
    }

    // The streak is shared: a day counts if all three sections are done in
    // EITHER mode.
    const complete = MODES.some((m) => allDone(statusRef.current[m]));

    // Idempotent and cheap, so it's safe on every refresh: also repairs a
    // streak update that failed earlier (e.g. dropped connection).
    if (complete) await bumpStreakIfNeeded(userId);

    const s = await fetchStreak(userId);
    if (s) setStreak(s.current_streak || 0);

    // Ranks are per mode, and only exist once that mode's three are done.
    const doneModes = MODES.filter((m) => allDone(statusRef.current[m]));
    if (doneModes.length) {
      const results = await Promise.all(doneModes.map((m) => fetchRank(userId, m)));
      setRanks((prev) => {
        const next = { ...prev };
        doneModes.forEach((m, i) => {
          if (results[i] !== undefined) next[m] = results[i];
        });
        return next;
      });
    }
  }, [userId, ensureKey, addCompleted, flushOutbox]);

  // Load on login / person change, clear on logout.
  useEffect(() => {
    if (!userId) {
      keyRef.current = null;
      statusRef.current = EMPTY;
      setStatusByMode(EMPTY);
      setRanks(NO_RANKS);
      setStreak(0);
      setUnsaved([]);
      setStatusLoaded(false);
      return undefined;
    }
    setStreak(0);
    setUnsaved(getPending(userId));
    loadAll();
    return undefined;
  }, [userId, loadAll]);

  // The profile arrives a moment after login (or after picking a nickname):
  // that's the moment anything waiting on it can finally upload.
  // (Only the upload: the login effect above already loaded status/streak.)
  useEffect(() => {
    if (!canSave) return;
    flushOutbox().then((saved) => {
      if (saved) loadAll();
    });
  }, [canSave, flushOutbox, loadAll]);

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
    async (forMode, section, seconds) => {
      if (!userId) return false;
      ensureKey();
      queueResult(userId, forMode, section, seconds);
      setUnsaved(getPending(userId));
      addCompleted(forMode, { [section]: seconds });
      const saved = await flushOutbox(true);
      if (saved) await loadAll();
      return !getPending(userId).some((e) => e.mode === forMode && e.section === section);
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
    (forMode, section, seconds) => {
      if (!userId) return;
      ensureKey();
      addCompleted(forMode, { [section]: seconds });
    },
    [userId, ensureKey, addCompleted]
  );

  const value = {
    // Everything below `status` / `rank` follows the currently chosen mode.
    status: statusByMode[mode],
    rank: ranks[mode],
    statusLoaded,
    streak,
    unsaved,
    submitResult,
    retryUnsaved,
    noteCompleted,
    refresh: loadAll,
  };
  return <TodayStatusContext.Provider value={value}>{children}</TodayStatusContext.Provider>;
}

export function useTodayStatus() {
  const ctx = useContext(TodayStatusContext);
  if (!ctx) throw new Error('useTodayStatus must be used inside TodayStatusProvider');
  return ctx;
}
