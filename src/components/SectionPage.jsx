import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import TopBar from './TopBar';
import MatchGame from './MatchGame';
import { getTodaysSet, poolSizeWarning } from '../utils/dailyRotation';
import { useAuth } from '../context/AuthContext';
import { supabase, todayIST } from '../utils/supabaseClient';
import { useTodayStatus } from '../context/TodayStatusContext';
import './SectionPage.css';

// Each section's ~50KB data file is loaded on demand (dynamic import)
// instead of all three being bundled into every page load, a visit to
// /moa never has to download ADR's or DOC's data.
const SECTION_META = {
  moa: { title: 'MOA', sub: 'Mechanism of Action', accent: 'teal', loadData: () => import('../data/moa.json') },
  adr: { title: 'ADR', sub: 'Adverse Drug Reactions', accent: 'pink', loadData: () => import('../data/adr.json') },
  doc: { title: 'DOC', sub: 'Drugs of Choice', accent: 'gold', loadData: () => import('../data/doc.json') },
};

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SectionPage() {
  const { section } = useParams();
  const config = SECTION_META[section];
  const { user, profile } = useAuth();
  const userId = user?.id || null;
  const { markCompleted, noteCompleted } = useTodayStatus();

  const [data, setData] = useState(null);
  const [checking, setChecking] = useState(!!user);
  // priorResult: a result that already existed in the database BEFORE this
  // page even loaded, this is what triggers the cold "already done for
  // today" lock screen in place of the game itself. It deliberately does
  // NOT get set when you finish a set in this session, finishing should
  // show the match game's own celebration screen, not this lock screen.
  // The lock screen is only for someone who already played earlier and
  // comes back later the same day.
  const [priorResult, setPriorResult] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [pendingSeconds, setPendingSeconds] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [hasProgress, setHasProgress] = useState(false); // at least one match made this visit
  const [gameFinished, setGameFinished] = useState(false);
  const leaveWarningActive = hasProgress && !gameFinished;

  // Warn before closing the tab/app or hitting browser back/refresh while
  // a set is genuinely in progress (at least one match made, not finished).
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!leaveWarningActive) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [leaveWarningActive]);

  useEffect(() => {
    setData(null);
    if (!config) return;
    let cancelled = false;
    config.loadData().then((mod) => {
      if (!cancelled) setData(mod.default);
    });
    return () => { cancelled = true; };
  }, [config]);

  const { items } = useMemo(() => (data ? getTodaysSet(data) : { items: [] }), [data]);
  const warning = data ? poolSizeWarning(data) : null;

  useEffect(() => {
    let cancelled = false;
    async function checkExisting() {
      if (!userId || !config) {
        setChecking(false);
        return;
      }
      setChecking(true);
      const { data: row, error } = await supabase
        .from('results')
        .select('time_seconds')
        .eq('user_id', userId)
        .eq('section', section)
        .eq('day', todayIST())
        .maybeSingle();
      if (error) console.error('Failed to check today\'s result:', error);
      if (!cancelled) {
        setPriorResult(row || null);
        if (row) noteCompleted(section, row.time_seconds);
        setChecking(false);
      }
    }
    checkExisting();
    return () => { cancelled = true; };
  }, [userId, section, config, noteCompleted]);

  async function saveResult(totalSeconds) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSaveError('You appear to be offline. Reconnect, then tap retry, your set is already cleared, this just saves the time.');
      setPendingSeconds(totalSeconds);
      return false;
    }

    const { error } = await supabase.from('results').insert({
      user_id: userId,
      section,
      time_seconds: totalSeconds,
    });

    if (error && error.code !== '23505') {
      // Genuine failure (not just "already saved elsewhere"): do NOT lock
      // the screen, since nothing actually made it into the database.
      console.error('Failed to save result:', error);
      setSaveError(
        `Could not save your time (${error.message || error.code || 'unknown error'}). Tap retry, your set is already cleared, this just saves the time.`
      );
      setPendingSeconds(totalSeconds);
      return false;
    }

    // Either the insert succeeded, or it failed with 23505 (unique
    // violation) meaning a row for today already exists, both cases mean
    // the database genuinely has today's result. Deliberately NOT setting
    // priorResult here, MatchGame is already showing its own "Set
    // cleared!" screen with this exact time, that should stay visible for
    // the rest of this session. The colder "already done" lock screen is
    // reserved for a fresh page load on a later visit.
    setSaveError(null);
    setPendingSeconds(null);
    setJustSaved(true);

    // Hand over to the shared store (it outlives this page): turns the Home
    // tile green right away, then reconciles with the server, updates the
    // streak and rank. Not awaited, so a slow follow-up never delays the UI.
    markCompleted(section, totalSeconds).catch((e) => console.error('Status refresh failed:', e));

    return true;
  }

  async function handleComplete({ totalSeconds }) {
    setGameFinished(true); // the match itself is done, nothing left to lose by leaving now
    if (!user) return; // guests play freely, nothing to save
    await saveResult(totalSeconds);
  }

  async function handleRetry() {
    if (pendingSeconds == null) return;
    setRetrying(true);
    await saveResult(pendingSeconds);
    setRetrying(false);
  }

  if (!config) {
    return (
      <>
        <TopBar back title="Not found" />
        <div className="section-wrap">
          <p>Unknown section.</p>
          <Link to="/" className="pixel-text">Back home</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar back title={config.title} accent={config.accent} confirmLeave={leaveWarningActive} />
      <div className="section-wrap">
        <p className="section-sub">{config.sub}</p>

        {warning && <p className="section-dev-note">{warning}</p>}
        {saveError && (
          <div className="section-dev-note">
            <p>{saveError}</p>
            <button className="pixel-btn coral" onClick={handleRetry} disabled={retrying}>
              {retrying ? 'Retrying...' : 'Retry save'}
            </button>
          </div>
        )}

        {user && !profile && (
          <p className="section-dev-note">
            Your time will not be saved until you pick a nickname. <Link to="/account">Choose one here</Link>.
          </p>
        )}

        <div className="arcade-frame section-frame">
          {!data || checking ? (
            <p className="section-checking">Loading today's set...</p>
          ) : priorResult ? (
            <div className="match-complete">
              <CheckCircle2 className="match-complete-icon" strokeWidth={2} />
              <h2 className="pixel-text">Already done for today</h2>
              <p className="match-complete-time pixel-text">{formatTime(priorResult.time_seconds)}</p>
              <p className="match-complete-sub">One attempt per section per day. Come back tomorrow for a new set.</p>
            </div>
          ) : (
            <MatchGame
              items={items}
              accentClass={config.accent}
              onComplete={handleComplete}
              onProgress={() => setHasProgress(true)}
              statusNote={user ? (justSaved ? 'Saved to the leaderboard.' : undefined) : undefined}
            />
          )}
        </div>
      </div>
    </>
  );
}
