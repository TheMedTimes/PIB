import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import TopBar from './TopBar';
import MatchGame from './MatchGame';
import { getTodaysSet, poolSizeWarning } from '../utils/dailyRotation';
import { useAuth } from '../context/AuthContext';
import { supabase, todayUTC } from '../utils/supabaseClient';
import moaData from '../data/moa.json';
import adrData from '../data/adr.json';
import docData from '../data/doc.json';
import './SectionPage.css';

const SECTION_CONFIG = {
  moa: { title: 'MOA', sub: 'Mechanism of Action', accent: 'teal', data: moaData },
  adr: { title: 'ADR', sub: 'Adverse Drug Reactions', accent: 'pink', data: adrData },
  doc: { title: 'DOC', sub: 'Drugs of Choice', accent: 'gold', data: docData },
};

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SectionPage() {
  const { section } = useParams();
  const config = SECTION_CONFIG[section];
  const { user, profile } = useAuth();

  const { items } = useMemo(() => (config ? getTodaysSet(config.data) : { items: [] }), [config]);
  const warning = config ? poolSizeWarning(config.data) : null;

  const [checking, setChecking] = useState(!!user);
  const [todaysResult, setTodaysResult] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function checkExisting() {
      if (!user || !config) {
        setChecking(false);
        return;
      }
      setChecking(true);
      const { data } = await supabase
        .from('results')
        .select('time_seconds')
        .eq('user_id', user.id)
        .eq('section', section)
        .eq('day', todayUTC())
        .maybeSingle();
      if (!cancelled) {
        setTodaysResult(data || null);
        setChecking(false);
      }
    }
    checkExisting();
    return () => { cancelled = true; };
  }, [user, section, config]);

  async function handleComplete({ totalSeconds }) {
    if (!user) return; // guests play freely, nothing to save
    const { error } = await supabase.from('results').insert({
      user_id: user.id,
      section,
      time_seconds: totalSeconds,
    });
    if (error) {
      // A duplicate-key error here just means another tab/device already
      // submitted today's result first, treat it the same as "already played".
      setSaveError(error.code === '23505' ? null : 'Could not save your time, but your set is still cleared.');
    }
    setTodaysResult({ time_seconds: totalSeconds });
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
        {saveError && <p className="section-dev-note">{saveError}</p>}

        {user && !profile && (
          <p className="section-dev-note">
            Your profile is still finishing setup (this can happen right after signing up). Your time
            will not be saved until that completes, refresh in a moment if you just signed up.
          </p>
        )}

        <div className="arcade-frame section-frame">
          {checking ? (
            <p className="section-checking">Checking today's progress...</p>
          ) : todaysResult ? (
            <div className="match-complete">
              <div className="match-complete-icon">✅</div>
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
