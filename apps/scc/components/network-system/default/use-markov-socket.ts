"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { MarkovIntervention, MarkovSnapshot } from "./model";

type Role = "controller" | "screen";

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    return `${protocol}://${window.location.hostname}:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
  }
  return `https://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

export function useMarkovSocket(role: Role) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<MarkovSnapshot | null>(null);
  const events = useMemo(
    () => ({
      join: "network-system-default:join",
      hello: "network-system-default:hello",
      state: "network-system-default:state",
      intervention: "network-system-default:intervention:in",
    }),
    [],
  );

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
    socket.on("connect", () => socket.emit(events.join, { role }));
    socket.on(events.hello, setState);
    socket.on(events.state, setState);
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [events, role]);

  const sendIntervention = useCallback(
    (intervention: MarkovIntervention) => {
      socketRef.current?.emit(events.intervention, intervention);
    },
    [events.intervention],
  );

  return { state, sendIntervention };
}
