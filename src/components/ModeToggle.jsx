import { useMode, MODES, MODE_META } from '../context/ModeContext';
import { playTap } from '../utils/sound';
import { hapticTap } from '../utils/haptics';
import './ModeToggle.css';

// Exam / Hard switch. Shared by Home, Leaderboard and Review; the choice is
// remembered on this device.
export default function ModeToggle({ showBlurb = false }) {
  const { mode, setMode } = useMode();

  function choose(next) {
    if (next === mode) return;
    playTap();
    hapticTap();
    setMode(next);
  }

  return (
    <div className="mode-toggle-wrap">
      <div className="mode-toggle" role="group" aria-label="Question mode">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            className={`mode-toggle-btn pixel-text mode-${m} ${mode === m ? 'active' : ''}`}
            aria-pressed={mode === m}
            onClick={() => choose(m)}
          >
            {MODE_META[m].label}
          </button>
        ))}
      </div>
      {showBlurb && <p className="mode-toggle-blurb">{MODE_META[mode].blurb}</p>}
    </div>
  );
}
