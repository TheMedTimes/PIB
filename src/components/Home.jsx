import { Link } from 'react-router-dom';
import './Home.css';

const sections = [
  { key: 'moa', label: 'MOA', sub: 'Mechanism of Action', accent: 'teal', icon: '⚙️' },
  { key: 'adr', label: 'ADR', sub: 'Adverse Drug Reactions', accent: 'coral', icon: '⚠️' },
  { key: 'therapy', label: 'THERAPY', sub: 'Clinical Therapeutics', accent: 'gold', icon: '💊' },
];

export default function Home() {
  return (
    <div className="home-wrap">
      <header className="home-header">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="home-bottle" />
        <h1 className="pixel-text home-title">P.I.B.</h1>
        <p className="home-sub">Pharmac In a Bottle</p>
        <p className="home-credit">by TheMedTimes</p>
      </header>

      <div className="home-sections">
        {sections.map((s) => (
          <Link key={s.key} to={`/${s.key}`} className={`home-card accent-${s.accent}`}>
            <span className="home-card-icon">{s.icon}</span>
            <span className="home-card-label pixel-text">{s.label}</span>
            <span className="home-card-sub">{s.sub}</span>
          </Link>
        ))}
      </div>

      <p className="home-footnote">New set every day · 6 pairs per section</p>
    </div>
  );
}
