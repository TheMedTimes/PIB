import { Link } from 'react-router-dom';
import { Settings, AlertTriangle, Pill, Trophy, User } from 'lucide-react';
import TopBar from './TopBar';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const sections = [
  { key: 'moa', label: 'MOA', sub: 'Mechanism of Action', accent: 'teal', Icon: Settings },
  { key: 'adr', label: 'ADR', sub: 'Adverse Drug Reactions', accent: 'pink', Icon: AlertTriangle },
  { key: 'doc', label: 'DOC', sub: 'Drugs of Choice', accent: 'gold', Icon: Pill },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <TopBar />
      <div className="home-wrap">
        <div className="home-sections">
          {sections.map(({ key, label, sub, accent, Icon }) => (
            <Link key={key} to={`/${key}`} className={`home-card accent-${accent}`}>
              <Icon className="home-card-icon" strokeWidth={2.25} />
              <span className="home-card-label pixel-text">{label}</span>
              <span className="home-card-sub">{sub}</span>
            </Link>
          ))}
        </div>

        <div className="home-sections home-sections-utility">
          <Link to="/leaderboard" className="home-card accent-purple">
            <Trophy className="home-card-icon" strokeWidth={2.25} />
            <span className="home-card-label pixel-text">LEADERBOARD</span>
          </Link>
          <Link to="/account" className="home-card accent-muted">
            <User className="home-card-icon" strokeWidth={2.25} />
            <span className="home-card-label pixel-text">{user ? 'PROFILE' : 'LOGIN'}</span>
            {!user && <span className="home-card-sub">Optional, saves your times</span>}
          </Link>
        </div>

        <p className="home-footnote">New set every day. 6 pairs per section.</p>
      </div>
    </>
  );
}
