"use client";

import { useEffect, useRef, useState } from "react";

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.15);
  const [showVolume, setShowVolume] = useState(false);

  useEffect(() => {
    const audio = new Audio("/bgm.mp3");
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    // Try autoplay (browsers may block)
    const tryPlay = () => {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    };

    // Autoplay on first user interaction
    const handler = () => { tryPlay(); document.removeEventListener("click", handler); };
    document.addEventListener("click", handler);

    return () => {
      audio.pause();
      document.removeEventListener("click", handler);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-30 flex items-center gap-1.5">
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-light cursor-pointer transition-all"
        title={playing ? "Pause music" : "Play music"}
      >
        {playing ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
            <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <button
        onClick={() => setShowVolume(!showVolume)}
        className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-light cursor-pointer transition-all"
        title="Volume"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {volume === 0 ? (
            <>
              <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" />
              <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {showVolume && (
        <div className="bg-bg-card border border-border rounded-lg px-2 py-1.5 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 accent-accent cursor-pointer"
          />
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.15)}
            className="text-[10px] text-text-dim hover:text-text-muted cursor-pointer"
          >
            {volume > 0 ? "Mute" : "On"}
          </button>
        </div>
      )}
    </div>
  );
}
