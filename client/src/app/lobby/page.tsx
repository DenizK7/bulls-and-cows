"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";
import { useMusicPlayer } from "@/components/MusicPlayer";
import { useT } from "@/lib/i18n";
import { GAME_COLORS } from "@/lib/colors";
import { BrandTitle } from "@/components/BrandTitle";
import Image from "next/image";

interface Friend {
  _id: string;
  displayName: string;
  tag: string;
  avatarUrl: string;
  stats: { eloRating: number };
}

interface FriendRequest {
  _id: string;
  requesterId: { _id: string; displayName: string; tag: string; avatarUrl: string };
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function LobbyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { socket, connected } = useSocket();
  const [matchmaking, setMatchmaking] = useState(false);
  const [tab, setTab] = useState<"play" | "friends">("play");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<{ _id: string; recipientId: { displayName: string; tag: string } }[]>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendTag, setFriendTag] = useState("");
  const [friendMsg, setFriendMsg] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  // Invite state
  const [inviteModal, setInviteModal] = useState<{ friendId: string; friendName: string } | null>(null);
  const [inviteTurnTime, setInviteTurnTime] = useState(60000);
  const [pendingInvite, setPendingInvite] = useState<{ inviteId: string; from: { displayName: string }; turnTimeMs: number; colorCount: number | null } | null>(null);
  const [waitingInvite, setWaitingInvite] = useState<{ friendName: string; timeout: ReturnType<typeof setTimeout> } | null>(null);
  const [readyState, setReadyState] = useState<{ inviteId: string; readyCount: number; amReady: boolean; countdown: number | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const music = useMusicPlayer();
  const { t, lang, setLang: changeLang } = useT();
  const [aiTurnTime, setAiTurnTime] = useState(60000);
  const [colorCount, setColorCount] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [nameMsg, setNameMsg] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupTag, setSetupTag] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [profile, setProfile] = useState<{ displayName: string; tag: string } | null>(null);

  const token = (session as { backendToken?: string })?.backendToken;

  const fetchFriends = useCallback(async () => {
    if (!token) return;
    try {
      const [fRes, rRes, sRes] = await Promise.all([
        fetch(`${API}/friends`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/friends/requests`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/friends/requests/sent`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (fRes.ok) {
        const d = await fRes.json();
        const fl = d.friends || [];
        setFriends(fl);
        setOnlineUsers(new Set(fl.filter((f: any) => f.online).map((f: any) => f._id)));
      }
      if (rRes.ok) { const d = await rRes.json(); setRequests(d.requests || []); }
      if (sRes.ok) { const d = await sRes.json(); setSentRequests(d.requests || []); }
    } catch {}
  }, [token]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Hydrate color mode preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("colorCount");
    if (saved === null) return;
    if (saved === "null") setColorCount(null);
    else {
      const n = parseInt(saved, 10);
      if ([5, 6, 7, 8].includes(n)) setColorCount(n);
    }
  }, []);

  // Persist on change
  useEffect(() => {
    localStorage.setItem("colorCount", colorCount == null ? "null" : String(colorCount));
  }, [colorCount]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  // Load profile from backend + check setup
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setProfile({ displayName: data.displayName, tag: data.tag });
        setEditName(data.displayName);
        if (!data.setupComplete) setShowSetup(true);
      })
      .catch(() => { /* server unreachable / transient — ignore */ });
  }, [token]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    const handleGameState = (data: { gameId: string }) => router.push(`/game/${data.gameId}`);
    const handleFound = (data: { gameId: string }) => { setMatchmaking(false); router.push(`/game/${data.gameId}`); };
    const handleFriendOnline = (data: { userId: string }) => setOnlineUsers((p) => new Set(p).add(data.userId));
    const handleFriendOffline = (data: { userId: string }) => setOnlineUsers((p) => { const n = new Set(p); n.delete(data.userId); return n; });

    const handleInviteReceived = (data: { inviteId: string; from: { displayName: string }; turnTimeMs: number; colorCount?: number | null }) => {
      setPendingInvite({ ...data, colorCount: data.colorCount ?? null });
      // Auto-decline after 15s
      setTimeout(() => {
        setPendingInvite((current) => {
          if (current?.inviteId === data.inviteId) {
            socket?.emit("client:invite:decline", { inviteId: data.inviteId });
            return null;
          }
          return current;
        });
      }, 15000);
    };
    const handleInviteAccepted = (data: { inviteId: string }) => {
      if (waitingInvite) { clearTimeout(waitingInvite.timeout); setWaitingInvite(null); }
      setReadyState({ inviteId: data.inviteId, readyCount: 0, amReady: false, countdown: null });
      setInviteModal(null);
    };
    const handlePlayerReady = (data: { inviteId: string; readyCount: number }) => {
      setReadyState(prev => prev ? { ...prev, readyCount: data.readyCount } : null);
    };
    const handleStarting = (data: { inviteId: string; countdown: number }) => {
      setReadyState(prev => prev ? { ...prev, countdown: data.countdown } : null);
    };
    const handleGameCreated = (data: { gameId: string }) => {
      setReadyState(null); setPendingInvite(null);
      router.push(`/game/${data.gameId}`);
    };
    const handleInviteDeclined = () => { setInviteModal(null); setReadyState(null); if (waitingInvite) { clearTimeout(waitingInvite.timeout); setWaitingInvite(null); } };

    socket.on("server:game:state", handleGameState);
    socket.on("server:matchmaking:found", handleFound);
    socket.on("server:friend:online", handleFriendOnline);
    socket.on("server:friend:offline", handleFriendOffline);
    socket.on("server:invite:received", handleInviteReceived);
    socket.on("server:invite:accepted", handleInviteAccepted);
    socket.on("server:invite:player-ready", handlePlayerReady);
    socket.on("server:invite:starting", handleStarting);
    socket.on("server:invite:game-created", handleGameCreated);
    socket.on("server:invite:declined", handleInviteDeclined);
    return () => {
      socket.off("server:game:state", handleGameState);
      socket.off("server:matchmaking:found", handleFound);
      socket.off("server:friend:online", handleFriendOnline);
      socket.off("server:friend:offline", handleFriendOffline);
      socket.off("server:invite:received", handleInviteReceived);
      socket.off("server:invite:accepted", handleInviteAccepted);
      socket.off("server:invite:player-ready", handlePlayerReady);
      socket.off("server:invite:starting", handleStarting);
      socket.off("server:invite:game-created", handleGameCreated);
      socket.off("server:invite:declined", handleInviteDeclined);
    };
  }, [socket, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session?.user;
  const userTag = (session as { tag?: string })?.tag || "0000";

  const handlePlayAI = (difficulty: string) => socket?.emit("client:game:start-ai", { difficulty, turnTimeMs: aiTurnTime, colorCount });

  const handleFindMatch = () => {
    if (matchmaking) { socket?.emit("client:matchmaking:leave"); setMatchmaking(false); }
    else { socket?.emit("client:matchmaking:join", { colorCount }); setMatchmaking(true); }
  };

  const handleAddFriend = async () => {
    if (!token || !friendSearch || !friendTag) return;
    setFriendMsg("");
    try {
      const res = await fetch(`${API}/friends/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: friendSearch, tag: friendTag }),
      });
      const data = await res.json();
      if (res.ok) { setFriendMsg("Request sent!"); setFriendSearch(""); setFriendTag(""); fetchFriends(); }
      else setFriendMsg(data.error || "Failed");
    } catch { setFriendMsg("Network error"); }
  };

  const handleAccept = async (id: string) => {
    if (!token) return;
    await fetch(`${API}/friends/accept/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    fetchFriends();
  };

  const handleDecline = async (id: string) => {
    if (!token) return;
    await fetch(`${API}/friends/decline/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    fetchFriends();
  };

  return (
    <div className="flex-1 flex flex-col items-center px-3 sm:px-4 py-4 sm:py-6">
      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-4">
        {/* Compact header */}
        <div className="flex items-center justify-between">
          <BrandTitle size="sm" />
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-online" : "bg-danger"}`} />
            {user?.image && <Image src={user.image} alt="" width={24} height={24} className="rounded-full" />}
            <span className="text-xs text-text-muted">{profile?.displayName || user?.name}<span className="text-text-dim font-mono ml-1">#{profile?.tag || userTag}</span></span>
            <div className="relative">
              <button onClick={() => { setSettingsOpen(!settingsOpen); setEditName(profile?.displayName || user?.name || ""); setNameMsg(""); }}
                className="ml-1 p-1 rounded-md hover:bg-bg-elevated text-text-dim hover:text-text-muted cursor-pointer transition-colors"
                aria-label="Settings">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>

              <AnimatePresence>
                {settingsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                    <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 z-50 w-64 bg-bg-card border border-border rounded-xl shadow-xl p-4 flex flex-col gap-3">
                      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t("lobby.settings")}</div>

                      {/* Display Name */}
                      <div>
                        <label className="text-[11px] text-text-dim mb-1 block">{t("lobby.displayName")}</label>
                        <div className="flex gap-1.5">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value.replace(/\s/g, ""))}
                            maxLength={20}
                            className="flex-1 bg-bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none font-medium"
                          />
                          <button
                            disabled={savingName || editName === user?.name || editName.length < 2}
                            onClick={async () => {
                              if (!token) return;
                              setSavingName(true); setNameMsg("");
                              try {
                                const res = await fetch(`${API}/auth/me`, {
                                  method: "PATCH",
                                  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                  body: JSON.stringify({ displayName: editName }),
                                });
                                const data = await res.json();
                                if (res.ok) { setNameMsg("Saved!"); setProfile(prev => prev ? { ...prev, displayName: editName } : null); }
                                else setNameMsg(data.error || "Failed");
                              } catch { setNameMsg("Error"); }
                              setSavingName(false);
                            }}
                            className="px-2.5 py-1.5 bg-accent text-bg text-xs font-medium rounded-lg hover:brightness-110 disabled:opacity-30 cursor-pointer">
                            {t("lobby.save")}
                          </button>
                        </div>
                        {nameMsg && <p className={`text-[10px] mt-1 ${nameMsg === "Saved!" ? "text-success" : "text-danger"}`}>{nameMsg}</p>}
                      </div>

                      {/* Tag (read-only) */}
                      <div>
                        <label className="text-[11px] text-text-dim mb-1 block">{t("lobby.yourTag")}</label>
                        <div className="bg-bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-muted">
                          {profile?.displayName || user?.name}#{profile?.tag || userTag}
                        </div>
                      </div>

                      {/* Language */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted">{t("lobby.language")}</span>
                        <div className="flex bg-bg-elevated rounded-md border border-border overflow-hidden">
                          <button onClick={() => changeLang("en")}
                            className={`px-2 py-1 text-[10px] font-medium cursor-pointer ${lang === "en" ? "bg-accent/20 text-accent" : "text-text-dim"}`}>EN</button>
                          <button onClick={() => changeLang("tr")}
                            className={`px-2 py-1 text-[10px] font-medium cursor-pointer ${lang === "tr" ? "bg-accent/20 text-accent" : "text-text-dim"}`}>TR</button>
                        </div>
                      </div>

                      {/* Music */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted">{t("lobby.music")}</span>
                        <div className="flex items-center gap-2">
                          <input type="range" min="0" max="1" step="0.05" value={music.volume}
                            onChange={(e) => music.setVolume(parseFloat(e.target.value))}
                            className="w-16 h-1 accent-accent cursor-pointer" />
                          <button onClick={music.toggle}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer ${music.playing ? "bg-accent/20 text-accent" : "bg-bg-elevated text-text-dim"}`}>
                            {music.playing ? "On" : "Off"}
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-border pt-2">
                        <button onClick={() => signOut({ callbackUrl: "/" })}
                          className="w-full py-2 text-xs text-danger hover:bg-danger/10 rounded-lg cursor-pointer transition-colors font-medium">
                          {t("lobby.signOut")}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-bg-card rounded-lg p-0.5 border border-border text-sm">
          {[
            { key: "play" as const, label: t("lobby.play") },
            { key: "friends" as const, label: `${t("lobby.friends")}${friends.length ? ` (${friends.length})` : ""}` },
          ].map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`flex-1 py-2 rounded-md font-medium transition-all cursor-pointer ${
                tab === tb.key ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted"
              }`}>{tb.label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "play" ? (
            <motion.div key="play" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-3">
              {/* Game Mode Selector — applies to all game types below */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-semibold mb-3">Oyun Modu</h2>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setColorCount(null)}
                    className={`flex-1 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      colorCount == null ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted hover:border-border-light"
                    }`}>
                    <div className="text-sm font-bold">Sayılar</div>
                    <div className="text-[10px] opacity-70">0-9 rakamlar</div>
                  </button>
                  <button onClick={() => setColorCount(6)}
                    className={`flex-1 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      colorCount != null ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted hover:border-border-light"
                    }`}>
                    <div className="text-sm font-bold">Renkler</div>
                    <div className="text-[10px] opacity-70">renkli daireler</div>
                  </button>
                </div>
                {colorCount != null && (
                  <>
                    <div className="text-[10px] text-text-dim mb-1.5 text-center">Renk sayısı</div>
                    <div className="flex gap-1.5 mb-2">
                      {[5, 6, 7, 8].map((n) => (
                        <button key={n} onClick={() => setColorCount(n)}
                          className={`flex-1 py-1.5 rounded-lg border text-sm font-bold cursor-pointer transition-all ${
                            colorCount === n ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-text-dim hover:border-border-light"
                          }`}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 justify-center mt-2">
                      {GAME_COLORS.slice(0, colorCount).map((c, i) => (
                        <span key={i} className="w-5 h-5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}50` }} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* AI */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-semibold mb-3">{t("lobby.playAI")}</h2>
                {/* Turn time selector */}
                <div className="flex gap-1.5 mb-3">
                  {[
                    { ms: 30000, label: "30s", desc: t("invite.fast") },
                    { ms: 60000, label: "60s", desc: t("invite.normal") },
                    { ms: 120000, label: "2m", desc: t("invite.chill") },
                  ].map((opt) => (
                    <button key={opt.ms} onClick={() => setAiTurnTime(opt.ms)}
                      className={`flex-1 py-1.5 rounded-lg border text-center cursor-pointer transition-all ${
                        aiTurnTime === opt.ms ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-text-dim hover:border-border-light"
                      }`}>
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[9px] opacity-70">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t("difficulty.easy"), difficulty: "easy", color: "text-success border-success/20 bg-success/5" },
                    { label: t("difficulty.medium"), difficulty: "medium", color: "text-warning border-warning/20 bg-warning/5" },
                    { label: t("difficulty.hard"), difficulty: "hard", color: "text-danger border-danger/20 bg-danger/5" },
                  ].map((m) => (
                    <button key={m.difficulty} onClick={() => handlePlayAI(m.difficulty)} disabled={!connected}
                      className={`border rounded-lg py-2.5 text-center font-bold text-sm hover:brightness-125 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-40 ${m.color}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PvP */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-semibold mb-2">{t("lobby.playOnline")}</h2>
                <button onClick={handleFindMatch} disabled={!connected}
                  className={`w-full py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 ${
                    matchmaking ? "bg-danger/15 border border-danger text-danger" : "bg-accent text-bg hover:brightness-110"
                  }`}>
                  {matchmaking ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                      {t("lobby.searching")}
                    </span>
                  ) : t("lobby.findMatch")}
                </button>
              </div>

              {/* Play with Friends */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-semibold mb-2">{t("lobby.playFriends")}</h2>
                {friends.length === 0 ? (
                  <p className="text-text-dim text-xs">{t("lobby.noFriends")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {friends.map((f) => {
                      const isOnline = onlineUsers.has(f._id);
                      const isInGame = (f as any).inGame;
                      return (
                        <button key={f._id}
                          onClick={() => isOnline && !isInGame && setInviteModal({ friendId: f._id, friendName: f.displayName })}
                          disabled={!isOnline || isInGame}
                          className={`flex items-center gap-1.5 bg-bg-elevated border rounded-lg px-3 py-1.5 text-xs transition-all ${
                            isOnline && !isInGame ? "border-border hover:border-accent/30 cursor-pointer" : "border-border/50 opacity-40 cursor-not-allowed"
                          }`}>
                          <div className="relative">
                            {f.avatarUrl ? <img src={f.avatarUrl} alt="" className="w-5 h-5 rounded-full" /> :
                              <div className="w-5 h-5 bg-accent/20 rounded-full flex items-center justify-center text-[8px] font-bold text-accent">{f.displayName[0]}</div>}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-bg-elevated ${isOnline ? (isInGame ? "bg-warning" : "bg-online") : "bg-text-dim"}`} />
                          </div>
                          <span className="font-medium">{f.displayName}</span>
                          {!isOnline && <span className="text-[9px] text-text-dim">{t("lobby.offline")}</span>}
                          {isOnline && isInGame && <span className="text-[9px] text-warning">{t("lobby.inGame")}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tutorial */}
              <Link href="/how-to-play">
                <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-border-light cursor-pointer transition-all">
                  <div>
                    <h2 className="text-sm font-semibold">{t("lobby.howToPlay")}</h2>
                    <p className="text-text-dim text-xs">{t("lobby.howToPlayDesc")}</p>
                  </div>
                  <span className="text-text-dim text-lg">&rarr;</span>
                </div>
              </Link>
            </motion.div>
          ) : (
            <motion.div key="friends" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-4">
              {/* Add Friend */}
              <div className="bg-bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">{t("lobby.addFriend")}</h2>
                  <button
                    onClick={() => setAddFriendOpen(!addFriendOpen)}
                    className="text-xs text-accent hover:underline cursor-pointer"
                  >
                    {addFriendOpen ? "Close" : "+ Add"}
                  </button>
                </div>

                <AnimatePresence>
                  {addFriendOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="text-text-dim text-xs mb-3">{t("lobby.addFriendDesc")}</p>
                      <div className="flex gap-2 mb-2">
                        <input
                          value={friendSearch}
                          onChange={(e) => setFriendSearch(e.target.value)}
                          placeholder="Name"
                          className="flex-1 min-w-0 bg-bg-elevated border border-border rounded-lg px-2 py-2 text-xs focus:border-accent focus:outline-none"
                        />
                        <div className="flex items-center bg-bg-elevated border border-border rounded-lg px-1.5 shrink-0">
                          <span className="text-text-dim text-xs">#</span>
                          <input
                            value={friendTag}
                            onChange={(e) => setFriendTag(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="0000"
                            maxLength={4}
                            className="w-10 bg-transparent text-xs py-2 focus:outline-none font-mono"
                          />
                        </div>
                        <button
                          onClick={handleAddFriend}
                          disabled={!friendSearch || friendTag.length !== 4}
                          className="px-3 py-2 bg-accent text-bg text-xs font-medium rounded-lg hover:brightness-110 disabled:opacity-30 cursor-pointer shrink-0"
                        >
                          Send
                        </button>
                      </div>
                      {friendMsg && (
                        <p className={`text-xs ${friendMsg.includes("sent") ? "text-success" : "text-danger"}`}>{friendMsg}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pending Requests */}
              {requests.length > 0 && (
                <div className="bg-bg-card border border-warning/20 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-warning mb-3">{t("lobby.pendingRequests")} ({requests.length})</h3>
                  <div className="flex flex-col gap-2">
                    {requests.map((r) => (
                      <div key={r._id} className="flex items-center justify-between bg-bg-elevated rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          {r.requesterId.avatarUrl ? (
                            <img src={r.requesterId.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                          ) : (
                            <div className="w-7 h-7 bg-accent/20 rounded-full flex items-center justify-center text-xs font-bold text-accent">
                              {r.requesterId.displayName[0]}
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-medium">{r.requesterId.displayName}</span>
                            <span className="text-text-dim text-xs ml-1 font-mono">#{r.requesterId.tag}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAccept(r._id)} className="px-3 py-1 bg-success/20 text-success text-xs font-medium rounded-lg cursor-pointer hover:bg-success/30">{t("lobby.accept")}</button>
                          <button onClick={() => handleDecline(r._id)} className="px-3 py-1 bg-danger/20 text-danger text-xs font-medium rounded-lg cursor-pointer hover:bg-danger/30">{t("lobby.decline")}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sent Requests */}
              {sentRequests.length > 0 && (
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-text-dim mb-2">{t("lobby.sent")} ({sentRequests.length})</h3>
                  <div className="flex flex-col gap-1.5">
                    {sentRequests.map((r) => (
                      <div key={r._id} className="flex items-center justify-between bg-bg-elevated rounded-lg px-3 py-1.5">
                        <span className="text-xs text-text-muted">{r.recipientId.displayName}<span className="text-text-dim font-mono ml-0.5">#{r.recipientId.tag}</span></span>
                        <span className="text-[10px] text-text-dim">{t("lobby.pending")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends List */}
              <div className="bg-bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-3">{t("lobby.friends")}</h3>
                {friends.length === 0 ? (
                  <div className="text-center py-8 text-text-dim">
                    <div className="text-3xl mb-2">👋</div>
                    <p className="text-sm">{t("lobby.noFriends")}</p>
                    <p className="text-xs mt-1">{t("lobby.shareFriends")} <span className="font-mono text-accent">{profile?.displayName || user?.name}#{profile?.tag || userTag}</span></p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {friends.map((f) => (
                      <div key={f._id} className="flex items-center justify-between bg-bg-elevated rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            {f.avatarUrl ? (
                              <img src={f.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-xs font-bold text-accent">
                                {f.displayName[0]}
                              </div>
                            )}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-elevated ${onlineUsers.has(f._id) ? "bg-online" : "bg-text-dim"}`} />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{f.displayName}<span className="text-text-dim font-mono text-xs ml-1">#{f.tag}</span></div>
                            <div className="text-[10px] text-text-dim">ELO {f.stats?.eloRating || 1200}</div>
                          </div>
                        </div>
                        <button onClick={() => setInviteModal({ friendId: f._id, friendName: f.displayName })}
                          className="px-3 py-1.5 bg-accent/15 text-accent text-xs font-medium rounded-lg cursor-pointer hover:bg-accent/25">
                          {t("lobby.invite")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Your Tag */}
              <div className="bg-bg-elevated/50 rounded-xl p-4 text-center">
                <p className="text-text-dim text-xs mb-1">{t("lobby.yourTagShare")}</p>
                <p className="font-mono text-lg font-bold text-accent">{profile?.displayName || user?.name}#{profile?.tag || userTag}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* First login setup modal */}
      <AnimatePresence>
        {showSetup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-bg-card border border-border rounded-2xl p-6 max-w-sm w-full">
              <div className="text-center mb-5">
                <h2 className="text-xl font-bold">{t("lobby.welcome")}</h2>
                <p className="text-text-muted text-sm mt-1">{t("setup.title")}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-text-dim mb-1 block">{t("setup.username")}</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
                    maxLength={20} placeholder="CoolPlayer"
                    className="w-full bg-bg-elevated border-2 border-border rounded-xl px-4 py-3 text-sm font-medium focus:border-accent focus:outline-none" />
                  <p className="text-[10px] text-text-dim mt-1">{t("setup.usernameHint")}</p>
                </div>
                <div>
                  <label className="text-xs text-text-dim mb-1 block">{t("setup.tag")}</label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-bg-elevated border-2 border-border rounded-xl px-4 py-3 flex-1">
                      <span className="text-text-dim text-sm mr-1">#</span>
                      <input value={setupTag} onChange={(e) => setSetupTag(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        maxLength={4} placeholder="1234"
                        className="bg-transparent text-sm font-mono font-bold focus:outline-none w-16" />
                    </div>
                    <button onClick={() => setSetupTag(String(Math.floor(1000 + Math.random() * 9000)))}
                      className="px-3 py-3 bg-bg-elevated border border-border rounded-xl text-text-dim hover:text-text-muted cursor-pointer text-xs">
                      {t("lobby.random")}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-dim mb-1 block">{t("lobby.language")}</label>
                  <div className="flex bg-bg-elevated rounded-xl border border-border overflow-hidden">
                    <button onClick={() => changeLang("en")} type="button"
                      className={`flex-1 py-2 text-xs font-medium cursor-pointer ${lang === "en" ? "bg-accent/15 text-accent" : "text-text-dim"}`}>English</button>
                    <button onClick={() => changeLang("tr")} type="button"
                      className={`flex-1 py-2 text-xs font-medium cursor-pointer ${lang === "tr" ? "bg-accent/15 text-accent" : "text-text-dim"}`}>Türkçe</button>
                  </div>
                </div>
                <div className="bg-bg-elevated rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-dim mb-0.5">{t("setup.yourProfile")}</p>
                  <p className="font-bold">{editName || "..."}<span className="text-accent font-mono">#{setupTag || "0000"}</span></p>
                </div>
                {nameMsg && <p className={`text-xs text-center ${nameMsg.includes("!") ? "text-success" : "text-danger"}`}>{nameMsg}</p>}
                <button disabled={savingName || editName.length < 2 || setupTag.length !== 4}
                  onClick={async () => {
                    if (!token) return;
                    setSavingName(true); setNameMsg("");
                    try {
                      const res = await fetch(`${API}/auth/me`, {
                        method: "PATCH",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ displayName: editName, tag: setupTag }),
                      });
                      const data = await res.json();
                      if (res.ok) { setProfile({ displayName: editName, tag: setupTag }); setShowSetup(false); router.push("/how-to-play"); }
                      else setNameMsg(data.error || "Failed");
                    } catch { setNameMsg("Network error"); }
                    setSavingName(false);
                  }}
                  className="w-full py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 cursor-pointer active:scale-[0.98] disabled:opacity-40">
                  {savingName ? t("setup.saving") : t("setup.letsGo")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal - select turn time and send */}
      <AnimatePresence>
        {inviteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-bg-card border border-border rounded-2xl p-6 max-w-xs w-full text-center">
              <h3 className="text-lg font-bold mb-1">{t("lobby.invite")} {inviteModal.friendName}</h3>
              <p className="text-text-muted text-xs mb-4">{t("invite.selectTime")}</p>
              <div className="flex gap-2 mb-5">
                {[
                  { ms: 30000, label: "30s", desc: t("invite.fast") },
                  { ms: 60000, label: "60s", desc: t("invite.normal") },
                  { ms: 120000, label: "2min", desc: t("invite.chill") },
                ].map((opt) => (
                  <button key={opt.ms} onClick={() => setInviteTurnTime(opt.ms)}
                    className={`flex-1 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                      inviteTurnTime === opt.ms ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted hover:border-border-light"
                    }`}>
                    <div className="font-bold">{opt.label}</div>
                    <div className="text-[10px] opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setInviteModal(null)}
                  className="flex-1 py-2.5 bg-bg-elevated border border-border text-text font-medium rounded-xl cursor-pointer hover:bg-bg-hover">
                  {t("invite.cancel")}
                </button>
                <button onClick={() => {
                  socket?.emit("client:invite:send", { toUserId: inviteModal.friendId, turnTime: inviteTurnTime, colorCount });
                  const friendName = inviteModal.friendName;
                  setInviteModal(null);
                  const tm = setTimeout(() => setWaitingInvite(null), 15000);
                  setWaitingInvite({ friendName, timeout: tm });
                }}
                  className="flex-1 py-2.5 bg-accent text-bg font-semibold rounded-xl cursor-pointer hover:brightness-110">
                  {t("invite.sendInvite")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting for invite response */}
      <AnimatePresence>
        {waitingInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-bg-card border border-border rounded-2xl p-6 max-w-xs w-full text-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-base font-bold mb-1">{t("lobby.inviteSent")}</h3>
              <p className="text-text-muted text-sm mb-4">{t("invite.waitingOpponent")}</p>
              <p className="text-text-dim text-xs mb-4">{t("lobby.expiresIn")}</p>
              <button onClick={() => { if (waitingInvite) clearTimeout(waitingInvite.timeout); setWaitingInvite(null); }}
                className="w-full py-2.5 bg-bg-elevated border border-border text-text font-medium rounded-xl cursor-pointer hover:bg-bg-hover">
                {t("invite.cancel")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Invite */}
      <AnimatePresence>
        {pendingInvite && !readyState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-bg-card border border-accent/20 rounded-2xl p-6 max-w-xs w-full text-center">
              <div className="text-3xl mb-2">⚔️</div>
              <h3 className="text-lg font-bold mb-1">{t("invite.title")}</h3>
              <p className="text-text-muted text-sm mb-1"><strong className="text-text">{pendingInvite.from.displayName}</strong> {t("invite.wantsToPlay")}</p>
              <p className="text-text-dim text-xs mb-1">{t("invite.turnTime")}: {pendingInvite.turnTimeMs / 1000}s</p>
              <div className="flex items-center justify-center gap-1.5 mb-5">
                {pendingInvite.colorCount != null ? (
                  <>
                    <span className="text-text-dim text-xs">{pendingInvite.colorCount} renk</span>
                    <div className="flex gap-0.5">
                      {GAME_COLORS.slice(0, pendingInvite.colorCount).map((c, i) => (
                        <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-text-dim text-xs">Sayılar 0-9</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { socket?.emit("client:invite:decline", { inviteId: pendingInvite.inviteId }); setPendingInvite(null); }}
                  className="flex-1 py-2.5 bg-bg-elevated border border-border text-text font-medium rounded-xl cursor-pointer hover:bg-bg-hover">
                  {t("invite.decline")}
                </button>
                <button onClick={() => { socket?.emit("client:invite:accept", { inviteId: pendingInvite.inviteId }); }}
                  className="flex-1 py-2.5 bg-accent text-bg font-semibold rounded-xl cursor-pointer hover:brightness-110">
                  {t("invite.accept")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ready Up Screen */}
      <AnimatePresence>
        {readyState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-bg-card border border-border rounded-2xl p-6 max-w-xs w-full text-center">
              {readyState.countdown !== null ? (
                <>
                  <div className="text-4xl font-bold text-accent mb-2">{readyState.countdown}</div>
                  <p className="text-text-muted text-sm">{t("invite.gameStarting")}</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold mb-3">Ready Up</h3>
                  <div className="flex justify-center gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${readyState.amReady ? "bg-success/20 text-success" : "bg-bg-elevated text-text-dim"}`}>
                      {readyState.amReady ? "✓" : "?"}
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${readyState.readyCount >= 2 ? "bg-success/20 text-success" : "bg-bg-elevated text-text-dim"}`}>
                      {readyState.readyCount >= 2 ? "✓" : "?"}
                    </div>
                  </div>
                  <p className="text-text-dim text-xs mb-4">{readyState.readyCount}/2 ready</p>
                  <button
                    onClick={() => { if (!readyState.amReady) { socket?.emit("client:invite:ready", { inviteId: readyState.inviteId }); setReadyState(prev => prev ? { ...prev, amReady: true } : null); } }}
                    disabled={readyState.amReady}
                    className={`w-full py-3 font-semibold rounded-xl cursor-pointer transition-all ${
                      readyState.amReady ? "bg-success/20 text-success" : "bg-accent text-bg hover:brightness-110"
                    }`}>
                    {readyState.amReady ? t("invite.waitingOpponent") : t("invite.ready")}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
