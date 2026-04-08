"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const token = (session as { backendToken?: string })?.backendToken;

  const fetchFriends = useCallback(async () => {
    if (!token) return;
    try {
      const [fRes, rRes] = await Promise.all([
        fetch(`${API}/friends`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/friends/requests`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (fRes.ok) setFriends(await fRes.json());
      if (rRes.ok) setRequests(await rRes.json());
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

    socket.on("server:game:state", handleGameState);
    socket.on("server:matchmaking:found", handleFound);
    socket.on("server:friend:online", handleFriendOnline);
    socket.on("server:friend:offline", handleFriendOffline);
    return () => {
      socket.off("server:game:state", handleGameState);
      socket.off("server:matchmaking:found", handleFound);
      socket.off("server:friend:online", handleFriendOnline);
      socket.off("server:friend:offline", handleFriendOffline);
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
                  <span className="text-xl">🤖</span>
                  <div>
                    <h2 className="text-base font-semibold">Play vs AI</h2>
                    <p className="text-text-dim text-xs">Practice and improve your skills</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Easy", desc: "Random", difficulty: "easy", emoji: "🟢" },
                    { label: "Medium", desc: "Smart", difficulty: "medium", emoji: "🟡" },
                    { label: "Hard", desc: "Genius", difficulty: "hard", emoji: "🔴" },
                  ].map((m) => (
                    <button
                      key={m.difficulty}
                      onClick={() => handlePlayAI(m.difficulty)}
                      disabled={!connected}
                      className="bg-bg-elevated border border-border rounded-xl p-3 text-center hover:bg-bg-hover hover:border-border-light transition-all cursor-pointer active:scale-[0.97] disabled:opacity-40"
                    >
                      <div className="text-2xl mb-1">{m.emoji}</div>
                      <div className="font-semibold text-sm">{m.label}</div>
                      <div className="text-text-dim text-[10px]">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PvP */}
              <div className="bg-bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">⚔️</span>
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
                        <button className="px-3 py-1.5 bg-accent/15 text-accent text-xs font-medium rounded-lg cursor-pointer hover:bg-accent/25">
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
    </div>
  );
}
