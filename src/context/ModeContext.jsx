import { createContext, useCallback, useContext, useState } from 'react';

// Exam = a small set of the most commonly tested facts (default, easier).
// Hard = the full question bank. Each mode has its own daily attempt, times,
// ranks and leaderboard; only the streak is shared.
export const MODES = ['exam', 'hard'];
export const MODE_META = {
  exam: { label: 'EXAM', blurb: 'The high-yield essentials' },
  hard: { label: 'HARD', blurb: 'The full question bank' },
};
const STORAGE_KEY = 'pib.mode.v1';
const DEFAULT_MODE = 'exam';

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(v) ? v : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(readStored);

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice just won't be remembered next visit.
    }
  }, []);

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used inside ModeProvider');
  return ctx;
}
