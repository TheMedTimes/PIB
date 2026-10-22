import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from './TopBar';
import { useAuth } from '../context/AuthContext';
import { useTodayStatus } from '../context/TodayStatusContext';
import { getTodaysSet } from '../utils/dailyRotation';
import { SECTIONS } from '../utils/todayStatus';
import { SECTION_META } from '../utils/sections';
import './Review.css';

// Today's correct pairs for MOA, ADR and DOC. Only for signed-in players who
// have finished all three sections today. It uses the same getTodaysSet() as
// the games, so it is always exactly the set people just played.
export default function Review() {
  const { user, loading: authLoading } = useAuth();
  const { status, statusLoaded, refresh } = useTodayStatus();
  const allDone = SECTIONS.every((s) => status[s] !== null);

  const [sets, setSets] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!user || !allDone) return undefined;
    let cancelled = false;
    Promise.all(SECTIONS.map((s) => SECTION_META[s].loadData()))
      .then((mods) => {
        if (cancelled) return;
        setSets(
          SECTIONS.map((key, i) => ({ key, ...SECTION_META[key], items: getTodaysSet(mods[i].default).items }))
        );
      })
      .catch((e) => {
        console.error('Failed to load review data:', e);
        if (!cancelled) setLoadFailed(true);
      });
    return () => { cancelled = true; };
  }, [user, allDone]);

  // If we can't hear back about today's progress, say so instead of
  // wrongly claiming the sections aren't finished.
  const waitingForStatus = !!user && !allDone && !statusLoaded;
  useEffect(() => {
    if (!waitingForStatus) return undefined;
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [waitingForStatus]);

  let body;
  if (authLoading || (waitingForStatus && !slow)) {
    body = <p className="review-message">Loading...</p>;
  } else if (!user) {
    body = (
      <div className="review-message">
        <p>Log in to see today's answers once you've finished all three sections.</p>
        <Link to="/account" className="pixel-btn">Log in</Link>
      </div>
    );
  } else if (waitingForStatus) {
    body = (
      <div className="review-message">
        <p>Could not check your progress right now. Check your connection and try again.</p>
        <button className="pixel-btn" onClick={() => { setSlow(false); refresh(); }}>Try again</button>
      </div>
    );
  } else if (!allDone) {
    body = (
      <div className="review-message">
        <p>Finish MOA, ADR and DOC today to unlock the answers.</p>
        <Link to="/" className="pixel-btn">Back to games</Link>
      </div>
    );
  } else if (loadFailed) {
    body = <p className="review-message">Could not load today's answers. Check your connection and reopen this page.</p>;
  } else if (!sets) {
    body = <p className="review-message">Loading...</p>;
  } else {
    body = (
      <>
        <p className="review-sub">Today's correct pairs. A new set (and a new review) arrives tomorrow.</p>
        {sets.map(({ key, title, sub, accent, items }) => (
          <section key={key} className={`review-section accent-${accent}`}>
            <h2 className="review-heading">
              <span className="pixel-text review-heading-title">{title}</span>
              <span className="review-heading-sub">{sub}</span>
            </h2>
            <div className="arcade-frame review-frame">
              {items.map((item) => (
                <div key={item.id} className="review-pair">
                  <span className="review-left">{item.left}</span>
                  <span className="review-right">{item.right}</span>
                  {item.chapter && <span className="review-chapter">{item.chapter}</span>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </>
    );
  }

  return (
    <>
      <TopBar back title="Review" accent="green" />
      <div className="review-wrap">{body}</div>
    </>
  );
}
