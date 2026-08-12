"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  DdongMeongPhase,
  DdongMeongRole,
  DdongMeongSnapshot,
} from "../model/types";

const events = {
  join: "ddong-meong:2:join",
  hello: "ddong-meong:2:hello",
  state: "ddong-meong:2:state",
  sessionIn: "ddong-meong:2:session:in",
} as const;

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const port = process.env.NEXT_PUBLIC_SOCKET_PORT || "4000";
    return `${protocol}://${window.location.hostname}:${port}`;
  }

  return `https://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

export function useDdongMeongSocket(role: DdongMeongRole) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DdongMeongSnapshot | null>(null);

  useEffect(() => {
    const socket = io(getSocketOrigin(), {
      path: "/socket.io",
      rejectUnauthorized: false,
      transports: ["polling", "websocket"],
      upgrade: true,
      tryAllTransports: true,
      reconnection: true,
      reconnectionDelay: 300,
      reconnectionDelayMax: 1500,
      timeout: 6000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(null);
      socket.emit(events.join, { role });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });
    socket.on(events.hello, setSnapshot);
    socket.on(events.state, setSnapshot);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  const startSession = useCallback(() => {
    socketRef.current?.emit(events.sessionIn, { action: "start" });
  }, []);

  const updateSession = useCallback(
    (
      phase: Exclude<DdongMeongPhase, "complete">,
      cycleCount: number,
    ) => {
      socketRef.current?.emit(events.sessionIn, {
        action: "update",
        phase,
        cycleCount,
      });
    },
    [],
  );

  const completeSession = useCallback(() => {
    socketRef.current?.emit(events.sessionIn, { action: "complete" });
  }, []);

  return {
    connected,
    connectionError,
    snapshot,
    startSession,
    updateSession,
    completeSession,
  };
}
