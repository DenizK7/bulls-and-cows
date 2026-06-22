"use client";

import { BrandTitle } from "@/components/BrandTitle";
import { Mascot } from "@/components/Mascot";

// Pixel-art loading screen: mascot + brand + a segmented bar with a sweeping fill.
export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4">
      <Mascot size={104} />
      <BrandTitle size="md" />
      <div className="flex gap-1 p-2 border-2 border-border rounded-md bg-bg-card">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="w-2.5 h-5 rounded-[1px]"
            style={{
              background: "var(--color-bg-elevated)",
              animation: "cell-fill 1.1s ease-in-out infinite",
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>
      <div className="font-pixel-mono text-text-dim text-base tracking-[0.3em] uppercase">{label}…</div>
    </div>
  );
}
