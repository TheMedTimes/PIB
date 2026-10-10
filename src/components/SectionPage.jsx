import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import TopBar from './TopBar';
import MatchGame from './MatchGame';
import { getTodaysSet, poolSizeWarning } from '../utils/dailyRotation';
import { useAuth } from '../context/AuthContext';
import { supabase, todayIST, withTimeout } from '../utils/supabaseClient';
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

// Keyed by section so moving between sections (e.g. via browser history)
// always starts a fresh page instead of reusing the previous one's state.
export default function SectionPage() {
  const { section } = useParams();
  return <SectionContent key={section} section={section} />;
}

function SectionContent({ section }) {
  const config = SECTION_META[section];
  const { user, profile, loading: authLoading } = useAuth();
  const userId = user?.id || null;
  const { noteCompleted, submitResult, retryUnsaved, unsaved } = useTodayStatus();

  const [data, setData] = useState(null);
  // priorResult: a result that already existed in the database BEFORE this
  // page even loaded, this is what triggers the cold "already done for
  // today" lock screen in place of the game itself. It deliberately does
  // NOT get set when you finish a set in this session, finishing should
  // show the match game's own celebration screen, not this lock screen.
  const [priorResult, setPriorResult] = useState(null);
  const [checkedKey, setCheckedKey] = useState(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [submitted, setSubmitted] = useState(false); // finished a set this visit while signed in
  const [submitting, setSubmitting] = useState(false);
  const [finishedAsGuest, setFinishedAsGuest] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [hasProgress, setHasProgress] = useState(false); // at least one match made this visit
  const [gameFinished, setGameFinished] = useState(false);
  const leaveWarningActive = hasProgress && !gameFinished;

  // True until we know whether this person already played today. Derived
  // from a key (not a flag set in an effect) so there is never a frame where
  // the game shows before the check has even started.
  const checkKey = userId ? `${userId}|${section}` : null;
  const checking = !!checkKey && checkedKey !== checkKey;

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
    if (!config) return undefined;
    let cancelled = false;
    config.loadData().then((mod) => {
      if (!cancelled) setData(mod.default);
    });
    return () => { cancelled = true; };
  }, [config]);

  const { items } = useMemo(() => (data ? getTodaysSet(data) : { items: [] }), [data]);
  const warning = data ? poolSizeWarning(data) : null;

  useEffect(() => {
    if (!userId || !config) return undefined;
    let cancelled = false;
    async function checkExisting() {
      const { signal, clear } = withTimeout(10000);
      let row = null;
      let failed = false;
      try {
        const res = await supabase
          .from('results')
          .select('time_seconds')
          .eq('user_id', userId)
          .eq('section', section)
          .eq('day', todayIST())
          .abortSignal(signal)
          .maybeSingle();
        if (res.error) throw res.error;
        row = res.data;
      } catch (e) {
        console.error("Failed to check today's result:", e);
        failed = true;
      } finally {
        clear();
      }
      if (cancelled) return;
      setCheckFailed(failed);
      setPriorResult(row || null);
      if (row) noteCompleted(section, row.time_seconds);
      setCheckedKey(checkKey);
    }
    checkExisting();
    return () => { cancelled = true; };
  }, [userId, section, config, noteCompleted, checkKey]);

  async function handleComplete({ totalSeconds }) {
    setGameFinished(true); // the match itself is done, nothing left to lose by leaving now
    if (!userId) {
      setFinishedAsGuest(true); // nothing to save without an account
      return;
    }
    setSubmitted(true);
    setSubmitting(true);
    try {
      // Stores the time on this device first, then uploads with retries.
      await submitResult(section, totalSeconds);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      await retryUnsaved();
    } finally {
      setRetrying(false);
    }
  }

  const pendingEntry = unsaved.find((e) => e.section === section);

  let statusNote;
  if (finishedAsGuest) {
    statusNote = (
      <>
        Not saved: you are not signed in. <Link to="/account">Sign in</Link> to record your times.
      </>
    );
  } else if (submitted) {
    if (!pendingEntry) statusNote = 'Saved to the leaderboard.';
    else if (submitting) statusNote = 'Saving your time...';
    else statusNote = 'Not saved yet. Your time is kept on this device and uploads automatically.';
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
        {submitted && pendingEntry && !submitting && (
          <div className="section-dev-note">
            <p>
              {profile
                ? `Could not save your time yet (${pendingEntry.lastError || 'no connection'}). It is stored on this device and will keep retrying, or tap retry.`
                : 'Your time is stored on this device and will upload as soon as you pick a nickname.'}
            </p>
            {profile ? (
              <button className="pixel-btn coral" onClick={handleRetry} disabled={retrying}>
                {retrying ? 'Retrying...' : 'Retry save'}
              </button>
            ) : (
              <Link to="/account">Choose a nickname</Link>
            )}
          </div>
        )}

        {!user && !authLoading && !finishedAsGuest && (
          <p className="section-dev-note">
            You are playing as a guest, so your time will not be saved. <Link to="/account">Sign in</Link>
          </p>
        )}

        {user && !profile && !submitted && (
          <p className="section-dev-note">
            Your time will not be saved until you pick a nickname. <Link to="/account">Choose one here</Link>.
          </p>
        )}

        {user && checkFailed && !submitted && !priorResult && (
          <p className="section-dev-note">
            Could not check whether you already played today. If you did, your first time is the one that counts.
          </p>
        )}

        <div className="arcade-frame section-frame">
          {!data || authLoading || checking ? (
            <p className="section-checking">{authLoading ? 'Signing you in...' : "Loading today's set..."}</p>
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
              statusNote={statusNote}
            />
          )}
        </div>
      </div>
    </>
  );
}
