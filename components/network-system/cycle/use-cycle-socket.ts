"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  CycleEdgeId,
  CycleNodeId,
  CycleSnapshot,
} from "@/components/network-system/cycle/model";

type CycleRole = "controller" | "screen";

export type CyclePresence = {
  experimentId: "network-system";
  variantId: "cycle";
  total: number;
  controllers: number;
  screens: number;
  clients: Array<{
    id: string;
    role: CycleRole | "unknown";
    connectedAt: number;
  }>;
  serverTime: number;
};

export type CycleInterventionInput =
  | { kind: "node-shock"; nodeId: CycleNodeId; amount: number }
  | { kind: "edge-weight"; edgeId: CycleEdgeId; amount: number };

const events = {
  join: "network-system-cycle:join",
  hello: "network-system-cycle:hello",
  presence: "network-system-cycle:presence",
  stateOut: "network-system-cycle:state",
  interventionIn: "network-system-cycle:intervention:in",
  resetIn: "network-system-cycle:reset:in",
} as const;

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    return `${protocol}://${window.location.hostname}:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
  }
  return `https://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

export function useCycleSocket({
  role,
  onState,
}: {
  role: CycleRole;
  onState?: (state: CycleSnapshot) => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const onStateRef = useRef(onState);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<CyclePresence | null>(null);
  const [state, setState] = useState<CycleSnapshot | null>(null);

  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

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

    const receiveState = (nextState: CycleSnapshot) => {
      setState(nextState);
      onStateRef.current?.(nextState);
    };

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(events.join, { role, experimentSlug: "cycle" });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on(
      events.hello,
      ({ state: nextState, presence: nextPresence }: { state: CycleSnapshot; presence: CyclePresence }) => {
        receiveState(nextState);
        setPresence(nextPresence);
      },
    );
    socket.on(events.presence, setPresence);
    socket.on(events.stateOut, receiveState);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  const sendIntervention = useCallback((input: CycleInterventionInput) => {
    socketRef.current?.emit(events.interventionIn, input);
  }, []);

  const resetSystem = useCallback(() => {
    socketRef.current?.emit(events.resetIn);
  }, []);

  return { connected, presence, state, sendIntervention, resetSystem };
}
