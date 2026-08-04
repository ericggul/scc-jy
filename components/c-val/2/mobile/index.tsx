"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cValParameterLabels,
  orientationToCValParameters,
  type CValHumanControlInput,
  type CValOrientation,
  type CValRecordingCommand,
  type CValRecordedOrientationEvent,
  type CValSensorTrace,
} from "@/components/c-val/2/model";
import { useCValSocket } from "@/components/c-val/2/transport";
import {
  calibrateRawOrientation,
  finiteOrientationValue,
} from "@/socket/experiments/c-val/2/orientation.mjs";

type MotionPermission = "idle" | "listening" | "denied" | "unavailable";
type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};
type RawOrientation = { alpha: number; beta: number; gamma: number };
type RecordingStatus =
  | "idle"
  | "recording"
  | "saving"
  | "saved"
  | "error";

const DEFAULT_RECORDING_DURATION_MS = 12_000;
const START_DELTA_DEGREES = 2;

const initialControl: CValHumanControlInput = {
  volatility: 0.5,
  activity: 0.5,
  liquidity: 0.5,
  engaged: false,
  sampledAt: 0,
};

const initialOrientation: CValOrientation = {
  absolute: false,
  alpha: 0,
  beta: 0,
  gamma: 0,
};

function finiteSensorValue(value: number | null) {
  return Number.isFinite(value) ? Number(value) : null;
}

export default function CValMobile() {
  const [control, setControl] = useState<CValHumanControlInput>(initialControl);
  const [orientation, setOrientation] =
    useState<CValOrientation>(initialOrientation);
  const [permission, setPermission] = useState<MotionPermission>("idle");
  const baselineRef = useRef<RawOrientation | null>(null);
  const latestRawRef = useRef<RawOrientation | null>(null);
  const lastSentAtRef = useRef(0);
  const listeningRef = useRef(false);
  const recordingRef = useRef<{
    startedAt: number;
    recordedAt: string;
    orientationEvents: CValRecordedOrientationEvent[];
  } | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteRecordingCommandRef = useRef<
    (command: CValRecordingCommand) => void
  >(() => {});
  const remoteControlResetRef = useRef<() => void>(() => {});
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("idle");
  const [recordingMessage, setRecordingMessage] = useState("");
  const { connected, presence, state, sendHumanControl, sendSensorTrace, sendRecordingStatus } =
    useCValSocket({
      role: "mobile",
      onRecordingCommand: (command) =>
        remoteRecordingCommandRef.current(command),
      onHumanControlReset: () => remoteControlResetRef.current(),
    });

  useEffect(() => {
    remoteControlResetRef.current = () => {
      baselineRef.current = latestRawRef.current;
      setOrientation(initialOrientation);
      setControl(initialControl);
      sendHumanControl({ ...initialControl, sampledAt: performance.now() });
    };
  }, [sendHumanControl]);

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      const raw = {
        alpha: finiteOrientationValue(event.alpha),
        beta: finiteOrientationValue(event.beta),
        gamma: finiteOrientationValue(event.gamma),
      };
      latestRawRef.current = raw;
      baselineRef.current ??= raw;
      const nextOrientation = calibrateRawOrientation(
        { ...raw, absolute: event.absolute },
        baselineRef.current,
      );
      setOrientation(nextOrientation);

      const parameters = orientationToCValParameters(nextOrientation);
      const engaged =
        Math.abs(nextOrientation.beta) >= START_DELTA_DEGREES;
      const sampledAt = performance.now();
      const nextControl = { ...parameters, engaged, sampledAt };
      setControl(nextControl);

      if (sampledAt - lastSentAtRef.current >= 16) {
        lastSentAtRef.current = sampledAt;
        sendHumanControl(nextControl);
      }
    },
    [sendHumanControl],
  );

  // TEMPORARY RESEARCH INSTRUMENTATION: this listener is attached only while
  // a recording is active and must be removed after direct-input validation.
  const captureRecordingOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      const recording = recordingRef.current;
      if (!recording) return;
      recording.orientationEvents.push({
        id: `orientation-${recording.orientationEvents.length + 1}`,
        tMs: performance.now() - recording.startedAt,
        absolute: Boolean(event.absolute),
        alpha: finiteSensorValue(event.alpha) ?? 0,
        beta: finiteSensorValue(event.beta) ?? 0,
        gamma: finiteSensorValue(event.gamma) ?? 0,
      });
    },
    [],
  );

  const finishRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    window.removeEventListener(
      "deviceorientation",
      captureRecordingOrientation,
    );
    const durationMs = performance.now() - recording.startedAt;
    const trace: CValSensorTrace = {
      schemaVersion: 2,
      kind: "browser-device-motion-orientation",
      profile: "author-direct-orientation-01",
      provenance: {
        type: "recorded",
        recordedAt: recording.recordedAt,
      },
      durationMs,
      orientationEvents: recording.orientationEvents,
      motionEvents: [],
    };
    setRecordingStatus("saving");
    sendRecordingStatus({ status: "saving", message: "SAVING TRACE" });
    const result = await sendSensorTrace(trace);
    if (result.ok) {
      setRecordingStatus("saved");
      setRecordingMessage(
        `${result.fileName} · O${trace.orientationEvents.length} M${trace.motionEvents.length}`,
      );
      sendRecordingStatus({
        status: "saved",
        message: `${result.fileName} · O${trace.orientationEvents.length} M${trace.motionEvents.length}`,
      });
    } else {
      setRecordingStatus("error");
      setRecordingMessage(result.error ?? "SAVE FAILED");
      sendRecordingStatus({
        status: "error",
        message: result.error ?? "SAVE FAILED",
      });
    }
  }, [captureRecordingOrientation, sendRecordingStatus, sendSensorTrace]);

  const startRecording = useCallback((durationMs = DEFAULT_RECORDING_DURATION_MS) => {
    if (recordingRef.current) return;
    if (!listeningRef.current) {
      setRecordingStatus("error");
      setRecordingMessage("ENABLE MOTION ON MOBILE FIRST");
      sendRecordingStatus({
        status: "error",
        message: "ENABLE MOTION ON MOBILE FIRST",
      });
      return;
    }
    const safeDurationMs = Math.min(Math.max(durationMs, 5_000), 60_000);
    recordingRef.current = {
      startedAt: performance.now(),
      recordedAt: new Date().toISOString(),
      orientationEvents: [],
    };
    window.addEventListener(
      "deviceorientation",
      captureRecordingOrientation,
      { passive: true },
    );
    setRecordingStatus("recording");
    setRecordingMessage(
      `RECORDING ${(safeDurationMs / 1_000).toFixed(0)}S · SHAKE, TURN, PAUSE, REVERSE`,
    );
    sendRecordingStatus({
      status: "started",
      message: `RECORDING ${(safeDurationMs / 1_000).toFixed(0)}S`,
    });
    recordingTimerRef.current = setTimeout(
      () => void finishRecording(),
      safeDurationMs,
    );
  }, [captureRecordingOrientation, finishRecording, sendRecordingStatus]);

  useEffect(() => {
    remoteRecordingCommandRef.current = (command) => {
      if (command.action === "stop") {
        void finishRecording();
        return;
      }
      startRecording(command.durationMs);
    };
  }, [finishRecording, startRecording]);

  async function enableMotion() {
    if (!("DeviceOrientationEvent" in window)) {
      setPermission("unavailable");
      return;
    }
    const OrientationEvent =
      DeviceOrientationEvent as OrientationEventConstructor;
    try {
      const orientationPermission =
        await (OrientationEvent.requestPermission?.() ??
          Promise.resolve("granted"));
      if (orientationPermission !== "granted") {
        setPermission("denied");
        return;
      }
    } catch {
      setPermission("denied");
      return;
    }

    if (!listeningRef.current) {
      listeningRef.current = true;
      window.addEventListener("deviceorientation", handleOrientation);
    }
    setPermission("listening");
  }

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener(
        "deviceorientation",
        captureRecordingOrientation,
      );
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [captureRecordingOrientation, handleOrientation]);

  const betaPosition = Math.max(-1, Math.min(orientation.beta / 35, 1));
  const listenerCount =
    (presence?.controllers ?? 0) + (presence?.screens ?? 0);
  const price = state?.market.index ?? 100;
  const priceMove = state?.market.oneSecondMovePercent ?? 0;
  const priceState =
    state?.phase === "waiting"
      ? "WAITING"
      : priceMove > 0.04
        ? "RISING"
        : priceMove < -0.04
          ? "FALLING"
          : "STILL";
  const priceColor =
    priceState === "RISING"
      ? "#32d74b"
      : priceState === "FALLING"
        ? "#ff453a"
        : "#ffffff";

  return (
    <main className="relative grid h-dvh w-dvw touch-none grid-rows-[auto_1fr_auto] overflow-hidden bg-[#050505] text-white">
      <header className="flex items-center justify-between border-b border-white/[0.12] px-4 py-3 font-mono text-[11px] text-[#a1a1a6]">
        <span className={connected ? "text-[#32d74b]" : "text-[#ff453a]"}>
          {connected ? "LIVE" : "OFFLINE"}
        </span>
        <span style={{ color: priceColor }}>{priceState}</span>
        <span>{listenerCount} LISTENER</span>
      </header>

      {recordingStatus !== "idle" && recordingMessage ? (
        <output
          className="absolute left-1/2 top-14 z-10 max-w-[92vw] -translate-x-1/2 bg-black px-3 py-2 text-center font-mono text-[10px] text-white"
          data-status={recordingStatus}
        >
          {recordingMessage}
        </output>
      ) : null}

      <section
        className="relative min-h-0 overflow-hidden"
        aria-label="Phone angle and execution-derived market response"
      >
        <div
          className="absolute left-0 right-0 h-px bg-white shadow-[0_0_18px_rgba(255,255,255,0.4)]"
          style={{ top: `${50 + betaPosition * 34}%` }}
        />
        <div className="absolute inset-0 grid place-items-center">
          {permission === "listening" ? (
            <output className="relative bg-black/75 px-4 py-3 text-center font-mono tabular-nums">
              <strong
                className="block text-[clamp(36px,15vw,72px)] font-normal leading-none"
                style={{ color: priceColor }}
              >
                {price.toFixed(2)}
              </strong>
              <span className="mt-2 block text-[11px] text-white/65">
                {priceState === "WAITING"
                  ? "MOVE PHONE TO OPEN MARKET"
                  : `${priceState} ${priceMove >= 0 ? "+" : ""}${priceMove.toFixed(1)}%`}
              </span>
            </output>
          ) : (
            <button
              type="button"
              className="border border-white/25 bg-black px-5 py-3 font-mono text-[12px] font-semibold hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none"
              onClick={enableMotion}
            >
              {permission === "denied"
                ? "MOTION DENIED"
                : permission === "unavailable"
                  ? "MOTION UNAVAILABLE"
                  : "ENABLE MOTION"}
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-3 border-t border-white/[0.12] font-mono tabular-nums">
        {(
          [
            ["volatility", "INTENSITY", "#ffd60a"],
            ["activity", "DIRECTION", "#32d74b"],
            ["liquidity", "DEPTH", "#64d2ff"],
          ] as const
        ).map(([parameterId, axis, color], index) => (
          <div
            key={parameterId}
            className={`${index < 2 ? "border-r border-white/[0.12]" : ""} px-3 py-4`}
            style={{ color }}
          >
            <div className="truncate text-[10px]">
              {cValParameterLabels[parameterId]} {axis}
            </div>
            <div className="mt-1 text-[clamp(20px,7vw,38px)] leading-none">
              {(control[parameterId] * 100).toFixed(0)}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
