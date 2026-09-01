"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { FieldControlId } from "../model";

export type FieldGesturePhase = "start" | "move" | "end";

export type FieldGestureSignal = {
  controlId: FieldControlId;
  from: string;
  id: string;
  phase: FieldGesturePhase;
  pointerId: number;
  sentAt: number;
  x: number;
  y: number;
};

type FieldGestureInput = Pick<
  FieldGestureSignal,
  "controlId" | "phase" | "pointerId" | "x" | "y"
>;

type FieldRole = "mobile" | "screen";

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

export function useFingerSkatingFieldSocket({
  role,
  onGesture,
}: {
  onGesture?: (signal: FieldGestureSignal) => void;
  role: FieldRole;
}) {
  const socketRef = useRef<Socket | null>(null);
  const onGestureRef = useRef(onGesture);
  const events = useMemo(
    () => ({
      gestureIn: "finger-skating-field-1:gesture:in",
      gestureOut: "finger-skating-field-1:gesture:out",
      join: "finger-skating-field-1:join",
    }),
    [],
  );

  useEffect(() => {
    onGestureRef.current = onGesture;
  }, [onGesture]);

  useEffect(() => {
    const socket = io(getSocketOrigin(), {
      path: "/socket.io",
      rejectUnauthorized: false,
      transports: ["polling", "websocket"],
      upgrade: true,
      tryAllTransports: true,
      reconnection: true,
      reconnectionDelay: 300,
      reconnectionDelayMax: 1_500,
      timeout: 6_000,
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit(events.join, { role }));
    socket.on(events.gestureOut, (signal: FieldGestureSignal) => {
      onGestureRef.current?.(signal);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [events, role]);

  const sendGesture = useCallback(
    (signal: FieldGestureInput) => {
      socketRef.current?.emit(events.gestureIn, signal);
    },
    [events.gestureIn],
  );

  return { sendGesture };
}
