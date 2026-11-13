import { useEffect, useState } from 'react';
import TopBar from './TopBar';
import ModeToggle from './ModeToggle';
import { useMode, MODE_META } from '../context/ModeContext';
import { supabase, todayIST } from '../utils/supabaseClient';
import './Leaderboard.css';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Top 10 for today in one mode. The database does the sums and sends back
// only the rows shown (supabase/exam_mode.sql).
async function fetchTop10(mode) {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 10, p_mode: mode });
  if (error) return { error };
  return { rows: data.map((r) => ({ nickname: r.nickname || 'Player', total: r.total_seconds })) };
}

export default function Leaderboard() {
  const { mode } = useMode();
  // Rows are stored with the mode they belong to, so switching mode shows
  // "Loading..." instead of briefly showing the other mode's board.
  const [board, setBoard] = useState({ mode: null, rows: null });
  const [error, setError] = useState(null);
  const rows = board.mode === mode ? board.rows : null;

  useEffect(() => {
    let cancelled = false;
    setError(null);

    async function load() {
      const today = todayIST();

      // Opportunistic cleanup: delete any rows from before today. RLS only
      // allows this for day < today, so it can never touch current data.
      await supabase.from('results').delete().lt('day', today);

      const { rows: top, error: fetchError } = await fetchTop10(mode);

      if (cancelled) return;

      if (fetchError) {
        setError('Could not load the leaderboard right now.');
        return;
      }

      setBoard({ mode, rows: top });
    }

    load();
    return () => { cancelled = true; };
  }, [mode]);

  return (
    <>
      <TopBar back title="Leaderboard" accent="purple" />
      <div className="leaderboard-wrap">
        <ModeToggle />

        <p className="leaderboard-sub">
          Today's fastest cumulative times across MOA, ADR, and DOC in {MODE_META[mode].label} mode. Each mode has
          its own board. Resets daily. Completing all three sections is required to appear here.
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
