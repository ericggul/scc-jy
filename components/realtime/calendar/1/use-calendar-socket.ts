"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { CalendarSelection, CalendarViewport } from "./types";

type CalendarRole = "mobile" | "screen";

type CalendarPresence = {
  experimentId: "calendar";
  variantId: "1";
  total: number;
  mobiles: number;
  screens: number;
  clients: Array<{
    id: string;
    role: CalendarRole | "unknown";
    connectedAt: number;
  }>;
  serverTime: number;
};

type CalendarSocketOptions = {
  role: CalendarRole;
  onSelection?: (selection: CalendarSelection) => void;
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

const events = {
  join: "calendar:join",
  hello: "calendar:hello",
  presence: "calendar:presence",
  selectionIn: "calendar:selection:in",
  selectionOut: "calendar:selection:out",
} as const;

export function useCalendarSocket({ role, onSelection }: CalendarSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onSelectionRef = useRef(onSelection);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<CalendarPresence | null>(null);
  const [selection, setSelection] = useState<CalendarSelection | null>(null);

  useEffect(() => {
    onSelectionRef.current = onSelection;
  }, [onSelection]);

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

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(null);
      socket.emit(events.join, { role, experimentSlug: "1" });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });
    socket.on(events.hello, (payload: {
      selection: CalendarSelection;
      presence: CalendarPresence;
    }) => {
      setSelection(payload.selection);
      setPresence(payload.presence);
      onSelectionRef.current?.(payload.selection);
    });
    socket.on(events.presence, setPresence);
    socket.on(events.selectionOut, (incoming: CalendarSelection) => {
      setSelection(incoming);
      onSelectionRef.current?.(incoming);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  const sendSelection = useCallback((profileIds: readonly string[], viewport: CalendarViewport) => {
    socketRef.current?.emit(events.selectionIn, { profileIds, viewport });
  }, []);

  return useMemo(() => ({
    connected,
    connectionError,
    presence,
    selection,
    sendSelection,
  }), [connected, connectionError, presence, selection, sendSelection]);
}
