import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, AlertTriangle, Pill, Trophy, User, Flame } from 'lucide-react';
import TopBar from './TopBar';
import { useAuth } from '../context/AuthContext';
import { playTap } from '../utils/sound';
import { hapticTap } from '../utils/haptics';
import { fetchTodayStatus, fetchRank, fetchStreak } from '../utils/todayStatus';
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
  const [status, setStatus] = useState({ moa: null, adr: null, doc: null, allThreeDone: false });
  const [rank, setRank] = useState(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setStatus({ moa: null, adr: null, doc: null, allThreeDone: false });
      setRank(null);
      setStreak(0);
      return undefined;
    }

    fetchTodayStatus(user.id).then((s) => {
      if (cancelled) return;
      setStatus(s);
      if (s.allThreeDone) fetchRank(user.id).then((r) => !cancelled && setRank(r));
    });
    fetchStreak(user.id).then((s) => !cancelled && setStreak(s.current_streak || 0));

    return () => { cancelled = true; };
  }, [user]);

  return (
    <>
      <TopBar />
      <div className="home-wrap">
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
            <span className="home-card-label pixel-text">LEADERBOARD</span>
            {rank && <span className="home-card-rank pixel-text">#{rank}</span>}
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
