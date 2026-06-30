import { WORDS as EN } from '../data/words.en.js';
import { WORDS as TR } from '../data/words.tr.js';

export type WordLang = 'en' | 'tr';
export const WORD_LEN = 5;

const LISTS: Record<WordLang, string[]> = { en: EN, tr: TR };
const SETS: Record<WordLang, Set<string>> = { en: new Set(EN), tr: new Set(TR) };

export function isWordLang(x: unknown): x is WordLang {
  return x === 'en' || x === 'tr';
}

// Locale-aware lowercase (handles Turkish İ/I → i/ı correctly).
export function normalizeWord(w: string, lang: WordLang): string {
  return w.normalize('NFC').trim().toLocaleLowerCase(lang === 'tr' ? 'tr-TR' : 'en-US');
}

export function isValidWord(w: string, lang: WordLang): boolean {
  const n = normalizeWord(w, lang);
  return [...n].length === WORD_LEN && SETS[lang].has(n);
}

export function randomWord(lang: WordLang): string {
  const l = LISTS[lang];
  return l[Math.floor(Math.random() * l.length)];
}
