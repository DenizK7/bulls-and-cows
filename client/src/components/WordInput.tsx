"use client";

import { useEffect, useRef, useState } from "react";
import { KEY_ROWS, displayLetter, letterSet, WORD_LEN, type WordLang } from "@/lib/words";

// Letter keyboard for word mode (5 letters, repeats allowed, TR/EN layouts, physical keyboard).
export function WordInput({
  onSubmit,
  disabled,
  confirmLabel = "OK",
  wordLang,
}: {
  onSubmit: (value: string) => void;
  disabled: boolean;
  confirmLabel?: string;
  wordLang: WordLang;
}) {
  const [letters, setLetters] = useState<string[]>([]);
  const lettersRef = useRef(letters);
  lettersRef.current = letters;
  const valid = letters.length === WORD_LEN;

  const add = (ch: string) => setLetters((l) => (l.length < WORD_LEN ? [...l, ch] : l));
  const back = () => setLetters((l) => l.slice(0, -1));
  const submit = () => {
    if (lettersRef.current.length === WORD_LEN) {
      onSubmit(lettersRef.current.join(""));
      setLetters([]);
    }
  };

  useEffect(() => {
    const set = letterSet(wordLang);
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      const k = e.key.toLocaleLowerCase(wordLang === "tr" ? "tr-TR" : "en-US");
      if (set.has(k)) add(k);
      else if (e.key === "Backspace") { e.preventDefault(); back(); }
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, wordLang]);

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <div className="flex gap-1.5">
        {Array.from({ length: WORD_LEN }).map((_, i) => (
          <div key={i} className={`w-10 h-12 bg-bg-elevated border-2 rounded-lg flex items-center justify-center font-pixel-mono text-xl font-bold ${letters[i] ? "border-accent text-text" : "border-border text-text-dim"}`}>
            {letters[i] ? displayLetter(letters[i], wordLang) : "·"}
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-1 w-full max-w-[340px]">
        {KEY_ROWS[wordLang].map((row, r) => (
          <div key={r} className="flex gap-1 justify-center w-full">
            {row.map((ch) => (
              <button key={ch} type="button" onClick={() => add(ch)} disabled={disabled || valid}
                className="flex-1 min-w-0 h-9 bg-bg-elevated border border-border rounded-md font-pixel-mono text-sm font-bold hover:bg-bg-hover active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                {displayLetter(ch, wordLang)}
              </button>
            ))}
          </div>
        ))}
        <div className="flex gap-1.5 w-full mt-0.5">
          <button type="button" onClick={back} disabled={disabled || letters.length === 0}
            className="flex-1 h-10 bg-bg-elevated border border-border rounded-lg text-text-muted hover:text-danger hover:border-danger/30 active:scale-95 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33z" />
            </svg>
          </button>
          <button type="button" onClick={submit} disabled={disabled || !valid}
            className="flex-[2] h-10 bg-accent text-bg rounded-lg font-semibold text-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
