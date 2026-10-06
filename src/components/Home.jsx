import { Link } from 'react-router-dom';
import TopBar from './TopBar';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const sections = [
  { key: 'moa', label: 'MOA', sub: 'Mechanism of Action', accent: 'teal', icon: '⚙️' },
  { key: 'adr', label: 'ADR', sub: 'Adverse Drug Reactions', accent: 'pink', icon: '⚠️' },
  { key: 'doc', label: 'DOC', sub: 'Drugs of Choice', accent: 'gold', icon: '💊' },
];

export default function Home() {
  const { user, profile } = useAuth();

  return (
    <>
      <TopBar />
      <div className="home-wrap">
        <div className="home-sections">
          {sections.map((s) => (
            <Link key={s.key} to={`/${s.key}`} className={`home-card accent-${s.accent}`}>
              <span className="home-card-icon">{s.icon}</span>
              <span className="home-card-label pixel-text">{s.label}</span>
              <span className="home-card-sub">{s.sub}</span>
            </Link>
          ))}
        </div>

        <div className="home-sections home-sections-utility">
          <Link to="/leaderboard" className="home-card accent-purple">
            <span className="home-card-icon">🏆</span>
            <span className="home-card-label pixel-text">LEADERBOARD</span>
            <span className="home-card-sub">Today's top 10</span>
          </Link>
          <Link to="/account" className="home-card accent-muted">
            <span className="home-card-icon">👤</span>
            <span className="home-card-label pixel-text">{user ? (profile?.nickname || 'PROFILE') : 'LOGIN'}</span>
            <span className="home-card-sub">{user ? 'View your account' : 'Optional, saves your times'}</span>
          </Link>
        </div>

        <p className="home-footnote">New set every day. 6 pairs per section.</p>
      </div>
    </>
  );
}
