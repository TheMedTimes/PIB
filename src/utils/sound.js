// All sound effects are synthesized on the fly with the Web Audio API,
// so there are no audio files to host, license, or download.

const MUTE_KEY = 'pib-muted';
let ctx = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(value) {
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function beep({ freq = 440, duration = 0.08, type = 'square', gain = 0.05, glideTo = null }) {
  if (isMuted()) return;
  const audio = getCtx();
  if (!audio) return;

  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (glideTo) osc.frequency.linearRampToValueAtTime(glideTo, audio.currentTime + duration);

  g.gain.setValueAtTime(gain, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);

  osc.connect(g).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}

export function playTap() {
  beep({ freq: 520, duration: 0.05, type: 'square', gain: 0.04 });
}

export function playCorrect() {
  beep({ freq: 660, duration: 0.09, type: 'square', gain: 0.05, glideTo: 990 });
}

export function playWrong() {
  beep({ freq: 180, duration: 0.15, type: 'sawtooth', gain: 0.05, glideTo: 90 });
}

export function playComplete() {
  // A tiny ascending three-note arcade jingle.
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    setTimeout(() => beep({ freq, duration: 0.14, type: 'square', gain: 0.05 }), i * 90);
  });
}
