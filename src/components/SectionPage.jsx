import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import MatchGame from './MatchGame';
import { getTodaysSet, poolSizeWarning } from '../utils/dailyRotation';
import moaData from '../data/moa.json';
import adrData from '../data/adr.json';
import therapyData from '../data/therapy.json';
import './SectionPage.css';

const SECTION_CONFIG = {
  moa: { title: 'MOA', sub: 'Mechanism of Action', accent: 'teal', data: moaData },
  adr: { title: 'ADR', sub: 'Adverse Drug Reactions', accent: 'coral', data: adrData },
  therapy: { title: 'THERAPY', sub: 'Clinical Therapeutics', accent: 'gold', data: therapyData },
};

export default function SectionPage() {
  const { section } = useParams();
  const config = SECTION_CONFIG[section];

  const { items } = useMemo(() => (config ? getTodaysSet(config.data) : { items: [] }), [config]);
  const warning = config ? poolSizeWarning(config.data) : null;

  if (!config) {
    return (
      <div className="section-wrap">
        <p>Unknown section.</p>
        <Link to="/" className="pixel-text">Back home</Link>
      </div>
    );
  }

  return (
    <div className="section-wrap">
      <div className="section-top">
        <Link to="/" className="section-back pixel-text">&lt; Back</Link>
        <div className="section-heading">
          <h1 className={`pixel-text section-title accent-${config.accent}`}>{config.title}</h1>
          <p className="section-sub">{config.sub}</p>
        </div>
      </div>

      {warning && <p className="section-dev-note">{warning}</p>}

      <div className="arcade-frame section-frame">
        <MatchGame items={items} accentClass={config.accent} />
      </div>
    </div>
  );
}
