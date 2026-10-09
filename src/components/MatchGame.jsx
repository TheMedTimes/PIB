import { useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { playTap, playCorrect, playWrong, playComplete } from '../utils/sound';
import { hapticTap, hapticCorrect, hapticWrong, hapticComplete } from '../utils/haptics';
import './MatchGame.css';

const WRONG_PENALTY_SECONDS = 10;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function shuffleOnce(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchGame({ items, accentClass = 'teal', onComplete, onProgress, statusNote }) {
  const leftItems = useMemo(() => shuffleOnce(items.map((it) => ({ id: it.id, text: it.left }))), [items]);
  const rightItems = useMemo(() => shuffleOnce(items.map((it) => ({ id: it.id, text: it.right }))), [items]);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  // Matched cards are tracked per side. A pair counts as correct when the
  // chosen answer card SAYS the right thing, not only when it is the exact
  // card that was dealt for that question. Without this, two questions that
  // happen to share an answer (e.g. two conditions that are both treated with
  // "Prednisolone") produced two identical-looking cards where only one was
  // accepted and tapping the other cost a +10s penalty.
  const [matchedLeft, setMatchedLeft] = useState(new Set());
  const [matchedRight, setMatchedRight] = useState(new Set());
  const rightTextById = useMemo(() => Object.fromEntries(items.map((it) => [it.id, it.right])), [items]);
  const [wrongFlash, setWrongFlash] = useState(null);
  const [mistakes, setMistakes] = useState(0);

  const total = items.length;
  const done = matchedLeft.size === total;

  // Timer: starts the instant the set is shown, runs until every pair is
  // matched. Each wrong pick adds a fixed penalty on top of real elapsed time.
  const startRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [penaltySeconds, setPenaltySeconds] = useState(0);
  const [finalSeconds, setFinalSeconds] = useState(null);
  const [penaltyPopId, setPenaltyPopId] = useState(0);

  useEffect(() => {
    if (done) return undefined;
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [done]);

  useEffect(() => {
    if (done) {
      const total_s = Math.floor((Date.now() - startRef.current) / 1000) + penaltySeconds;
      setFinalSeconds(total_s);
      playComplete();
      hapticComplete();
      onComplete && onComplete({ mistakes, total, totalSeconds: total_s });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      if (rightTextById[selectedLeft] === rightTextById[selectedRight]) {
        playCorrect();
        hapticCorrect();
        onProgress && onProgress();
        setMatchedLeft((prev) => new Set(prev).add(selectedLeft));
        setMatchedRight((prev) => new Set(prev).add(selectedRight));
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        playWrong();
        hapticWrong();
        setWrongFlash({ left: selectedLeft, right: selectedRight });
        setMistakes((m) => m + 1);
        setPenaltySeconds((p) => p + WRONG_PENALTY_SECONDS);
        setPenaltyPopId((id) => id + 1);
        const t = setTimeout(() => {
          setWrongFlash(null);
          setSelectedLeft(null);
          setSelectedRight(null);
        }, 420);
        return () => clearTimeout(t);
      }
    }
  }, [selectedLeft, selectedRight]);

  const isMatched = (side, id) => (side === 'left' ? matchedLeft : matchedRight).has(id);

  function pick(side, id) {
    if (isMatched(side, id) || wrongFlash) return;
    playTap();
    hapticTap();
    if (side === 'left') setSelectedLeft((prev) => (prev === id ? null : id));
    else setSelectedRight((prev) => (prev === id ? null : id));
  }

  function stateClass(side, id) {
    if (isMatched(side, id)) return 'matched';
    if (wrongFlash && ((side === 'left' && wrongFlash.left === id) || (side === 'right' && wrongFlash.right === id))) return 'wrong';
    if (side === 'left' && selectedLeft === id) return 'selected';
    if (side === 'right' && selectedRight === id) return 'selected';
    return '';
  }

  if (done) {
    return (
      <div className="match-complete">
        <FlaskConical className="match-complete-icon" strokeWidth={2} />
        <h2 className="pixel-text">Set cleared!</h2>
        <p className="match-complete-time pixel-text">{formatTime(finalSeconds ?? elapsedSeconds + penaltySeconds)}</p>
        <p>{mistakes === 0 ? 'Flawless run, no mistakes.' : `Cleared with ${mistakes} mistake${mistakes === 1 ? '' : 's'} (+${mistakes * WRONG_PENALTY_SECONDS}s).`}</p>
        <p className="match-complete-sub">Come back tomorrow for a new set.</p>
        {statusNote && <p className="match-complete-status">{statusNote}</p>}
      </div>
    );
  }

  return (
    <div className={`match-game accent-${accentClass}`}>
      <div className="match-timer">
        <span className="pixel-text match-timer-value">{formatTime(elapsedSeconds + penaltySeconds)}</span>
        {penaltyPopId > 0 && (
          <span key={penaltyPopId} className="match-timer-penalty-pop">+{WRONG_PENALTY_SECONDS}s</span>
        )}
      </div>
      <div className="match-progress">
        <div className="match-progress-bar" style={{ width: `${(matchedLeft.size / total) * 100}%` }} />
        <span className="match-progress-label">{matchedLeft.size}/{total} matched</span>
      </div>
      <div className="match-columns">
        <div className="match-col">
          {leftItems.map((it) => (
            <button
              key={it.id}
              className={`match-card ${stateClass('left', it.id)}`}
              disabled={isMatched('left', it.id)}
              onClick={() => pick('left', it.id)}
            >
              {it.text}
            </button>
          ))}
        </div>
        <div className="match-col">
          {rightItems.map((it) => (
            <button
              key={it.id}
              className={`match-card ${stateClass('right', it.id)}`}
              disabled={isMatched('right', it.id)}
              onClick={() => pick('right', it.id)}
            >
              {it.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
