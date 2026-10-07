// All sound effects are synthesized on the fly with the Web Audio API,
// so there are no audio files to host, license, or download.
//
// iOS Safari (especially inside an installed/standalone PWA) creates a new
// AudioContext in a "suspended" state and will only let it start running
// if it's resumed directly inside a trusted user-gesture event, and the
// very first resume often needs a dummy sound actually played through it
// before the context is truly "unlocked" for everything after. If we just
// lazily create the context on the first real beep, that first beep (and
// sometimes all beeps) can end up silent. So instead we proactively unlock
// a shared context on the very first tap/click/key anywhere in the app.

const MUTE_KEY = 'pib-muted';
let ctx = null;
let unlocked = false;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function unlock() {
  if (unlocked) return;
  const audio = getCtx();
  if (!audio) return;
  unlocked = true;

  const resumed = audio.state === 'suspended' ? audio.resume() : Promise.resolve();
  resumed.finally(() => {
    // Play a near-silent buffer once, this is what actually "wakes up"
    // audio output on iOS, a resume() call alone isn't always enough.
    try {
      const buffer = audio.createBuffer(1, 1, 22050);
      const src = audio.createBufferSource();
      src.buffer = buffer;
      src.connect(audio.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  });
}

if (typeof window !== 'undefined') {
  const opts = { once: true, passive: true };
  window.addEventListener('touchend', unlock, opts);
  window.addEventListener('mousedown', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
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
  if (audio.state === 'suspended') audio.resume();

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
