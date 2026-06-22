"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { digitToColor } from "@/lib/colors";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export interface HistoryRow {
  id: string;
  type: "pvp" | "ai";
  matchType: "ranked" | "friendly" | "ai";
  colorCount: number | null;
  reason: string | null;
  outcome: "win" | "loss" | "draw";
  myGuesses: number;
  oppGuesses: number;
  eloDelta: number | null;
  opponent: { id: string; displayName: string; tag: string; avatarUrl: string };
  abandoned: boolean;
  createdAt: string;
}

interface GuessEntry { guess: string; bulls: number; cows: number }
interface GameDetail {
  colorCount: number | null;
  me: { secret: string; guesses: GuessEntry[] };
  opponent: { secret: string; guesses: GuessEntry[] };
}

function Dots({ bulls, cows }: { bulls: number; cows: number }) {
  if (bulls === 0 && cows === 0) return <span className="text-text-dim text-[10px]">--</span>;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: bulls }).map((_, i) => <span key={`b${i}`} className="w-2 h-2 rounded-full bg-bull inline-block" />)}
      {Array.from({ length: cows }).map((_, i) => <span key={`c${i}`} className="w-2 h-2 rounded-full border-[1.5px] border-cow inline-block" />)}
    </span>
  );
}

function GuessList({ guesses, colorCount }: { guesses: GuessEntry[]; colorCount: number | null }) {
  const isColor = colorCount != null;
  return (
    <div className="flex flex-col gap-1">
      {guesses.length === 0 && <span className="text-text-dim text-[10px]">—</span>}
      {guesses.map((g, i) => (
        <div key={i} className="flex items-center gap-1 text-[11px]">
          <span className="text-text-dim w-3 text-right font-pixel-mono shrink-0">{i + 1}</span>
          <div className="flex gap-0.5">
            {g.guess.split("").map((d, j) =>
              isColor ? (
                <span key={j} className="w-4 h-4 rounded-full inline-block" style={{ background: digitToColor(d) ?? "transparent" }} />
              ) : (
                <span key={j} className="w-4 h-4 rounded bg-bg-elevated flex items-center justify-center font-pixel-mono text-[10px]">{d}</span>
              ),
            )}
          </div>
          <span className="ml-auto"><Dots bulls={g.bulls} cows={g.cows} /></span>
        </div>
      ))}
    </div>
  );
}

export function MatchHistoryRow({
  row,
  token,
  expandable,
  labels,
}: {
  row: HistoryRow;
  token?: string;
  expandable?: boolean;
  labels: { you: string; ranked: string; friendly: string; ai: string; numbers: string; colors: string; abandoned: string };
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const outColor =
    row.outcome === "win" ? "text-bull border-bull/30 bg-bull/5"
      : row.outcome === "draw" ? "text-text-muted border-border bg-bg-elevated"
        : "text-danger border-danger/30 bg-danger/5";
  const outLabel = row.outcome === "win" ? "W" : row.outcome === "draw" ? "D" : "L";
  const modeLabel = row.colorCount != null ? labels.colors : labels.numbers;
  const typeLabel = row.matchType === "ranked" ? labels.ranked : row.matchType === "ai" ? labels.ai : labels.friendly;

  const toggle = async () => {
    if (!expandable) return;
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (detail || loading) return;
    setLoading(true); setErr(false);
    try {
      const res = await fetch(`${API}/games/${row.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setDetail({ colorCount: d.game.colorCount, me: d.game.me, opponent: d.game.opponent });
    } catch { setErr(true); }
    setLoading(false);
  };

  return (
    <div className="kit-panel-sm p-0 overflow-hidden">
      <button
        onClick={toggle}
        disabled={!expandable}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${expandable ? "cursor-pointer hover:bg-[#2a1d16]/8" : "cursor-default"} transition-colors`}
      >
        <span className={`w-7 h-7 shrink-0 rounded-lg border flex items-center justify-center text-xs font-bold ${outColor}`}>{outLabel}</span>
        {row.opponent.avatarUrl ? (
          <img src={row.opponent.avatarUrl} alt="" className="w-6 h-6 rounded-full shrink-0" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
            {row.opponent.displayName[0]?.toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {row.opponent.displayName}
            {row.abandoned && <span className="text-[9px] text-text-dim ml-1">({labels.abandoned})</span>}
          </div>
          <div className="text-[10px] text-text-dim">
            {typeLabel} · {modeLabel} · {row.myGuesses}v{row.oppGuesses}
          </div>
        </div>
        {row.eloDelta != null && row.eloDelta !== 0 && (
          <span className={`text-xs font-bold font-pixel-mono shrink-0 ${row.eloDelta > 0 ? "text-bull" : "text-danger"}`}>
            {row.eloDelta > 0 ? "+" : ""}{row.eloDelta}
          </span>
        )}
        <span className="text-[10px] text-text-dim shrink-0 hidden sm:inline">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border">
            <div className="p-3">
              {loading && <div className="text-center text-text-dim text-xs py-2">…</div>}
              {err && <div className="text-center text-danger text-xs py-2">—</div>}
              {detail && (
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-text-dim font-medium mb-1.5">{labels.you}</div>
                    <GuessList guesses={detail.me.guesses} colorCount={detail.colorCount} />
                  </div>
                  <div className="w-px bg-border shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-text-dim font-medium mb-1.5 truncate">{row.opponent.displayName}</div>
                    <GuessList guesses={detail.opponent.guesses} colorCount={detail.colorCount} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
