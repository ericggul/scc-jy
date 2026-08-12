"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  CompetitiveFirmsSnapshot,
  FirmId,
  FirmVariableId,
} from "@/components/network-system/competitive-firms/model";

type Role = "controller" | "screen";

export type CompetitiveFirmsInterventionInput = {
      kind: "management";
      firmId: FirmId;
      variableId: FirmVariableId;
      amount: number;
    };

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const port = process.env.NEXT_PUBLIC_SOCKET_PORT || "4000";
    return `${protocol}://${window.location.hostname}:${port}`;
  }
  return `https://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

function getEvents() {
  return {
    join: "network-system-competitive-firms:join",
    hello: "network-system-competitive-firms:hello",
    stateOut: "network-system-competitive-firms:state",
    interventionIn: "network-system-competitive-firms:intervention:in",
  };
}

export function useCompetitiveFirmsSocket({
  role,
  firmId,
  onState,
}: {
  role: Role;
  firmId?: FirmId;
  onState?: (state: CompetitiveFirmsSnapshot) => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const onStateRef = useRef(onState);
  const events = useMemo(() => getEvents(), []);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<CompetitiveFirmsSnapshot | null>(null);

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

    const receiveState = (nextState: CompetitiveFirmsSnapshot) => {
      setState(nextState);
      onStateRef.current?.(nextState);
    };

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(events.join, { role, firmId, experimentSlug: "competitive-firms" });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on(events.hello, ({ state: nextState }) => receiveState(nextState));
    socket.on(events.stateOut, receiveState);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [events, firmId, role]);

  const sendIntervention = useCallback(
    (intervention: CompetitiveFirmsInterventionInput) => {
      socketRef.current?.emit(events.interventionIn, intervention);
    },
    [events.interventionIn],
  );

  return { connected, sendIntervention, state };
}
