// Deterministic, client-side "daily set" picker.
// No backend, no per-user state. Every visitor on the same calendar day
// (UTC) sees the exact same 6 items. A new shuffle happens every ISO week,
// and slicing one shuffle into 7 non-overlapping chunks guarantees zero
// repeats within that week (as long as the pool has >= 7 * PAIRS_PER_DAY items).

const PAIRS_PER_DAY = 6;

// mulberry32: tiny, fast, deterministic PRNG from a numeric seed.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turn any string into a 32-bit integer seed.
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function seededShuffle(array, seed) {
  const rand = mulberry32(seed);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ISO week number (1-53) and its ISO week-year, computed in UTC so every
// visitor's browser agrees on "today", regardless of local timezone.
function getISOWeekInfo(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 ... Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { isoYear: d.getUTCFullYear(), isoWeek: weekNo, dayOfWeek: dayNum }; // dayOfWeek: 1=Mon..7=Sun
}

/**
 * Pick today's set from a pool of items.
 * @param {Array} pool - full list for a section (e.g. all MOA entries)
 * @param {Date} [now] - override "today" (mainly for testing)
 * @param {number} [pairsPerDay]
 * @returns {{items: Array, isoYear: number, isoWeek: number, dayOfWeek: number, cycleIndex: number}}
 */
export function getTodaysSet(pool, now = new Date(), pairsPerDay = PAIRS_PER_DAY) {
  if (!pool || pool.length === 0) return { items: [], isoYear: 0, isoWeek: 0, dayOfWeek: 0, cycleIndex: 0 };

  const { isoYear, isoWeek, dayOfWeek } = getISOWeekInfo(now);

  // How many full "weeks" (chunks of 7*pairsPerDay) fit in the pool.
  // If the pool is smaller than a full week's worth, we still guarantee
  // no repeats for as many days as the pool allows, then wrap gracefully.
  const chunkSize = pairsPerDay;
  const chunksPerCycle = Math.max(1, Math.floor(pool.length / chunkSize)) || 1;
  const cycleSeedBase = `${isoYear}-W${isoWeek}`;

  // Which 7-day cycle are we in overall, so long-running sites keep
  // reshuffling rather than looping the same weekly pattern forever.
  const cycleIndex = isoYear * 100 + isoWeek;

  const shuffled = seededShuffle(pool, hashSeed(cycleSeedBase));

  // dayOfWeek is 1..7; map onto however many distinct chunks the pool supports.
  const chunkIndex = (dayOfWeek - 1) % chunksPerCycle;
  const start = chunkIndex * chunkSize;
  let items = shuffled.slice(start, start + chunkSize);

  // Pool too small to fill a full day's set without reusing shuffled order,
  // wrap around rather than returning a short set.
  if (items.length < chunkSize) {
    items = [...items, ...shuffled.slice(0, chunkSize - items.length)];
  }

  return { items, isoYear, isoWeek, dayOfWeek, cycleIndex };
}

export function poolSizeWarning(pool, pairsPerDay = PAIRS_PER_DAY) {
  const needed = pairsPerDay * 7;
  if (!pool || pool.length < needed) {
    return `Pool has ${pool ? pool.length : 0} items. Need at least ${needed} for a full week with zero repeats. Items will repeat within the week until the list grows.`;
  }
  return null;
}
