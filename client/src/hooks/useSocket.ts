"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";

export function useSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = (session as { backendToken?: string })?.backendToken;
    if (!token) return;

    const s = getSocket(token);
    setSocket(s);
    setConnected(s.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [session]);

  return { socket, connected };
}
