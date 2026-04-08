"use client";

import { useEffect, useRef, useState, createContext, useContext, useCallback } from "react";

interface MusicCtx {
  playing: boolean;
  volume: number;
  toggle: () => void;
  setVolume: (v: number) => void;
}

const MusicContext = createContext<MusicCtx>({ playing: false, volume: 0.15, toggle: () => {}, setVolume: () => {} });

export function useMusicPlayer() { return useContext(MusicContext); }

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.15);

  useEffect(() => {
    const audio = new Audio("/bgm.mp3");
    audio.loop = true;
    audio.volume = 0.15;
    audioRef.current = audio;

    const handler = () => {
      audio.play().then(() => setPlaying(true)).catch(() => {});
      document.removeEventListener("click", handler);
    };
    document.addEventListener("click", handler);

    return () => { audio.pause(); document.removeEventListener("click", handler); };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  }, [playing]);

  const setVolume = useCallback((v: number) => { setVolumeState(v); }, []);

  return (
    <MusicContext.Provider value={{ playing, volume, toggle, setVolume }}>
      {children}
    </MusicContext.Provider>
  );
}
