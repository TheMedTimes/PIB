import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import TopBar from './TopBar';
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
      <>
        <TopBar back title="Not found" />
        <div className="section-wrap">
          <p>Unknown section.</p>
          <Link to="/" className="pixel-text">Back home</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar back title={config.title} accent={config.accent} />
      <div className="section-wrap">
        <p className="section-sub">{config.sub}</p>

        {warning && <p className="section-dev-note">{warning}</p>}

        <div className="arcade-frame section-frame">
          <MatchGame items={items} accentClass={config.accent} />
        </div>
      </div>
    </>
  );
}
