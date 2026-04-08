"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket";

export function useSocket() {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = (session as { backendToken?: string })?.backendToken;
    if (!token) return;

    const s = getSocket(token);
    socketRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    return () => {
      s.off("connect");
      s.off("disconnect");
    };
  }, [session]);

  return { socket: socketRef.current, connected };
}
