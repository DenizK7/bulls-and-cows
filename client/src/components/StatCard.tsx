"use client";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "default" | "bull" | "cow" | "danger";
}) {
  const color =
    accent === "bull" ? "text-bull" : accent === "cow" ? "text-cow" : accent === "danger" ? "text-danger" : "text-text";
  return (
    <div className="kit-panel-sm p-1 text-center">
      <div className={`text-xl font-bold font-pixel-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-text-dim uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
