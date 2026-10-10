import { useEffect, useState } from 'react';
import TopBar from './TopBar';
import { supabase, todayIST } from '../utils/supabaseClient';
import './Leaderboard.css';

const SECTIONS = ['moa', 'adr', 'doc'];

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Top 10 for today. The database does the sums and sends back only the
// rows shown (supabase/leaderboard_functions.sql). Until that file has been
// run, the "function not found" error (PGRST202) falls back to the old
// method of downloading everyone's rows.
async function fetchTop10() {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 10 });
  if (!error) {
    return { rows: data.map((r) => ({ nickname: r.nickname || 'Player', total: r.total_seconds })) };
  }
  if (error.code !== 'PGRST202') return { error };
  return fetchTop10Fallback();
}

async function fetchTop10Fallback() {
  const { data, error } = await supabase
    .from('results')
    .select('user_id, section, time_seconds, profiles(nickname)')
    .eq('day', todayIST());
  if (error) return { error };

  const byUser = new Map();
  for (const row of data) {
    const entry = byUser.get(row.user_id) || { nickname: row.profiles?.nickname || 'Player', sections: {} };
    entry.sections[row.section] = row.time_seconds;
    byUser.set(row.user_id, entry);
  }

  const rows = [...byUser.values()]
    .filter((entry) => SECTIONS.every((s) => entry.sections[s] !== undefined))
    .map((entry) => ({
      nickname: entry.nickname,
      total: SECTIONS.reduce((sum, s) => sum + entry.sections[s], 0),
    }))
    .sort((a, b) => a.total - b.total)
    .slice(0, 10);
  return { rows };
}

export default function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const today = todayIST();

      // Opportunistic cleanup: delete any rows from before today. RLS only
      // allows this for day < today, so it can never touch current data.
      await supabase.from('results').delete().lt('day', today);

      const { rows: top, error: fetchError } = await fetchTop10();

      if (cancelled) return;

      if (fetchError) {
        setError('Could not load the leaderboard right now.');
        return;
      }

      setRows(top);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <TopBar back title="Leaderboard" accent="purple" />
      <div className="leaderboard-wrap">
        <p className="leaderboard-sub">
          Today's fastest cumulative times across MOA, ADR, and DOC. Resets daily. Completing all three
          sections is required to appear here.
        </p>

        {error && <p className="section-dev-note">{error}</p>}

        {rows === null ? (
          <p className="leaderboard-loading">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="leaderboard-empty">No one has completed all three sections today yet. Be the first.</p>
        ) : (
          <div className="arcade-frame leaderboard-frame">
            {rows.map((row, i) => (
              <div key={row.nickname + i} className={`leaderboard-row ${i === 0 ? 'first' : ''}`}>
                <span className="leaderboard-rank pixel-text">{i + 1}</span>
                <span className="leaderboard-name">{row.nickname}</span>
                <span className="leaderboard-time pixel-text">{formatTime(row.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
