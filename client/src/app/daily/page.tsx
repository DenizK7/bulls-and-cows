"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { BrandTitle } from "@/components/BrandTitle";
import { IconCalendar, IconTrophy } from "@/components/Icons";
import { AmbientBackground } from "@/components/AmbientBackground";
import { useT } from "@/lib/i18n";
import { playSound } from "@/lib/sound";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface Guess { guess: string; bulls: number; cows: number }
interface BoardEntry { id: string; rank: number; displayName: string; tag: string; avatarUrl: string; guessCount: number }

function Dots({ bulls, cows }: { bulls: number; cows: number }) {
  if (bulls === 0 && cows === 0) return <span className="text-text-dim text-xs">--</span>;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: bulls }).map((_, i) => <span key={`b${i}`} className="w-2.5 h-2.5 rounded-full bg-bull inline-block" />)}
      {Array.from({ length: cows }).map((_, i) => <span key={`c${i}`} className="w-2.5 h-2.5 rounded-full border-2 border-cow inline-block" />)}
    </span>
  );
}

export default function DailyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useT();
  const token = (session as { backendToken?: string })?.backendToken;

  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [solved, setSolved] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [maxGuesses, setMaxGuesses] = useState(20);
  const [digits, setDigits] = useState<string[]>([]);
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadBoard = useCallback(() => {
    if (!token) return;
    fetch(`${API}/daily/leaderboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setBoard(d.leaderboard))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/daily`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setGuesses(d.guesses || []);
        setSolved(d.solved);
        setSecret(d.secret);
        setMaxGuesses(d.maxGuesses ?? 20);
        if (d.solved) loadBoard();
      })
      .finally(() => setLoading(false));
  }, [token, loadBoard]);

  const used = new Set(digits);
  const canSubmit = digits.length === 4 && !submitting;
  const remaining = maxGuesses - guesses.length;
  const finished = solved || remaining <= 0;

  const addDigit = (d: string) => { if (digits.length < 4 && !used.has(d)) setDigits([...digits, d]); };
  const back = () => setDigits(digits.slice(0, -1));

  const submit = async () => {
    if (!canSubmit || !token) return;
    setSubmitting(true);
    const guess = digits.join("");
    try {
      const res = await fetch(`${API}/daily/guess`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ guess }),
      });
      if (res.ok) {
        const d = await res.json();
        setGuesses((prev) => [...prev, { guess, bulls: d.bulls, cows: d.cows }]);
        setDigits([]);
        if (d.solved) {
          setSolved(true); setSecret(d.secret); playSound("win"); loadBoard();
        } else {
          playSound(d.bulls > 0 ? "bull" : d.cows > 0 ? "cow" : "miss");
        }
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center px-3 sm:px-4 py-4 sm:py-6">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-md flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <BrandTitle size="sm" />
          <Link href="/lobby" className="text-xs text-text-muted hover:text-text border border-border rounded-lg px-3 py-1.5 cursor-pointer transition-colors">
            ← {t("nav.backToLobby")}
          </Link>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold flex items-center justify-center gap-2"><IconCalendar className="w-5 h-5 text-accent" /> {t("daily.title")}</h1>
          <p className="text-text-dim text-xs mt-0.5">{t("daily.subtitle")}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Guess board */}
            <div className="kit-panel p-2 flex flex-col gap-1.5 min-h-[80px]">
              {guesses.length === 0 && !finished && (
                <p className="text-text-dim text-xs text-center py-3">{t("daily.subtitle")}</p>
              )}
              {guesses.map((g, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5">
                  <span className="text-text-dim text-[10px] font-pixel-mono w-4 text-right">{i + 1}</span>
                  <div className="flex gap-1">
                    {g.guess.split("").map((d, j) => (
                      <span key={j} className="w-7 h-7 rounded bg-[#2a1d16] text-[#f0d9c0] flex items-center justify-center font-pixel-mono text-sm font-bold">{d}</span>
                    ))}
                  </div>
                  <span className="ml-auto"><Dots bulls={g.bulls} cows={g.cows} /></span>
                </motion.div>
              ))}
            </div>

            {/* Result / input */}
            {solved ? (
              <div className="bg-bull/10 border border-bull/30 rounded-xl p-4 text-center">
                <div className="text-3xl mb-1">🎉</div>
                <div className="font-bold text-bull">{t("daily.solved")}</div>
                <div className="text-text-muted text-sm mt-1">{t("daily.solvedIn")} {guesses.length}</div>
                {secret && <div className="text-xs text-text-dim mt-1">{t("daily.secretWas")} <span className="font-pixel-mono text-accent font-bold tracking-widest">{secret}</span></div>}
              </div>
            ) : remaining <= 0 ? (
              <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-center text-sm text-danger">
                {t("daily.outOfGuesses")}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`w-11 h-12 bg-bg-elevated border-2 rounded-lg flex items-center justify-center font-pixel-mono text-xl font-bold ${digits[i] ? "border-accent text-text" : "border-border text-text-dim"}`}>
                      {digits[i] ?? "·"}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-text-dim">{remaining} {t("daily.guessesLeft")}</div>
                <div className="grid grid-cols-3 gap-1.5 w-full max-w-[210px]">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button key={n} onClick={() => addDigit(String(n))} disabled={used.has(String(n)) || digits.length >= 4}
                      className="h-11 bg-bg-elevated border border-border rounded-lg font-pixel-mono text-lg font-bold hover:bg-bg-hover active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">{n}</button>
                  ))}
                  <button onClick={back} disabled={digits.length === 0}
                    className="h-11 bg-bg-elevated border border-border rounded-lg text-text-muted hover:text-danger hover:border-danger/30 active:scale-95 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center">⌫</button>
                  <button onClick={() => addDigit("0")} disabled={used.has("0") || digits.length >= 4}
                    className="h-11 bg-bg-elevated border border-border rounded-lg font-pixel-mono text-lg font-bold hover:bg-bg-hover active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">0</button>
                  <button onClick={submit} disabled={!canSubmit}
                    className="kit-btn h-11 font-semibold text-sm cursor-pointer">{t("daily.submit")}</button>
                </div>
              </div>
            )}

            {/* Today's leaderboard (shown once finished) */}
            {finished && (
              <div className="kit-panel p-2">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><IconTrophy className="w-4 h-4 text-accent" /> {t("daily.todayLeaderboard")}</h3>
                {board.length === 0 ? (
                  <p className="text-text-dim text-xs text-center py-2">{t("daily.empty")}</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {board.map((b) => {
                      const isMe = b.id === (session as { userId?: string })?.userId;
                      return (
                        <div key={b.id} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg ${isMe ? "bg-accent/10 border border-accent/30" : "bg-bg-elevated"}`}>
                          <span className="w-5 text-center font-pixel-mono font-bold text-sm"
                            style={b.rank <= 3 ? { color: b.rank === 1 ? "#f0d45b" : b.rank === 2 ? "#b8c0c8" : "#b08d57" } : undefined}>{b.rank}</span>
                          <span className="text-sm font-medium truncate flex-1">{b.displayName}<span className="text-text-dim font-mono text-xs ml-1">#{b.tag}</span></span>
                          <span className="text-xs text-text-muted font-pixel-mono">{b.guessCount}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
