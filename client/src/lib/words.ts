export type WordLang = "en" | "tr";
export const WORD_LEN = 5;

// On-screen keyboard rows (lowercase canonical values; displayed upper-cased per locale).
export const KEY_ROWS: Record<WordLang, string[][]> = {
  en: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"],
  ],
  tr: [
    ["e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ş"],
    ["i", "z", "c", "v", "b", "n", "m", "ö", "ç"],
  ],
};

export function displayLetter(ch: string, lang: WordLang): string {
  return ch.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-US");
}

export function letterSet(lang: WordLang): Set<string> {
  return new Set(KEY_ROWS[lang].flat());
}
