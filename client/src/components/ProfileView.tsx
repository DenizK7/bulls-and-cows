"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BrandTitle } from "@/components/BrandTitle";
import { StatCard } from "@/components/StatCard";
import { MatchHistoryRow, type HistoryRow } from "@/components/MatchHistoryRow";
import { RankBadge } from "@/components/RankBadge";
import { AmbientBackground } from "@/components/AmbientBackground";
import { useT } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface ProfileData {
  id: string;
  displayName: string;
  tag: string;
  avatarUrl: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesDraw: number;
    totalGuesses: number;
    bestGame: number | null;
    currentStreak: number;
    longestStreak: number;
    eloRating: number;
  };
}

export function ProfileView({ userId, isOwn }: { userId: string; isOwn: boolean }) {
  const { data: session } = useSession();
  const { t } = useT();
  const token = (session as { backendToken?: string })?.backendToken;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [games, setGames] = useState<HistoryRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadHistory = useCallback(async (cur: string | null) => {
    if (!token) return;
    const url = new URL(`${API}/games/history`);
    url.searchParams.set("userId", userId);
    if (cur) url.searchParams.set("cursor", cur);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const d = await res.json();
      setGames((prev) => (cur ? [...prev, ...d.games] : d.games));
      setCursor(d.nextCursor);
    }
  }, [token, userId]);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setNotFound(false);
    fetch(`${API}/users/${userId}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setProfile(d.user); setRank(d.rank); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    loadHistory(null);
  }, [token, userId, loadHistory]);

  const labels = {
    you: t("history.you"),
    ranked: t("match.ranked"),
    friendly: t("match.friendly"),
    ai: t("match.ai"),
    numbers: t("lobby.modeNumbers"),
    colors: t("lobby.modeColors"),
    abandoned: t("history.abandoned"),
  };

  const s = profile?.stats;
  const winRate = s && s.gamesPlayed > 0 ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0;

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

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {notFound && !loading && (
          <div className="text-center py-16 text-text-dim">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm">{t("profile.notFound")}</p>
          </div>
        )}

        {profile && !loading && (
          <>
            {/* Identity */}
            <div className="kit-panel p-3 flex items-center gap-4">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent/20 text-accent text-2xl font-bold flex items-center justify-center">
                  {profile.displayName[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xl font-bold truncate">
                  {profile.displayName}
                  <span className="text-text-dim font-mono text-sm ml-1">#{profile.tag}</span>
                </div>
                <div className="text-sm text-text-muted mt-0.5">
                  {t("profile.rank")} <span className="text-accent font-bold">#{rank}</span>
                  <span className="mx-1.5 text-text-dim">·</span>
                  {profile.stats.eloRating} ELO
                </div>
                <div className="mt-1.5"><RankBadge elo={profile.stats.eloRating} /></div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label={t("profile.elo")} value={profile.stats.eloRating} accent="default" />
              <StatCard label={t("profile.wins")} value={profile.stats.gamesWon} accent="bull" />
              <StatCard label={t("profile.losses")} value={profile.stats.gamesLost} accent="danger" />
              <StatCard label={t("profile.winRate")} value={`${winRate}%`} />
              <StatCard label={t("profile.streak")} value={profile.stats.currentStreak} accent="cow" />
              <StatCard label={t("profile.bestStreak")} value={profile.stats.longestStreak} />
              <StatCard label={t("profile.played")} value={profile.stats.gamesPlayed} />
              <StatCard label={t("profile.draws")} value={profile.stats.gamesDraw} />
              <StatCard label={t("profile.bestGame")} value={profile.stats.bestGame ?? "—"} />
            </div>

            {/* Match history */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold px-1">{t("profile.history")}</h3>
              {games.length === 0 ? (
                <div className="text-center py-8 text-text-dim text-sm">{t("profile.noGames")}</div>
              ) : (
                games.map((g) => (
                  <MatchHistoryRow key={g.id} row={g} token={token} expandable={isOwn} labels={labels} />
                ))
              )}
              {cursor && (
                <button onClick={() => loadHistory(cursor)}
                  className="mt-1 py-2 text-xs text-text-muted hover:text-text border border-border rounded-lg cursor-pointer transition-colors">
                  {t("profile.loadMore")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
