// Pure, deterministic ELO -> tier mapping. Rendered as badges across the app.

export interface Rank {
  tier: string;
  color: string;
  min: number;
  nextAt: number | null; // ELO at which the next tier begins, or null at the top
}

export const RANK_TIERS: { tier: string; min: number; color: string }[] = [
  { tier: "Bronze", min: 0, color: "#b08d57" },
  { tier: "Silver", min: 1100, color: "#b8c0c8" },
  { tier: "Gold", min: 1300, color: "#f0d45b" },
  { tier: "Platinum", min: 1500, color: "#5fd9c0" },
  { tier: "Diamond", min: 1700, color: "#7db8ff" },
  { tier: "Master", min: 1900, color: "#e0a3ff" },
];

export function getRank(elo: number): Rank {
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (elo >= RANK_TIERS[i].min) idx = i;
  }
  const t = RANK_TIERS[idx];
  const next = RANK_TIERS[idx + 1] ?? null;
  return { tier: t.tier, color: t.color, min: t.min, nextAt: next ? next.min : null };
}
