import { Link } from 'react-router-dom';
import { Settings, AlertTriangle, Pill, Trophy, User, Flame } from 'lucide-react';
import TopBar from './TopBar';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { playTap } from '../utils/sound';
import { hapticTap } from '../utils/haptics';
import { useTodayStatus } from '../context/TodayStatusContext';
import './Home.css';

function tap() {
  playTap();
  hapticTap();
}

const sections = [
  { key: 'moa', label: 'MOA', sub: 'Mechanism of Action', accent: 'teal', Icon: Settings },
  { key: 'adr', label: 'ADR', sub: 'Adverse Drug Reactions', accent: 'pink', Icon: AlertTriangle },
  { key: 'doc', label: 'DOC', sub: 'Drugs of Choice', accent: 'gold', Icon: Pill },
];

export default function Home() {
  const { user } = useAuth();
  const { status, rank, streak, unsaved, retryUnsaved } = useTodayStatus();
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      await retryUnsaved();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <>
      <TopBar />
      <div className="home-wrap">
        {user && unsaved.length > 0 && (
          <div className="home-unsaved">
            <p>
              {unsaved.length === 1 ? '1 result is' : `${unsaved.length} results are`} not saved yet. Stored on
              this device, uploading automatically.
            </p>
            <button className="pixel-btn coral" onClick={handleRetry} disabled={retrying}>
              {retrying ? 'Retrying...' : 'Retry now'}
            </button>
          </div>
        )}

        <div className="home-sections">
          {sections.map(({ key, label, sub, accent, Icon }) => (
            <Link
              key={key}
              to={`/${key}`}
              className={`home-card accent-${accent} ${status[key] !== null ? 'completed' : ''}`}
              onClick={tap}
            >
              <Icon className="home-card-icon" strokeWidth={2.25} />
              <span className="home-card-label pixel-text">{label}</span>
              <span className="home-card-sub">{sub}</span>
            </Link>
          ))}
        </div>

        {user && streak > 0 && (
          <div className="home-streak">
            <Flame className="home-streak-icon" strokeWidth={2.25} />
            <span className="pixel-text home-streak-count">{streak}</span>
          </div>
        )}

        <div className="home-sections home-sections-utility">
          <Link to="/leaderboard" className="home-card accent-purple" onClick={tap}>
            <Trophy className="home-card-icon" strokeWidth={2.25} />
            <span className="home-card-label pixel-text">
              LEADERBOARD{rank && <span className="home-card-rank"> #{rank}</span>}
            </span>
          </Link>
          <Link to="/account" className="home-card accent-muted" onClick={tap}>
            <User className="home-card-icon" strokeWidth={2.25} />
            <span className="home-card-label pixel-text">{user ? 'PROFILE' : 'LOGIN'}</span>
          </Link>
        </div>

        <p className="home-footnote">New set every day. 6 pairs per section.</p>
      </div>
    </>
  );
}
