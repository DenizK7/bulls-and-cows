import { DIGIT_COUNT } from '@bulls-and-cows/shared';

// Canonical UTC date key, e.g. "2026-06-18". Single source of truth for "today".
export function dailyDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// Deterministic string hash → seed.
function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

// mulberry32 PRNG — deterministic given a seed.
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The same dateKey always yields the same secret — everyone gets one shared puzzle/day.
// Server-authoritative only: the secret must never be sent to the client unsolved.
export function dailySecret(dateKey: string, maxDigit = 9): string {
  const rand = mulberry32(hashString(`digitduel-daily-${dateKey}`));
  const digits = Array.from({ length: maxDigit + 1 }, (_, i) => i);
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, DIGIT_COUNT).join('');
}
