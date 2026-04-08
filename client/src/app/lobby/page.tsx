"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";
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
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendTag, setFriendTag] = useState("");
  const [friendMsg, setFriendMsg] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  // Invite state
  const [inviteModal, setInviteModal] = useState<{ friendId: string; friendName: string } | null>(null);
  const [inviteTurnTime, setInviteTurnTime] = useState(60000);
  const [pendingInvite, setPendingInvite] = useState<{ inviteId: string; from: { displayName: string }; turnTimeMs: number } | null>(null);
  const [readyState, setReadyState] = useState<{ inviteId: string; readyCount: number; amReady: boolean; countdown: number | null } | null>(null);

  const token = (session as { backendToken?: string })?.backendToken;

  const fetchFriends = useCallback(async () => {
    if (!token) return;
    try {
      const [fRes, rRes] = await Promise.all([
        fetch(`${API}/friends`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/friends/requests`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (fRes.ok) { const d = await fRes.json(); setFriends(d.friends || []); }
      if (rRes.ok) { const d = await rRes.json(); setRequests(d.requests || []); }
    } catch {}
  }, [token]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    const handleGameState = (data: { gameId: string }) => router.push(`/game/${data.gameId}`);
    const handleFound = (data: { gameId: string }) => { setMatchmaking(false); router.push(`/game/${data.gameId}`); };
    const handleFriendOnline = (data: { userId: string }) => setOnlineUsers((p) => new Set(p).add(data.userId));
    const handleFriendOffline = (data: { userId: string }) => setOnlineUsers((p) => { const n = new Set(p); n.delete(data.userId); return n; });

    const handleInviteReceived = (data: { inviteId: string; from: { displayName: string }; turnTimeMs: number }) => {
      setPendingInvite(data);
    };
    const handleInviteAccepted = (data: { inviteId: string }) => {
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
    const handleInviteDeclined = () => { setInviteModal(null); setReadyState(null); };

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

  const handlePlayAI = (difficulty: string) => socket?.emit("client:game:start-ai", { difficulty });

  const handleFindMatch = () => {
    if (matchmaking) { socket?.emit("client:matchmaking:leave"); setMatchmaking(false); }
    else { socket?.emit("client:matchmaking:join"); setMatchmaking(true); }
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
    <div className="flex-1 flex flex-col items-center px-4 py-6 sm:py-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[10%] w-80 h-80 bg-accent/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-[15%] left-[5%] w-72 h-72 bg-bull/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              <span className="text-bull">Bulls</span>
              <span className="text-text-dim mx-1">&</span>
              <span className="text-cow">Cows</span>
            </h1>
            <Link href="/how-to-play" className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-text-dim text-xs hover:border-accent hover:text-accent transition-colors cursor-pointer" title="How to play">?</Link>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-online animate-pulse" : "bg-danger"}`} />
              <span className="text-text-dim text-xs">{connected ? "Online" : "..."}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.image && (
              <Image src={user.image} alt="" width={32} height={32} className="rounded-full" />
            )}
            <div className="text-right">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-text-dim font-mono">#{userTag}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs text-text-dim hover:text-text-muted transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-bg-card rounded-xl p-1 border border-border">
          {[
            { key: "play" as const, label: "Play", icon: "🎮" },
            { key: "friends" as const, label: `Friends${friends.length ? ` (${friends.length})` : ""}`, icon: "👥" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                tab === t.key ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "play" ? (
            <motion.div key="play" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-5">
              {/* AI */}
              <div className="bg-bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Play vs AI</h2>
                    <p className="text-text-dim text-xs">Practice and improve your skills</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Easy", desc: "Random", difficulty: "easy", color: "text-success border-success/20 bg-success/5" },
                    { label: "Medium", desc: "Smart", difficulty: "medium", color: "text-warning border-warning/20 bg-warning/5" },
                    { label: "Hard", desc: "Genius", difficulty: "hard", color: "text-danger border-danger/20 bg-danger/5" },
                  ].map((m) => (
                    <button
                      key={m.difficulty}
                      onClick={() => handlePlayAI(m.difficulty)}
                      disabled={!connected}
                      className={`border rounded-xl p-3 text-center hover:brightness-125 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-40 ${m.color}`}
                    >
                      <div className="font-bold text-lg">{m.label}</div>
                      <div className="text-[10px] opacity-70">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PvP */}
              <div className="bg-bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-bull/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-bull" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Play Online</h2>
                    <p className="text-text-dim text-xs">Ranked match against a random opponent</p>
                  </div>
                </div>
                <button
                  onClick={handleFindMatch}
                  disabled={!connected}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 ${
                    matchmaking ? "bg-danger/15 border-2 border-danger text-danger" : "bg-accent text-bg hover:brightness-110"
                  }`}
                >
                  {matchmaking ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                      Searching... Cancel
                    </span>
                  ) : "Find Match"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="friends" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-4">
              {/* Add Friend */}
              <div className="bg-bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">Add Friend</h2>
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
                      <p className="text-text-dim text-xs mb-3">Enter your friend&apos;s name and #tag</p>
                      <div className="flex gap-2 mb-2">
                        <input
                          value={friendSearch}
                          onChange={(e) => setFriendSearch(e.target.value)}
                          placeholder="Display Name"
                          className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                        />
                        <div className="flex items-center bg-bg-elevated border border-border rounded-lg px-2">
                          <span className="text-text-dim text-sm">#</span>
                          <input
                            value={friendTag}
                            onChange={(e) => setFriendTag(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="0000"
                            maxLength={4}
                            className="w-12 bg-transparent text-sm py-2 focus:outline-none font-mono"
                          />
                        </div>
                        <button
                          onClick={handleAddFriend}
                          disabled={!friendSearch || friendTag.length !== 4}
                          className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded-lg hover:brightness-110 disabled:opacity-30 cursor-pointer"
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
                  <h3 className="text-sm font-semibold text-warning mb-3">Pending Requests ({requests.length})</h3>
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
                          <button onClick={() => handleAccept(r._id)} className="px-3 py-1 bg-success/20 text-success text-xs font-medium rounded-lg cursor-pointer hover:bg-success/30">Accept</button>
                          <button onClick={() => handleDecline(r._id)} className="px-3 py-1 bg-danger/20 text-danger text-xs font-medium rounded-lg cursor-pointer hover:bg-danger/30">Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends List */}
              <div className="bg-bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-3">Friends</h3>
                {friends.length === 0 ? (
                  <div className="text-center py-8 text-text-dim">
                    <div className="text-3xl mb-2">👋</div>
                    <p className="text-sm">No friends yet</p>
                    <p className="text-xs mt-1">Share your tag <span className="font-mono text-accent">{user?.name}#{userTag}</span> with friends</p>
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
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Your Tag */}
              <div className="bg-bg-elevated/50 rounded-xl p-4 text-center">
                <p className="text-text-dim text-xs mb-1">Your tag — share it with friends</p>
                <p className="font-mono text-lg font-bold text-accent">{user?.name}#{userTag}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invite Modal - select turn time and send */}
      <AnimatePresence>
        {inviteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-bg-card border border-border rounded-2xl p-6 max-w-xs w-full text-center">
              <h3 className="text-lg font-bold mb-1">Invite {inviteModal.friendName}</h3>
              <p className="text-text-muted text-xs mb-4">Choose turn time limit</p>
              <div className="flex gap-2 mb-5">
                {[
                  { ms: 30000, label: "30s", desc: "Fast" },
                  { ms: 60000, label: "60s", desc: "Normal" },
                  { ms: 120000, label: "2min", desc: "Chill" },
                ].map((t) => (
                  <button key={t.ms} onClick={() => setInviteTurnTime(t.ms)}
                    className={`flex-1 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                      inviteTurnTime === t.ms ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted hover:border-border-light"
                    }`}>
                    <div className="font-bold">{t.label}</div>
                    <div className="text-[10px] opacity-70">{t.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setInviteModal(null)}
                  className="flex-1 py-2.5 bg-bg-elevated border border-border text-text font-medium rounded-xl cursor-pointer hover:bg-bg-hover">
                  Cancel
                </button>
                <button onClick={() => {
                  socket?.emit("client:invite:send", { toUserId: inviteModal.friendId, turnTime: inviteTurnTime });
                  setInviteModal(null);
                }}
                  className="flex-1 py-2.5 bg-accent text-bg font-semibold rounded-xl cursor-pointer hover:brightness-110">
                  Send Invite
                </button>
              </div>
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
              <h3 className="text-lg font-bold mb-1">Game Invite!</h3>
              <p className="text-text-muted text-sm mb-1"><strong className="text-text">{pendingInvite.from.displayName}</strong> wants to play</p>
              <p className="text-text-dim text-xs mb-5">Turn time: {pendingInvite.turnTimeMs / 1000}s</p>
              <div className="flex gap-2">
                <button onClick={() => { socket?.emit("client:invite:decline", { inviteId: pendingInvite.inviteId }); setPendingInvite(null); }}
                  className="flex-1 py-2.5 bg-bg-elevated border border-border text-text font-medium rounded-xl cursor-pointer hover:bg-bg-hover">
                  Decline
                </button>
                <button onClick={() => { socket?.emit("client:invite:accept", { inviteId: pendingInvite.inviteId }); }}
                  className="flex-1 py-2.5 bg-accent text-bg font-semibold rounded-xl cursor-pointer hover:brightness-110">
                  Accept
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
                  <p className="text-text-muted text-sm">Game starting...</p>
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
                    {readyState.amReady ? "Waiting for opponent..." : "Ready!"}
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
