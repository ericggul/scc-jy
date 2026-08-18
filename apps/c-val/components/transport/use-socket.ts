"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  CValHumanControlInput,
  CValRecordingCommand,
  CValRecordingStatus,
  CValSensorTrace,
  CValSnapshot,
} from "@/components/model";

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
  humanControlIn: "c-val-2:human-control:in",
  sensorTraceIn: "c-val-2:sensor-trace:in",
  recordingCommandIn: "c-val-2:recording-command:in",
  recordingCommandOut: "c-val-2:recording-command:out",
  recordingStatusIn: "c-val-2:recording-status:in",
  recordingStatusOut: "c-val-2:recording-status:out",
  humanControlResetOut: "c-val-2:human-control-reset:out",
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
  onRecordingCommand,
  onRecordingStatus,
  onHumanControlReset,
  retainState = true,
}: {
  role: CValRole;
  onState?: (state: CValSnapshot) => void;
  onRecordingCommand?: (command: CValRecordingCommand) => void;
  onRecordingStatus?: (status: CValRecordingStatus) => void;
  onHumanControlReset?: () => void;
  retainState?: boolean;
}) {
  const socketRef = useRef<Socket | null>(null);
  const onStateRef = useRef(onState);
  const onRecordingCommandRef = useRef(onRecordingCommand);
  const onRecordingStatusRef = useRef(onRecordingStatus);
  const onHumanControlResetRef = useRef(onHumanControlReset);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<CValPresence | null>(null);
  const [state, setState] = useState<CValSnapshot | null>(null);

  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

  useEffect(() => {
    onRecordingCommandRef.current = onRecordingCommand;
  }, [onRecordingCommand]);

  useEffect(() => {
    onRecordingStatusRef.current = onRecordingStatus;
  }, [onRecordingStatus]);

  useEffect(() => {
    onHumanControlResetRef.current = onHumanControlReset;
  }, [onHumanControlReset]);

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
    socket.on(events.recordingCommandOut, (command: CValRecordingCommand) => {
      onRecordingCommandRef.current?.(command);
    });
    socket.on(events.recordingStatusOut, (status: CValRecordingStatus) => {
      onRecordingStatusRef.current?.(status);
    });
    socket.on(events.humanControlResetOut, () => {
      onHumanControlResetRef.current?.();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [retainState, role]);

  const sendHumanControl = useCallback((control: CValHumanControlInput) => {
    socketRef.current?.emit(events.humanControlIn, control);
  }, []);

  const sendSensorTrace = useCallback((trace: CValSensorTrace) => {
    return new Promise<{ ok: boolean; fileName?: string; error?: string }>(
      (resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({ ok: false, error: "socket is not connected" });
          return;
        }
        socket.emit(
          events.sensorTraceIn,
          trace,
          (result: { ok: boolean; fileName?: string; error?: string }) =>
            resolve(result),
        );
      },
    );
  }, []);

  const sendRecordingCommand = useCallback((command: CValRecordingCommand) => {
    return new Promise<{
      ok: boolean;
      mobileCount?: number;
      error?: string;
    }>((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        resolve({ ok: false, error: "socket is not connected" });
        return;
      }
      socket.emit(events.recordingCommandIn, command, resolve);
    });
  }, []);

  const sendRecordingStatus = useCallback((status: CValRecordingStatus) => {
    socketRef.current?.emit(events.recordingStatusIn, status);
  }, []);

  const resetSystem = useCallback(() => {
    socketRef.current?.emit(events.resetIn);
  }, []);

  return {
    connected,
    connectionError,
    presence,
    state,
    sendHumanControl,
    sendSensorTrace,
    sendRecordingCommand,
    sendRecordingStatus,
    resetSystem,
  };
}
