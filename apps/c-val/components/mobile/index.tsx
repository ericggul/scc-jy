"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  type CValRotationRate,
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
// Bounded mobile-only trial: false restores the current sensor-only behavior.
const ENABLE_TOUCH_ORIENTATION_ADD_ON = true;
const TOUCH_DEGREES_PER_PIXEL = 0.16;
const TOUCH_ROLL_DEGREES_PER_ORBIT = 36;
const TOUCH_ROTATION_RATE_LIMIT = 48;
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

type SpherePointer = {
  pointerId: number;
  centerX: number;
  centerY: number;
  radius: number;
  clientX: number;
  clientY: number;
  normalizedX: number;
  normalizedY: number;
  sampledAt: number;
};

function finiteSensorValue(value: number | null) {
  return Number.isFinite(value) ? Number(value) : null;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function wrapAngle(value: number) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function addAxisSignals(
  left: CValMobileAxisSignal,
  right: CValMobileAxisSignal,
): CValMobileAxisSignal {
  return {
    alpha: wrapAngle(left.alpha + right.alpha),
    beta: wrapAngle(left.beta + right.beta),
    gamma: wrapAngle(left.gamma + right.gamma),
  };
}

function finiteRotationRate(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function combineRotationRates(
  physical: CValRotationRate,
  touch: CValMobileAxisSignal,
): CValRotationRate {
  return {
    alpha: finiteRotationRate(physical.alpha) + touch.alpha,
    beta: finiteRotationRate(physical.beta) + touch.beta,
    gamma: finiteRotationRate(physical.gamma) + touch.gamma,
  };
}

function sphereCoordinates(
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number,
  radius: number,
) {
  return {
    x: clamp((clientX - centerX) / radius, -1, 1),
    y: clamp((clientY - centerY) / radius, -1, 1),
  };
}

export default function CValMobile() {
  const [control, setControl] = useState<CValHumanControlInput>(initialControl);
  const [phoneOrientation, setPhoneOrientation] =
    useState<CValMobileAxisSignal>(initialAxisSignal);
  const [touchOrientation, setTouchOrientation] =
    useState<CValMobileAxisSignal>(initialAxisSignal);
  const [permission, setPermission] = useState<MotionPermission>("idle");
  // The archived orientation mappings stay available in the model, while this
  // mobile instrument deliberately performs the current rotation-rate mapping.
  const inputMappingRef = useRef<CValInputMappingId>("current");
  const baselineRef = useRef<RawOrientation | null>(null);
  const visualBaselineRef = useRef<RawOrientation | null>(null);
  const latestRawRef = useRef<RawOrientation | null>(null);
  const lastSentAtRef = useRef(0);
  const listeningRef = useRef<"orientation" | "motion" | null>(null);
  const visualOrientationListeningRef = useRef(false);
  const physicalRotationRateRef = useRef<CValRotationRate>(initialAxisSignal);
  const touchRotationRateRef = useRef<CValMobileAxisSignal>(initialAxisSignal);
  const touchOrientationRef = useRef<CValMobileAxisSignal>(initialAxisSignal);
  const spherePointerRef = useRef<SpherePointer | null>(null);
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
  const { state, sendHumanControl, sendSensorTrace, sendRecordingStatus } =
    useCValSocket({
      role: "mobile",
      onRecordingCommand: (command) =>
        remoteRecordingCommandRef.current(command),
      onHumanControlReset: () => remoteControlResetRef.current(),
    });

  const publishRotationRate = useCallback(
    (
      rotationRate: CValRotationRate,
      sampledAt = performance.now(),
      force = false,
    ) => {
      const gesture = rotationRateToCValControl(rotationRate);
      const nextControl = {
        ...gesture.parameters,
        engaged: gesture.engaged,
        sampledAt,
      };
      setControl(nextControl);

      if (force || sampledAt - lastSentAtRef.current >= 16) {
        lastSentAtRef.current = sampledAt;
        sendHumanControl(nextControl);
      }
    },
    [sendHumanControl],
  );

  const resetTouchOrientationAddOn = useCallback(() => {
    spherePointerRef.current = null;
    touchRotationRateRef.current = initialAxisSignal;
    touchOrientationRef.current = initialAxisSignal;
    if (ENABLE_TOUCH_ORIENTATION_ADD_ON) {
      setTouchOrientation(initialAxisSignal);
    }
  }, []);

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
      resetTouchOrientationAddOn();
      setControl(initialControl);
      sendHumanControl({ ...initialControl, sampledAt: performance.now() });
    };
  }, [resetTouchOrientationAddOn, sendHumanControl]);

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
      physicalRotationRateRef.current = rotationRate;
      const sampledAt = performance.now();
      publishRotationRate(
        ENABLE_TOUCH_ORIENTATION_ADD_ON
          ? combineRotationRates(
              rotationRate,
              touchRotationRateRef.current,
            )
          : rotationRate,
        sampledAt,
      );

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
    [publishRotationRate],
  );

  const handleSpherePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (spherePointerRef.current) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const radius = Math.max(Math.min(rect.width, rect.height) / 2, 1);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const point = sphereCoordinates(
        event.clientX,
        event.clientY,
        centerX,
        centerY,
        radius,
      );

      event.currentTarget.setPointerCapture(event.pointerId);
      spherePointerRef.current = {
        pointerId: event.pointerId,
        centerX,
        centerY,
        radius,
        clientX: event.clientX,
        clientY: event.clientY,
        normalizedX: point.x,
        normalizedY: point.y,
        sampledAt: performance.now(),
      };
      event.preventDefault();
    },
    [],
  );

  const handleSpherePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (spherePointerRef.current?.pointerId !== event.pointerId) return;
      const samples = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];

      for (const sample of samples) {
        const activePointer: SpherePointer | null = spherePointerRef.current;
        if (!activePointer) return;
        const sampledAt = performance.now();
        const point = sphereCoordinates(
          sample.clientX,
          sample.clientY,
          activePointer.centerX,
          activePointer.centerY,
          activePointer.radius,
        );
        const deltaAlpha =
          (sample.clientX - activePointer.clientX) * TOUCH_DEGREES_PER_PIXEL;
        const deltaBeta =
          -(sample.clientY - activePointer.clientY) * TOUCH_DEGREES_PER_PIXEL;
        const deltaGamma =
          (activePointer.normalizedX * point.y -
            activePointer.normalizedY * point.x) *
          TOUCH_ROLL_DEGREES_PER_ORBIT;
        const elapsedSeconds = Math.max(
          (sampledAt - activePointer.sampledAt) / 1_000,
          1 / 120,
        );
        const touchRate = {
          alpha: clamp(
            deltaAlpha / elapsedSeconds,
            -TOUCH_ROTATION_RATE_LIMIT,
            TOUCH_ROTATION_RATE_LIMIT,
          ),
          beta: clamp(
            deltaBeta / elapsedSeconds,
            -TOUCH_ROTATION_RATE_LIMIT,
            TOUCH_ROTATION_RATE_LIMIT,
          ),
          gamma: clamp(
            deltaGamma / elapsedSeconds,
            -TOUCH_ROTATION_RATE_LIMIT,
            TOUCH_ROTATION_RATE_LIMIT,
          ),
        };
        const nextTouchOrientation = addAxisSignals(
          touchOrientationRef.current,
          { alpha: deltaAlpha, beta: deltaBeta, gamma: deltaGamma },
        );

        touchRotationRateRef.current = touchRate;
        touchOrientationRef.current = nextTouchOrientation;
        setTouchOrientation(nextTouchOrientation);
        publishRotationRate(
          combineRotationRates(physicalRotationRateRef.current, touchRate),
          sampledAt,
        );
        spherePointerRef.current = {
          ...activePointer,
          clientX: sample.clientX,
          clientY: sample.clientY,
          normalizedX: point.x,
          normalizedY: point.y,
          sampledAt,
        };
      }

      event.preventDefault();
    },
    [publishRotationRate],
  );

  const handleSpherePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (spherePointerRef.current?.pointerId !== event.pointerId) return;
      spherePointerRef.current = null;
      touchRotationRateRef.current = initialAxisSignal;
      publishRotationRate(physicalRotationRateRef.current, performance.now(), true);
    },
    [publishRotationRate],
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
    resetTouchOrientationAddOn();
    reportDisengaged();
  }, [
    handleMotion,
    handleOrientation,
    handleVisualOrientation,
    reportDisengaged,
    resetTouchOrientationAddOn,
  ]);

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
  const displayedPhoneOrientation = ENABLE_TOUCH_ORIENTATION_ADD_ON
    ? addAxisSignals(phoneOrientation, touchOrientation)
    : phoneOrientation;

  return (
    <CValMobileView
      price={price}
      priceMove={priceMove}
      priceState={priceState}
      priceHistory={state?.history.index ?? [price]}
      permission={permission}
      control={control}
      phoneOrientation={displayedPhoneOrientation}
      recordingStatus={recordingStatus}
      recordingMessage={recordingMessage}
      onEnableMotion={enableMotion}
      touchOrientationAddOnEnabled={
        ENABLE_TOUCH_ORIENTATION_ADD_ON && permission === "listening"
      }
      onSpherePointerDown={handleSpherePointerDown}
      onSpherePointerMove={handleSpherePointerMove}
      onSpherePointerEnd={handleSpherePointerEnd}
    />
  );
}
