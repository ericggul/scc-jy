"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { PopulationIntervention, PopulationSnapshot } from "./model";

type PopulationRole = "controller" | "screen";

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    return `${protocol}://${window.location.hostname}:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
  }
  return `https://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

export function usePopulationSocket(role: PopulationRole) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<PopulationSnapshot | null>(null);
  const events = useMemo(() => ({
    join: "network-system-population:join",
    hello: "network-system-population:hello",
    state: "network-system-population:state",
    intervention: "network-system-population:intervention:in",
    reset: "network-system-population:reset:in",
  }), []);

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
      socket.emit(events.join, { role, experimentSlug: "population" });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on(events.hello, setState);
    socket.on(events.state, setState);
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [events, role]);

  const sendIntervention = useCallback((intervention: PopulationIntervention) => {
    socketRef.current?.emit(events.intervention, intervention);
  }, [events.intervention]);

  const resetSystem = useCallback(() => {
    socketRef.current?.emit(events.reset);
  }, [events.reset]);

  return { connected, state, sendIntervention, resetSystem };
}

