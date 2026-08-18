"use client";

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
} from "@/components/model";
import { useCValSocket } from "@/components/transport";
import {
  calibrateRawOrientation,
  finiteOrientationValue,
} from "@/socket/experiments/orientation.mjs";
import CValMobileView from "./view";

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

export default function CValMobile() {
  const [control, setControl] = useState<CValHumanControlInput>(initialControl);
  const [phoneOrientation, setPhoneOrientation] =
    useState<CValMobileAxisSignal>(initialAxisSignal);
  const [inputMapping, setInputMapping] =
    useState<CValInputMappingId>("current");
  const [permission, setPermission] = useState<MotionPermission>("idle");
  const inputMappingRef = useRef<CValInputMappingId>("current");
  const baselineRef = useRef<RawOrientation | null>(null);
  const visualBaselineRef = useRef<RawOrientation | null>(null);
  const latestRawRef = useRef<RawOrientation | null>(null);
  const lastSentAtRef = useRef(0);
  const listeningRef = useRef<"orientation" | "motion" | null>(null);
  const visualOrientationListeningRef = useRef(false);
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
  const { state, sendHumanControl, sendSensorTrace, sendRecordingStatus, resetSystem } =
    useCValSocket({
      role: "mobile",
      onRecordingCommand: (command) =>
        remoteRecordingCommandRef.current(command),
      onHumanControlReset: () => remoteControlResetRef.current(),
    });

  const reportDisengaged = useCallback(() => {
    const nextControl = { ...initialControl, sampledAt: performance.now() };
    setControl(nextControl);
    sendHumanControl(nextControl);
  }, [sendHumanControl]);

  useEffect(() => {
    const reportWhenHidden = () => {
      if (document.visibilityState === "hidden") reportDisengaged();
    };
    document.addEventListener("visibilitychange", reportWhenHidden);
    window.addEventListener("pagehide", reportDisengaged);
    return () => {
      document.removeEventListener("visibilitychange", reportWhenHidden);
      window.removeEventListener("pagehide", reportDisengaged);
      reportDisengaged();
    };
  }, [reportDisengaged]);

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
      setPhoneOrientation(orientation);
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

  const handleVisualOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      const raw = {
        alpha: finiteOrientationValue(event.alpha),
        beta: finiteOrientationValue(event.beta),
        gamma: finiteOrientationValue(event.gamma),
      };
      visualBaselineRef.current ??= raw;
      setPhoneOrientation(
        calibrateRawOrientation(
          { ...raw, absolute: event.absolute },
          visualBaselineRef.current,
        ),
      );
    },
    [],
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
    let visualOrientationPermission: "granted" | "denied" = "denied";
    try {
      const sensorPermissionRequest = usesMotion
        ? (DeviceMotionEvent as MotionEventConstructor).requestPermission?.() ??
          Promise.resolve<"granted" | "denied">("granted")
        : (DeviceOrientationEvent as OrientationEventConstructor).requestPermission?.() ??
          Promise.resolve<"granted" | "denied">("granted");
      const visualOrientationPermissionRequest =
        usesMotion &&
        "DeviceOrientationEvent" in window
          ? ((DeviceOrientationEvent as OrientationEventConstructor).requestPermission?.() ??
              Promise.resolve<"granted" | "denied">("granted"))
              .catch(() => "denied" as const)
          : Promise.resolve<"granted" | "denied">("denied");
      const [sensorPermission, nextVisualOrientationPermission] =
        await Promise.all([
          sensorPermissionRequest,
          visualOrientationPermissionRequest,
        ]);
      visualOrientationPermission = nextVisualOrientationPermission;
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
      if (
        visualOrientationPermission === "granted" &&
        !visualOrientationListeningRef.current
      ) {
        visualOrientationListeningRef.current = true;
        window.addEventListener("deviceorientation", handleVisualOrientation);
      }
    } else if (listeningRef.current === null) {
      listeningRef.current = "orientation";
      window.addEventListener("deviceorientation", handleOrientation);
    }
    setPermission("listening");
  }

  const stopListening = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    window.removeEventListener("deviceorientation", handleOrientation);
    window.removeEventListener("deviceorientation", handleVisualOrientation);
    listeningRef.current = null;
    visualOrientationListeningRef.current = false;
    reportDisengaged();
  }, [handleMotion, handleOrientation, handleVisualOrientation, reportDisengaged]);

  function selectInputMapping(nextMapping: CValInputMappingId) {
    stopListening();
    inputMappingRef.current = nextMapping;
    setInputMapping(nextMapping);
    baselineRef.current = null;
    visualBaselineRef.current = null;
    latestRawRef.current = null;
    lastSentAtRef.current = 0;
    setControl(initialControl);
    setPhoneOrientation(initialAxisSignal);
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

  return (
    <CValMobileView
      price={price}
      priceMove={priceMove}
      priceState={priceState}
      inputMappings={inputMappings}
      inputMapping={inputMapping}
      permission={permission}
      control={control}
      phoneOrientation={phoneOrientation}
      recordingStatus={recordingStatus}
      recordingMessage={recordingMessage}
      onEnableMotion={enableMotion}
      onSelectInputMapping={selectInputMapping}
    />
  );
}
