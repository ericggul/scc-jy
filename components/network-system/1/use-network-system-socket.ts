"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  InstitutionId,
  NetworkSystemSnapshot,
  SystemEdgeId,
} from "@/components/network-system/1/model";
import type { NetworkSystemExperimentSlug } from "@/components/network-system/experiments";

export type NetworkSystemRole = "controller" | "screen";

export type NetworkSystemPresence = {
  experimentId: "network-system";
  variantId: NetworkSystemExperimentSlug;
  total: number;
  controllers: number;
  screens: number;
  clients: Array<{
    id: string;
    role: NetworkSystemRole | "unknown";
    connectedAt: number;
  }>;
  serverTime: number;
};

export type NetworkSystemInterventionInput =
  | {
      kind: "node-shock";
      institutionId: InstitutionId;
      amount: number;
      x: number;
      y: number;
    }
  | {
      kind: "edge-weight";
      edgeId: SystemEdgeId;
      amount: number;
      x: number;
      y: number;
    };

type NetworkSystemSocketOptions = {
  experimentSlug?: NetworkSystemExperimentSlug;
  role: NetworkSystemRole;
  onState?: (state: NetworkSystemSnapshot) => void;
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
    join: "network-system:join",
    hello: "network-system:hello",
    presence: "network-system:presence",
    stateOut: "network-system:state",
    interventionIn: "network-system:intervention:in",
    resetIn: "network-system:reset:in",
  };
}

export function useNetworkSystemSocket({
  experimentSlug = "1",
  role,
  onState,
}: NetworkSystemSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onStateRef = useRef(onState);
  const events = useMemo(() => getEvents(), []);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<NetworkSystemPresence | null>(null);
  const [state, setState] = useState<NetworkSystemSnapshot | null>(null);

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

    function receiveState(nextState: NetworkSystemSnapshot) {
      setState(nextState);
      onStateRef.current?.(nextState);
    }

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(null);
      socket.emit(events.join, { role, experimentSlug });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });

    socket.on(
      events.hello,
      ({
        state: currentState,
        presence: currentPresence,
      }: {
        state: NetworkSystemSnapshot;
        presence: NetworkSystemPresence;
      }) => {
        receiveState(currentState);
        setPresence(currentPresence);
      },
    );

    socket.on(events.presence, setPresence);
    socket.on(events.stateOut, receiveState);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [events, experimentSlug, role]);

  const sendIntervention = useCallback(
    (intervention: NetworkSystemInterventionInput) => {
      socketRef.current?.emit(events.interventionIn, {
        ...intervention,
        experimentSlug,
      });
    },
    [events.interventionIn, experimentSlug],
  );

  const resetSystem = useCallback(() => {
    socketRef.current?.emit(events.resetIn, { experimentSlug });
  }, [events.resetIn, experimentSlug]);

  return {
    connected,
    connectionError,
    presence,
    state,
    sendIntervention,
    resetSystem,
  };
}
