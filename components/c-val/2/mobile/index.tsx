"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkpointOrientationToParameters,
  cValOneOrientationToParameters,
  cValParameterLabels,
  rotationRateToCValControl,
  type CValHumanControlInput,
  type CValInputMappingId,
  type CValOrientation,
  type CValRecordingCommand,
  type CValRecordedMotionEvent,
  type CValRecordedOrientationEvent,
  type CValSensorTrace,
} from "@/components/c-val/2/model";
import { useCValSocket } from "@/components/c-val/2/transport";
import {
  calibrateRawOrientation,
  finiteOrientationValue,
} from "@/socket/experiments/c-val/2/orientation.mjs";
import CValMobileV2View from "./v2/view";

export type MotionPermission = "idle" | "listening" | "denied" | "unavailable";
type MotionEventConstructor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};
type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};
type RawOrientation = Omit<CValOrientation, "absolute">;
type RecordingStatus =
  | "idle"
  | "recording"
  | "saving"
  | "saved"
  | "error";

const DEFAULT_RECORDING_DURATION_MS = 12_000;
const ORIENTATION_ENGAGEMENT_DEGREES = 2;
const inputMappings: Array<{ id: CValInputMappingId; label: string }> = [
  { id: "c-val-1", label: "C-VAL 1" },
  { id: "07a5aaf", label: "07A5AAF" },
  { id: "current", label: "CURRENT" },
];
const initialControl: CValHumanControlInput = {
  volatility: 0.5,
  activity: 0.5,
  liquidity: 0.5,
  engaged: false,
  sampledAt: 0,
};

export type CValMobileAxisSignal = {
  alpha: number;
  beta: number;
  gamma: number;
};

const initialAxisSignal: CValMobileAxisSignal = {
  alpha: 0,
  beta: 0,
  gamma: 0,
};

function finiteSensorValue(value: number | null) {
  return Number.isFinite(value) ? Number(value) : null;
}

export default function CValMobile({
  interfaceVersion = "v1",
}: {
  interfaceVersion?: "v1" | "v2";
}) {
  const [control, setControl] = useState<CValHumanControlInput>(initialControl);
  const [axisSignal, setAxisSignal] =
    useState<CValMobileAxisSignal>(initialAxisSignal);
  const [inputMapping, setInputMapping] =
    useState<CValInputMappingId>("current");
  const [permission, setPermission] = useState<MotionPermission>("idle");
  const inputMappingRef = useRef<CValInputMappingId>("current");
  const baselineRef = useRef<RawOrientation | null>(null);
  const latestRawRef = useRef<RawOrientation | null>(null);
  const lastSentAtRef = useRef(0);
  const listeningRef = useRef<"orientation" | "motion" | null>(null);
  const recordingRef = useRef<{
    startedAt: number;
    recordedAt: string;
    orientationEvents: CValRecordedOrientationEvent[];
    motionEvents: CValRecordedMotionEvent[];
  } | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteRecordingCommandRef = useRef<
    (command: CValRecordingCommand) => void
  >(() => {});
  const remoteControlResetRef = useRef<() => void>(() => {});
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("idle");
  const [recordingMessage, setRecordingMessage] = useState("");
  const { connected, presence, state, sendHumanControl, sendSensorTrace, sendRecordingStatus, resetSystem } =
    useCValSocket({
      role: "mobile",
      onRecordingCommand: (command) =>
        remoteRecordingCommandRef.current(command),
      onHumanControlReset: () => remoteControlResetRef.current(),
    });

  useEffect(() => {
    remoteControlResetRef.current = () => {
      baselineRef.current = latestRawRef.current;
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
      const orientation = calibrateRawOrientation(
        { ...raw, absolute: event.absolute },
        baselineRef.current,
      );
      setAxisSignal({
        alpha: orientation.alpha,
        beta: orientation.beta,
        gamma: orientation.gamma,
      });
      const mapping = inputMappingRef.current;
      const parameters =
        mapping === "c-val-1"
          ? cValOneOrientationToParameters(orientation)
          : checkpointOrientationToParameters(orientation);
      const engaged =
        mapping === "07a5aaf"
          ? Math.abs(orientation.beta) >= ORIENTATION_ENGAGEMENT_DEGREES
          : Math.max(
                Math.abs(orientation.alpha),
                Math.abs(orientation.beta),
                Math.abs(orientation.gamma),
              ) >= ORIENTATION_ENGAGEMENT_DEGREES;
      const sampledAt = performance.now();
      const nextControl = { ...parameters, engaged, sampledAt };
      setControl(nextControl);

      if (sampledAt - lastSentAtRef.current >= 16) {
        lastSentAtRef.current = sampledAt;
        sendHumanControl(nextControl);
      }

      const recording = recordingRef.current;
      if (recording) {
        recording.orientationEvents.push({
          id: `orientation-${recording.orientationEvents.length + 1}`,
          tMs: sampledAt - recording.startedAt,
          absolute: Boolean(event.absolute),
          alpha: raw.alpha,
          beta: raw.beta,
          gamma: raw.gamma,
        });
      }
    },
    [sendHumanControl],
  );

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const rotationRate = {
        alpha: finiteSensorValue(event.rotationRate?.alpha ?? null),
        beta: finiteSensorValue(event.rotationRate?.beta ?? null),
        gamma: finiteSensorValue(event.rotationRate?.gamma ?? null),
      };
      if (Object.values(rotationRate).every((value) => value === null)) return;
      const sampledAt = performance.now();
      const gesture = rotationRateToCValControl(rotationRate);
      setAxisSignal({
        alpha: rotationRate.alpha ?? 0,
        beta: rotationRate.beta ?? 0,
        gamma: rotationRate.gamma ?? 0,
      });
      const nextControl = {
        ...gesture.parameters,
        engaged: gesture.engaged,
        sampledAt,
      };
      setControl(nextControl);

      if (sampledAt - lastSentAtRef.current >= 16) {
        lastSentAtRef.current = sampledAt;
        sendHumanControl(nextControl);
      }

      const recording = recordingRef.current;
      if (recording) {
        recording.motionEvents.push({
          id: `motion-${recording.motionEvents.length + 1}`,
          tMs: sampledAt - recording.startedAt,
          intervalMs: finiteSensorValue(event.interval),
          acceleration: {
            x: finiteSensorValue(event.acceleration?.x ?? null),
            y: finiteSensorValue(event.acceleration?.y ?? null),
            z: finiteSensorValue(event.acceleration?.z ?? null),
          },
          accelerationIncludingGravity: {
            x: finiteSensorValue(event.accelerationIncludingGravity?.x ?? null),
            y: finiteSensorValue(event.accelerationIncludingGravity?.y ?? null),
            z: finiteSensorValue(event.accelerationIncludingGravity?.z ?? null),
          },
          rotationRate,
        });
      }
    },
    [sendHumanControl],
  );

  const finishRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const durationMs = performance.now() - recording.startedAt;
    const trace: CValSensorTrace = {
      schemaVersion: 2,
      kind: "browser-device-motion-orientation",
      profile: `author-input-comparison-${inputMappingRef.current}`,
      provenance: {
        type: "recorded",
        recordedAt: recording.recordedAt,
      },
      durationMs,
      orientationEvents: recording.orientationEvents,
      motionEvents: recording.motionEvents,
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
  }, [sendRecordingStatus, sendSensorTrace]);

  const startRecording = useCallback((durationMs = DEFAULT_RECORDING_DURATION_MS) => {
    if (recordingRef.current) return;
    if (listeningRef.current === null) {
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
      motionEvents: [],
    };
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
  }, [finishRecording, sendRecordingStatus]);

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
    const usesMotion = inputMappingRef.current === "current";
    const eventAvailable = usesMotion
      ? "DeviceMotionEvent" in window
      : "DeviceOrientationEvent" in window;
    if (!eventAvailable) {
      setPermission("unavailable");
      return;
    }
    try {
      const sensorPermission = usesMotion
        ? await ((DeviceMotionEvent as MotionEventConstructor).requestPermission?.() ??
            Promise.resolve("granted"))
        : await ((DeviceOrientationEvent as OrientationEventConstructor).requestPermission?.() ??
            Promise.resolve("granted"));
      if (sensorPermission !== "granted") {
        setPermission("denied");
        return;
      }
    } catch {
      setPermission("denied");
      return;
    }

    if (listeningRef.current === null && usesMotion) {
      listeningRef.current = "motion";
      window.addEventListener("devicemotion", handleMotion);
    } else if (listeningRef.current === null) {
      listeningRef.current = "orientation";
      window.addEventListener("deviceorientation", handleOrientation);
    }
    setPermission("listening");
  }

  const stopListening = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    window.removeEventListener("deviceorientation", handleOrientation);
    listeningRef.current = null;
  }, [handleMotion, handleOrientation]);

  function selectInputMapping(nextMapping: CValInputMappingId) {
    stopListening();
    inputMappingRef.current = nextMapping;
    setInputMapping(nextMapping);
    baselineRef.current = null;
    latestRawRef.current = null;
    lastSentAtRef.current = 0;
    setControl(initialControl);
    setAxisSignal(initialAxisSignal);
    setPermission("idle");
    resetSystem();
  }

  useEffect(() => {
    return () => {
      stopListening();
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [stopListening]);

  const directionPosition = Math.max(
    -1,
    Math.min((control.activity - 0.5) / 0.5, 1),
  );
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

  if (interfaceVersion === "v2") {
    return (
      <CValMobileV2View
        price={price}
        priceMove={priceMove}
        priceState={priceState}
        inputMappings={inputMappings}
        inputMapping={inputMapping}
        permission={permission}
        control={control}
        axisSignal={axisSignal}
        recordingStatus={recordingStatus}
        recordingMessage={recordingMessage}
        onEnableMotion={enableMotion}
        onSelectInputMapping={selectInputMapping}
      />
    );
  }

  return (
    <main className="relative grid h-dvh w-dvw touch-none grid-rows-[auto_auto_1fr_auto] overflow-hidden bg-[#050505] text-white">
      <header className="flex items-center justify-between border-b border-white/[0.12] px-4 py-3 font-mono text-[11px] text-[#a1a1a6]">
        <span className={connected ? "text-[#32d74b]" : "text-[#ff453a]"}>
          {connected ? "LIVE" : "OFFLINE"}
        </span>
        <span style={{ color: priceColor }}>{priceState}</span>
        <span>{listenerCount} LISTENER</span>
        <Link
          className="text-white underline decoration-white/35 underline-offset-4"
          href="/c-val/2/mobile/v2"
        >
          V2
        </Link>
      </header>

      <nav className="grid grid-cols-3 border-b border-white/[0.12] font-mono text-[10px]">
        {inputMappings.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`px-2 py-3 ${inputMapping === id ? "bg-white text-black" : "text-white/60"}`}
            onClick={() => selectInputMapping(id)}
          >
            {label}
          </button>
        ))}
      </nav>

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
          style={{ top: `${50 + directionPosition * 34}%` }}
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
