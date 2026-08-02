"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  CValOrientation,
  CValSnapshot,
} from "@/components/c-val/2/model";

export type CValRole = "mobile" | "controller" | "screen";

export type CValPresence = {
  experimentId: "c-val";
  version: "2";
  total: number;
  mobiles: number;
  controllers: number;
  screens: number;
  clients: Array<{
    id: string;
    role: CValRole | "unknown";
    connectedAt: number;
  }>;
  serverTime: number;
};

const events = {
  join: "c-val-2:join",
  hello: "c-val-2:hello",
  presence: "c-val-2:presence",
  stateOut: "c-val-2:state",
  orientationIn: "c-val-2:orientation:in",
  resetIn: "c-val-2:reset:in",
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

export function useCValSocket({
  role,
  onState,
  retainState = true,
}: {
  role: CValRole;
  onState?: (state: CValSnapshot) => void;
  retainState?: boolean;
}) {
  const socketRef = useRef<Socket | null>(null);
  const onStateRef = useRef(onState);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<CValPresence | null>(null);
  const [state, setState] = useState<CValSnapshot | null>(null);

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

    const receiveState = (nextState: CValSnapshot) => {
      if (retainState) setState(nextState);
      onStateRef.current?.(nextState);
    };

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(null);
      socket.emit(events.join, { version: "2", role });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });
    socket.on(
      events.hello,
      ({
        state: nextState,
        presence: nextPresence,
      }: {
        state: CValSnapshot;
        presence: CValPresence;
      }) => {
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
  }, [retainState, role]);

  const sendOrientation = useCallback((orientation: CValOrientation) => {
    socketRef.current?.emit(events.orientationIn, orientation);
  }, []);

  const resetSystem = useCallback(() => {
    socketRef.current?.emit(events.resetIn);
  }, []);

  return {
    connected,
    connectionError,
    presence,
    state,
    sendOrientation,
    resetSystem,
  };
}

