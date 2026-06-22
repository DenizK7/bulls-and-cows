"use client";

import { getRank } from "@/lib/rank";

export function RankBadge({
  elo,
  size = "md",
  showElo = false,
}: {
  elo: number;
  size?: "sm" | "md";
  showElo?: boolean;
}) {
  const r = getRank(elo);
  const cls = size === "sm" ? "text-[9px] px-1.5 py-0.5 gap-1" : "text-[11px] px-2 py-0.5 gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${cls}`}
      style={{ color: r.color, background: `${r.color}1a`, border: `1px solid ${r.color}55` }}
    >
      <span className="rounded-full" style={{ background: r.color, width: size === "sm" ? 5 : 6, height: size === "sm" ? 5 : 6 }} />
      {r.tier}
      {showElo ? ` · ${elo}` : ""}
    </span>
  );
}
