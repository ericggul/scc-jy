"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  DdongMeongDisengagementSignal,
  DdongMeongEngagementState,
  DdongMeongPhase,
  DdongMeongRole,
  DdongMeongSessionOutcome,
  DdongMeongSnapshot,
} from "../model/types";

const events = {
  join: "ddong-meong:4:join",
  hello: "ddong-meong:4:hello",
  state: "ddong-meong:4:state",
  sessionIn: "ddong-meong:4:session:in",
} as const;

const disengagementEndpoint = "/ddong-meong/4/disengagement";

export type StartDdongMeongSessionInput = {
  contentSlug: string;
  contentTitle: string;
  nickname: string;
  participantId: string;
};

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  if (typeof window !== "undefined") {
    const port = process.env.NEXT_PUBLIC_SOCKET_PORT || "4000";
    return `https://${window.location.hostname}:${port}`;
  }

  return `https://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

export function useDdongMeongSocket(role: DdongMeongRole) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DdongMeongSnapshot | null>(null);

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
      socket.emit(events.join, { role });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });
    socket.on(events.hello, setSnapshot);
    socket.on(events.state, setSnapshot);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  const startSession = useCallback((input: StartDdongMeongSessionInput) => {
    socketRef.current?.emit(events.sessionIn, { action: "start", ...input });
  }, []);

  const updateSession = useCallback(
    (
      phase: Exclude<DdongMeongPhase, "complete">,
      interactionCount: number,
    ) => {
      socketRef.current?.emit(events.sessionIn, {
        action: "update",
        phase,
        interactionCount,
      });
    },
    [],
  );

  const completeSession = useCallback((outcome: DdongMeongSessionOutcome) => {
    socketRef.current?.emit(events.sessionIn, { action: "complete", outcome });
  }, []);

  const updateEngagement = useCallback(
    (engagement: DdongMeongEngagementState) => {
      socketRef.current?.emit(events.sessionIn, {
        action: "engagement",
        engagement,
      });
    },
    [],
  );

  const sendDisengagementBeacon = useCallback(
    ({
      participantId,
      signal,
    }: {
      participantId: string;
      signal: DdongMeongDisengagementSignal;
    }) => {
      const socketId = socketRef.current?.id;
      if (!socketId || typeof navigator === "undefined") return false;

      try {
        return navigator.sendBeacon(
          new URL(disengagementEndpoint, getSocketOrigin()).toString(),
          new Blob(
            [JSON.stringify({ participantId, signal, socketId })],
            { type: "text/plain;charset=UTF-8" },
          ),
        );
      } catch {
        return false;
      }
    },
    [],
  );

  return {
    connected,
    connectionError,
    completeSession,
    sendDisengagementBeacon,
    snapshot,
    startSession,
    updateEngagement,
    updateSession,
  };
}
