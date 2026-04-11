export const GAME_COLORS = [
  "#d97a5b", // 0: terracotta
  "#e8a94a", // 1: amber honey
  "#f2d55c", // 2: golden wheat
  "#8fb65a", // 3: moss green
  "#4d9d8f", // 4: forest teal
  "#5c87c4", // 5: river blue
  "#9b7bc9", // 6: thistle purple
  "#d67a9e", // 7: rose
];

export function digitToColor(d: string): string | null {
  const i = parseInt(d, 10);
  if (!Number.isInteger(i) || i < 0 || i >= GAME_COLORS.length) return null;
  return GAME_COLORS[i];
}
