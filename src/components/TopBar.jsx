import { Link } from 'react-router-dom';
import { Volume2, VolumeX, ChevronLeft, Flame } from 'lucide-react';
import { isMuted, setMuted } from '../utils/sound';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTodayStatus } from '../context/TodayStatusContext';
import './TopBar.css';

export default function TopBar({ back, title, accent, confirmLeave }) {
  const [muted, setMutedState] = useState(isMuted());
  const { user } = useAuth();
  const { streak } = useTodayStatus();

  function toggleMute() {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  }

  function handleNavClick(e) {
    if (confirmLeave && !window.confirm("Leave now? Your progress on this set won't be saved.")) {
      e.preventDefault();
    }
  }

  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand" onClick={handleNavClick}>
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="topbar-icon" />
        <div className="topbar-text">
          <span className="pixel-text topbar-title">P.I.B.</span>
          <span className="topbar-sub">Pharmac In a Bottle &middot; TheMedTimes</span>
        </div>
      </Link>

      <div className="topbar-right">
        {back && (
          <Link to="/" className="topbar-back pixel-text" onClick={handleNavClick}>
            <ChevronLeft size={14} strokeWidth={3} /> Back
          </Link>
        )}
        {user && streak > 0 && (
          <div className="topbar-streak" title={`${streak}-day streak`} aria-label={`${streak}-day streak`}>
            <Flame className="topbar-streak-icon" strokeWidth={2.25} />
            <span className="pixel-text topbar-streak-count">{streak}</span>
          </div>
        )}
        <button
          className="topbar-mute"
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          onClick={toggleMute}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {title && (
        <div className={`topbar-section-title pixel-text accent-${accent || 'teal'}`}>{title}</div>
      )}
    </header>
  );
}
