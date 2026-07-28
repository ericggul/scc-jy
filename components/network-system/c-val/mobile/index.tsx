"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CValOrientation } from "@/components/network-system/c-val/model";
import {
  cValParameterLabels,
  orientationToCValParameters,
} from "@/components/network-system/c-val/model";
import { useCValSocket } from "@/components/network-system/c-val/transport";

type MotionPermission = "idle" | "listening" | "denied" | "unavailable";
type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};
type RawOrientation = Omit<CValOrientation, "absolute">;

const initialOrientation: CValOrientation = {
  absolute: false,
  alpha: 0,
  beta: 0,
  gamma: 0,
};

function finiteOrZero(value: number | null) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function signedAngleDelta(value: number, baseline: number) {
  return ((value - baseline + 540) % 360) - 180;
}

export default function CValMobile() {
  const [orientation, setOrientation] =
    useState<CValOrientation>(initialOrientation);
  const [permission, setPermission] = useState<MotionPermission>("idle");
  const baselineRef = useRef<RawOrientation | null>(null);
  const latestRawRef = useRef<RawOrientation | null>(null);
  const lastSentAtRef = useRef(0);
  const listeningRef = useRef(false);
  const { connected, presence, sendOrientation } = useCValSocket({
    role: "mobile",
    retainState: false,
  });

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      const raw = {
        alpha: finiteOrZero(event.alpha),
        beta: finiteOrZero(event.beta),
        gamma: finiteOrZero(event.gamma),
      };
      latestRawRef.current = raw;
      baselineRef.current ??= raw;
      const baseline = baselineRef.current;
      const next = {
        absolute: event.absolute,
        alpha: signedAngleDelta(raw.alpha, baseline.alpha),
        beta: raw.beta - baseline.beta,
        gamma: raw.gamma - baseline.gamma,
      };
      setOrientation(next);

      const now = performance.now();
      if (now - lastSentAtRef.current >= 16) {
        lastSentAtRef.current = now;
        sendOrientation(next);
      }
    },
    [sendOrientation],
  );

  function zeroOrientation() {
    baselineRef.current = latestRawRef.current;
    setOrientation(initialOrientation);
    sendOrientation(initialOrientation);
  }

  async function enableMotion() {
    if (!("DeviceOrientationEvent" in window)) {
      setPermission("unavailable");
      return;
    }

    const OrientationEvent =
      DeviceOrientationEvent as OrientationEventConstructor;
    if (OrientationEvent.requestPermission) {
      try {
        const result = await OrientationEvent.requestPermission();
        if (result !== "granted") {
          setPermission("denied");
          return;
        }
      } catch {
        setPermission("denied");
        return;
      }
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
    };
  }, [handleOrientation]);

  const parameters = orientationToCValParameters(orientation);
  const alphaRotation = orientation.alpha;
  const betaPosition = Math.max(-1, Math.min(orientation.beta / 90, 1));
  const gammaPosition = Math.max(-1, Math.min(orientation.gamma / 45, 1));
  const listenerCount =
    (presence?.controllers ?? 0) + (presence?.screens ?? 0);

  return (
    <main className="relative grid h-dvh w-dvw touch-none grid-rows-[auto_1fr_auto] overflow-hidden bg-[#050505] text-white">
      <header className="flex items-center justify-between border-b border-white/[0.12] px-4 py-3 font-mono text-[11px] text-[#a1a1a6]">
        <span className={connected ? "text-[#32d74b]" : "text-[#ff453a]"}>
          {connected ? "LIVE" : "OFFLINE"}
        </span>
        {permission === "listening" ? (
          <button
            type="button"
            className="px-3 py-1 text-white hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none"
            onClick={zeroOrientation}
          >
            ZERO
          </button>
        ) : null}
        <span>{listenerCount} LISTENER</span>
      </header>

      <section
        className="relative min-h-0 overflow-hidden"
        aria-label="Volatility, activity, and liquidity orientation control"
      >
        <div
          className="absolute left-1/2 top-1/2 h-[140%] w-px origin-center bg-[#ffd60a] opacity-80"
          style={{
            transform: `translate(-50%, -50%) rotate(${alphaRotation}deg)`,
          }}
        />
        <div
          className="absolute left-0 right-0 h-px bg-[#32d74b] shadow-[0_0_18px_rgba(50,215,75,0.55)]"
          style={{ top: `${50 + betaPosition * 34}%` }}
        />
        <div
          className="absolute bottom-0 top-0 w-px bg-[#64d2ff] shadow-[0_0_18px_rgba(100,210,255,0.55)]"
          style={{ left: `${50 + gammaPosition * 38}%` }}
        />
        <div className="absolute inset-0 grid place-items-center">
          {permission === "listening" ? (
            <div className="h-2 w-2 bg-white shadow-[0_0_20px_rgba(255,255,255,0.9)]" />
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
            ["volatility", "α", "#ffd60a"],
            ["activity", "β", "#32d74b"],
            ["liquidity", "γ", "#64d2ff"],
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
              {(parameters[parameterId] * 100).toFixed(0)}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
