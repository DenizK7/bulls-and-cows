"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { useGame } from "@/hooks/useGame";
import Image from "next/image";

export default function LobbyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { socket, connected } = useSocket();
  const game = useGame(socket);
  const [matchmaking, setMatchmaking] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // When game starts, navigate to game page
  useEffect(() => {
    if (game.gameId && game.status !== "idle") {
      router.push(`/game/${game.gameId}`);
    }
  }, [game.gameId, game.status, router]);

  // Listen for matchmaking found
  useEffect(() => {
    if (!socket) return;
    const handleFound = (data: { gameId: string }) => {
      setMatchmaking(false);
      game.joinGame(data.gameId);
    };
    socket.on("server:matchmaking:found", handleFound);
    return () => { socket.off("server:matchmaking:found", handleFound); };
  }, [socket, game]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session?.user;

  const handlePlayAI = (difficulty: string) => {
    game.startAI(difficulty);
  };

  const handleFindMatch = () => {
    if (matchmaking) {
      socket?.emit("client:matchmaking:leave");
      setMatchmaking(false);
    } else {
      socket?.emit("client:matchmaking:join");
      setMatchmaking(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[10%] w-80 h-80 bg-accent/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-[15%] left-[5%] w-72 h-72 bg-bull/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-6">
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
              <span className="text-text-dim text-xs">{connected ? "Online" : "Connecting..."}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.image && (
              <Image
                src={user.image}
                alt=""
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="text-sm text-text-muted">{user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs text-text-dim hover:text-text-muted transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Play vs AI */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-card border border-border rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-1">Play vs AI</h2>
          <p className="text-text-muted text-sm mb-4">Practice against the computer</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Easy", desc: "Random guesses", difficulty: "easy", color: "text-success" },
              { label: "Medium", desc: "Learns from hints", difficulty: "medium", color: "text-warning" },
              { label: "Hard", desc: "Optimal strategy", difficulty: "hard", color: "text-danger" },
            ].map((mode) => (
              <button
                key={mode.difficulty}
                onClick={() => handlePlayAI(mode.difficulty)}
                disabled={!connected}
                className="bg-bg-elevated border border-border rounded-xl p-4 text-center hover:bg-bg-hover hover:border-border-light transition-all cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className={`font-bold text-lg ${mode.color}`}>{mode.label}</div>
                <div className="text-text-dim text-xs mt-1">{mode.desc}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Find Match */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-card border border-border rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-1">Play Online</h2>
          <p className="text-text-muted text-sm mb-4">Find a random opponent</p>

          <button
            onClick={handleFindMatch}
            disabled={!connected}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
              matchmaking
                ? "bg-danger/20 border-2 border-danger text-danger"
                : "bg-accent text-bg hover:brightness-110"
            }`}
          >
            {matchmaking ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                Searching... Cancel
              </span>
            ) : (
              "Find Match"
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
