"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type ExperimentRole = "mobile" | "screen";

export type ExperimentSignal = {
  id: string;
  experimentId: string;
  from: string;
  role: ExperimentRole | "unknown";
  sentAt: number;
  hue: number;
  intensity: number;
  x: number;
  y: number;
  label: string;
};

export type ExperimentPresence = {
  experimentId: string;
  total: number;
  mobiles: number;
  screens: number;
  clients: Array<{
    id: string;
    role: ExperimentRole | "unknown";
    connectedAt: number;
  }>;
  serverTime: number;
};

type OutgoingSignal = Pick<
  ExperimentSignal,
  "hue" | "intensity" | "x" | "y" | "label"
>;

type ExperimentSocketOptions = {
  experimentId: string;
  role: ExperimentRole;
  onSignal?: (signal: ExperimentSignal) => void;
};

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  if (typeof window !== "undefined") {
    return `https://${window.location.hostname}:${
      process.env.NEXT_PUBLIC_SOCKET_PORT || "3001"
    }`;
  }

  return `https://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || "3001"}`;
}

function getEvents(experimentId: string) {
  return {
    join: `${experimentId}:join`,
    hello: `${experimentId}:hello`,
    presence: `${experimentId}:presence`,
    signalIn: `${experimentId}:signal:in`,
    signalOut: `${experimentId}:signal:out`,
  };
}

export function useExperimentSocket({
  experimentId,
  role,
  onSignal,
}: ExperimentSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onSignalRef = useRef(onSignal);
  const events = useMemo(() => getEvents(experimentId), [experimentId]);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [presence, setPresence] = useState<ExperimentPresence | null>(null);
  const [lastSignal, setLastSignal] = useState<ExperimentSignal | null>(null);

  useEffect(() => {
    onSignalRef.current = onSignal;
  }, [onSignal]);

  useEffect(() => {
    const socket = io(getSocketOrigin(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 300,
      reconnectionDelayMax: 1500,
      timeout: 6000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setSocketId(socket.id ?? null);
      socket.emit(events.join, { role });
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setSocketId(null);
    });

    socket.on(
      events.hello,
      ({
        lastSignal: incomingSignal,
        presence: incomingPresence,
      }: {
        lastSignal: ExperimentSignal | null;
        presence: ExperimentPresence;
      }) => {
        if (incomingSignal) {
          setLastSignal(incomingSignal);
        }
        setPresence(incomingPresence);
      },
    );

    socket.on(events.presence, setPresence);
    socket.on(events.signalOut, (signal: ExperimentSignal) => {
      setLastSignal(signal);
      onSignalRef.current?.(signal);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [events, role]);

  const sendSignal = useCallback(
    (signal: OutgoingSignal) => {
      socketRef.current?.emit(events.signalIn, signal);
    },
    [events.signalIn],
  );

  return {
    connected,
    socketId,
    presence,
    lastSignal,
    sendSignal,
  };
}
