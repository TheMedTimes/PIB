import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import TopBar from './TopBar';
import MatchGame from './MatchGame';
import { getTodaysSet, poolSizeWarning } from '../utils/dailyRotation';
import { useAuth } from '../context/AuthContext';
import { supabase, todayUTC } from '../utils/supabaseClient';
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

  const [data, setData] = useState(null);
  const [checking, setChecking] = useState(!!user);
  const [todaysResult, setTodaysResult] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [pendingSeconds, setPendingSeconds] = useState(null);
  const [retrying, setRetrying] = useState(false);

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
      if (!user || !config) {
        setChecking(false);
        return;
      }
      setChecking(true);
      const { data: row, error } = await supabase
        .from('results')
        .select('time_seconds')
        .eq('user_id', user.id)
        .eq('section', section)
        .eq('day', todayUTC())
        .maybeSingle();
      if (error) console.error('Failed to check today\'s result:', error);
      if (!cancelled) {
        setTodaysResult(row || null);
        setChecking(false);
      }
    }
    checkExisting();
    return () => { cancelled = true; };
  }, [user, section, config]);

  async function saveResult(totalSeconds) {
    const { error } = await supabase.from('results').insert({
      user_id: user.id,
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
    // the database genuinely has today's result, so it's safe to lock.
    setSaveError(null);
    setPendingSeconds(null);
    setTodaysResult({ time_seconds: totalSeconds });
    return true;
  }

  async function handleComplete({ totalSeconds }) {
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
      <TopBar back title={config.title} accent={config.accent} />
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
            Your profile is still finishing setup (this can happen right after signing up). Your time
            will not be saved until that completes, refresh in a moment if you just signed up.
          </p>
        )}

        <div className="arcade-frame section-frame">
          {!data || checking ? (
            <p className="section-checking">Loading today's set...</p>
          ) : todaysResult ? (
            <div className="match-complete">
              <CheckCircle2 className="match-complete-icon" strokeWidth={2} />
              <h2 className="pixel-text">Already done for today</h2>
              <p className="match-complete-time pixel-text">{formatTime(todaysResult.time_seconds)}</p>
              <p className="match-complete-sub">One attempt per section per day. Come back tomorrow for a new set.</p>
            </div>
          ) : (
            <MatchGame items={items} accentClass={config.accent} onComplete={handleComplete} />
          )}
        </div>
      </div>
    </>
  );
}
