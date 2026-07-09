"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { DjEdge, DjHitTarget } from "@/components/dj/1/graph";
import type { DjExperimentSlug, DjScreenId } from "@/components/dj/experiments";

export type DjRole = "controller" | "screen";

export type DjReactionParameters = {
  coupling: number;
  diffusionA: number;
  diffusionB: number;
  rooms: Record<
    "1" | "2",
    {
      feed: number;
      kill: number;
      drive: number;
    }
  >;
};

export type DjReactionInteraction = {
  target: "1" | "2" | "connector";
  localX: number;
  localY: number;
  materialA: number;
  materialB: number;
  strength: number;
};

export type DjSignal = {
  id: string;
  experimentId: "dj";
  variantId: DjExperimentSlug;
  from: string;
  role: DjRole | "unknown";
  sentAt: number;
  source: "node" | "edge" | "parameter";
  nodeId: DjScreenId | null;
  edgeId: DjEdge["id"] | string | null;
  targetScreenIds: DjScreenId[];
  x: number | null;
  y: number | null;
  parameters?: DjReactionParameters;
  interaction?: DjReactionInteraction;
};

export type DjPresence = {
  experimentId: "dj";
  variantId: DjExperimentSlug;
  total: number;
  controllers: number;
  screens: number;
  clients: Array<{
    id: string;
    role: DjRole | "unknown";
    connectedAt: number;
  }>;
  serverTime: number;
};

type DjSocketOptions = {
  experimentSlug?: DjExperimentSlug;
  role: DjRole;
  onSignal?: (signal: DjSignal) => void;
  replayLastSignal?: boolean;
};

type OutgoingDjSignal =
  | (DjHitTarget & {
      x: number;
      y: number;
    })
  | {
      source: "parameter";
      targetScreenIds: DjScreenId[];
      x: number;
      y: number;
      parameters: DjReactionParameters;
      interaction: DjReactionInteraction;
    };

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

function getEvents() {
  return {
    join: "dj:join",
    hello: "dj:hello",
    presence: "dj:presence",
    signalIn: "dj:signal:in",
    signalOut: "dj:signal:out",
  };
}

export function useDjSocket({
  experimentSlug = "1",
  role,
  onSignal,
  replayLastSignal = false,
}: DjSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onSignalRef = useRef(onSignal);
  const events = useMemo(() => getEvents(), []);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<DjPresence | null>(null);
  const [lastSignal, setLastSignal] = useState<DjSignal | null>(null);

  useEffect(() => {
    onSignalRef.current = onSignal;
  }, [onSignal]);

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
      setSocketId(socket.id ?? null);
      socket.emit(events.join, { role, experimentSlug });
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setSocketId(null);
    });

    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });

    socket.on(
      events.hello,
      ({
        lastSignal: incomingSignal,
        presence: incomingPresence,
      }: {
        lastSignal: DjSignal | null;
        presence: DjPresence;
      }) => {
        if (incomingSignal) {
          setLastSignal(incomingSignal);
          if (replayLastSignal) {
            onSignalRef.current?.(incomingSignal);
          }
        }
        setPresence(incomingPresence);
      },
    );

    socket.on(events.presence, setPresence);
    socket.on(events.signalOut, (signal: DjSignal) => {
      setLastSignal(signal);
      onSignalRef.current?.(signal);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [events, experimentSlug, replayLastSignal, role]);

  const sendSignal = useCallback(
    (signal: OutgoingDjSignal) => {
      socketRef.current?.emit(events.signalIn, {
        ...signal,
        experimentSlug,
      });
    },
    [events.signalIn, experimentSlug],
  );

  return {
    connected,
    connectionError,
    socketId,
    presence,
    lastSignal,
    sendSignal,
  };
}
