"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandTitle } from "@/components/BrandTitle";
import { RankBadge } from "@/components/RankBadge";
import { IconTrophy } from "@/components/Icons";
import { AmbientBackground } from "@/components/AmbientBackground";
import { useT } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface Player {
  rank: number;
  id: string;
  displayName: string;
  tag: string;
  avatarUrl: string;
  elo: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useT();
  const token = (session as { backendToken?: string })?.backendToken;
  const myId = (session as { userId?: string })?.userId;

  const [players, setPlayers] = useState<Player[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/leaderboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setPlayers(d.players); setMyRank(d.myRank); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const rankColor = (rank: number) => (rank === 1 ? "#f0d45b" : rank === 2 ? "#b8c0c8" : rank === 3 ? "#b08d57" : "");

  return (
    <div className="flex-1 flex flex-col items-center px-3 sm:px-4 py-4 sm:py-6">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <BrandTitle size="sm" />
          <Link href="/lobby" className="text-xs text-text-muted hover:text-text border border-border rounded-lg px-3 py-1.5 cursor-pointer transition-colors">
            ← {t("nav.backToLobby")}
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2"><IconTrophy className="w-5 h-5 text-accent" /> {t("leaderboard.title")}</h1>
          {myRank != null && (
            <span className="text-xs text-text-muted">{t("leaderboard.yourRank")}: <span className="text-accent font-bold">#{myRank}</span></span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : players.length === 0 ? (
          <div className="kit-panel p-2 text-center py-16">
            <IconTrophy className="w-10 h-10 mx-auto mb-2 opacity-60" />
            <p className="text-sm">{t("leaderboard.empty")}</p>
          </div>
        ) : (
          <div className="kit-panel p-2 flex flex-col gap-0.5">
            {players.map((p) => {
              const isMe = p.id === myId;
              return (
                <Link key={p.id} href={`/profile/${p.id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-colors cursor-pointer ${
                    isMe ? "border-[#2a1d16]/40 bg-[#2a1d16]/12" : "border-transparent hover:bg-[#2a1d16]/8"
                  }`}>
                  <span className="w-7 text-center font-pixel-mono font-bold text-sm shrink-0"
                    style={rankColor(p.rank) ? { color: rankColor(p.rank) } : undefined}>
                    {p.rank}
                  </span>
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-accent/20 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">
                      {p.displayName[0]?.toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {p.displayName}
                      <span className="text-text-dim font-mono text-xs ml-1">#{p.tag}</span>
                      {isMe && <span className="text-[9px] text-accent ml-1.5">({t("leaderboard.you")})</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <RankBadge elo={p.elo} size="sm" />
                      <span className="text-[10px] text-text-dim">{p.wins}W / {p.losses}L</span>
                    </div>
                  </div>
                  <span className="font-pixel-mono font-bold text-accent shrink-0">{p.elo}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
