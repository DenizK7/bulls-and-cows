"use client";

import { useEffect, useRef } from "react";
import { mountFX } from "@/lib/gamefx";

// Full-screen WebGL particle overlay (PixiJS). Mount once on the game screen;
// trigger effects via fxVictory()/fxSpark() from @/lib/gamefx.
export function GameFX() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    mountFX(el).then((c) => { if (cancelled) c(); else cleanup = c; });
    return () => { cancelled = true; cleanup?.(); };
  }, []);
  return <div ref={ref} className="fixed inset-0 z-[80] pointer-events-none" aria-hidden />;
}
