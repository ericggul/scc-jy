"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  type ExperimentSignal,
  useExperimentSocket,
} from "@/hooks/use-experiment-socket";

const EXPERIMENT_ID = "finger-skating";
const pulseLifetimeMs = 2200;
const maxPulsesPerStream = 10;
const maxPixelRatio = 1.25;

type CanvasPulse = {
  createdAt: number;
  expiresAt: number;
  hue: number;
  intensity: number;
  streamKey: string;
  x: number;
  y: number;
};

const Page = styled.main`
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  background:
    linear-gradient(135deg, rgba(244, 241, 234, 0.06), transparent 36%),
    #080807;
  color: #f8f3e8;
`;

const Header = styled.div`
  position: fixed;
  inset: 18px 20px auto;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: rgba(248, 243, 232, 0.68);
  font-size: 13px;
  pointer-events: none;
`;

const Field = styled.div`
  position: absolute;
  inset: 0;
  contain: strict;
`;

const PulseCanvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

const Idle = styled.div`
  position: fixed;
  inset: auto 20px 24px;
  color: rgba(248, 243, 232, 0.56);
  font-size: clamp(32px, 8vw, 96px);
  font-weight: 600;
  line-height: 0.95;
  pointer-events: none;
`;

function getStreamKey(signal: ExperimentSignal) {
  return signal.streamId || `${signal.from}:primary`;
}

function drawPulse(
  context: CanvasRenderingContext2D,
  pulse: CanvasPulse,
  now: number,
  width: number,
  height: number,
) {
  const progress = Math.min(
    Math.max((now - pulse.createdAt) / pulseLifetimeMs, 0),
    1,
  );
  const opacity = (1 - progress) * 0.95;
  if (opacity <= 0) return;

  const centerX = pulse.x * width;
  const centerY = pulse.y * height;
  const diameter = 180 + pulse.intensity * 360;
  const radius = (diameter / 2) * (0.18 + progress * 2.62);
  const hue = Math.round(pulse.hue);

  context.save();
  context.globalAlpha = opacity * 0.18;
  context.strokeStyle = `hsla(${hue}, 90%, 64%, 0.42)`;
  context.lineWidth = 28;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();

  context.globalAlpha = opacity * 0.32;
  context.strokeStyle = `hsla(${hue}, 90%, 64%, 0.18)`;
  context.lineWidth = 10;
  context.beginPath();
  context.arc(centerX, centerY, radius * 0.72, 0, Math.PI * 2);
  context.stroke();

  context.globalAlpha = opacity;
  context.strokeStyle = `hsla(${hue}, 90%, 64%, 0.78)`;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

export default function FingerSkatingTwoScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawFrameRef = useRef<(now: number) => void>(() => {});
  const frameRef = useRef<number | null>(null);
  const pendingSignalsRef = useRef<Map<string, ExperimentSignal>>(new Map());
  const pulsesRef = useRef<CanvasPulse[]>([]);
  const sizeRef = useRef({ height: 0, ratio: 1, width: 0 });
  const [hasPulses, setHasPulses] = useState(false);

  const setCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    const pixelWidth = Math.max(1, Math.round(rect.width * ratio));
    const pixelHeight = Math.max(1, Math.round(rect.height * ratio));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    sizeRef.current = {
      height: rect.height,
      ratio,
      width: rect.width,
    };
  }, []);

  const drawFrame = useCallback(
    (now: number) => {
      frameRef.current = null;

      const context = contextRef.current;
      const canvas = canvasRef.current;
      if (!context || !canvas) return;

      const pendingSignals = pendingSignalsRef.current;
      if (pendingSignals.size > 0) {
        const nextPulses = pulsesRef.current.slice();

        for (const signal of pendingSignals.values()) {
          const streamKey = getStreamKey(signal);
          nextPulses.push({
            createdAt: now,
            expiresAt: now + pulseLifetimeMs,
            hue: signal.hue,
            intensity: signal.intensity,
            streamKey,
            x: signal.x,
            y: signal.y,
          });
        }

        pendingSignals.clear();

        const perStreamCounts = new Map<string, number>();
        pulsesRef.current = nextPulses
          .filter((pulse) => pulse.expiresAt > now)
          .reverse()
          .filter((pulse) => {
            const count = perStreamCounts.get(pulse.streamKey) || 0;
            if (count >= maxPulsesPerStream) return false;
            perStreamCounts.set(pulse.streamKey, count + 1);
            return true;
          })
          .reverse();
      } else {
        pulsesRef.current = pulsesRef.current.filter(
          (pulse) => pulse.expiresAt > now,
        );
      }

      const pulses = pulsesRef.current;
      const { height, ratio, width } = sizeRef.current;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      for (const pulse of pulses) {
        drawPulse(context, pulse, now, width, height);
      }

      if (pulses.length > 0 || pendingSignalsRef.current.size > 0) {
        frameRef.current = window.requestAnimationFrame((time) =>
          drawFrameRef.current(time),
        );
      }

      setHasPulses((current) => {
        const next = pulses.length > 0;
        return current === next ? current : next;
      });
    },
    [],
  );

  useEffect(() => {
    drawFrameRef.current = drawFrame;
  }, [drawFrame]);

  const requestDraw = useCallback(() => {
    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame((time) =>
        drawFrameRef.current(time),
      );
    }
  }, []);

  const handleSignal = useCallback(
    (signal: ExperimentSignal) => {
      if (signal.phase === "end") return;

      pendingSignalsRef.current.set(getStreamKey(signal), signal);
      requestDraw();
    },
    [requestDraw],
  );

  const { connected, connectionError, presence } = useExperimentSocket({
    experimentId: EXPERIMENT_ID,
    role: "screen",
    onSignal: handleSignal,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    contextRef.current = canvas.getContext("2d", { alpha: true });
    setCanvasSize();

    window.addEventListener("resize", setCanvasSize);
    window.visualViewport?.addEventListener("resize", setCanvasSize);

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      window.visualViewport?.removeEventListener("resize", setCanvasSize);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [setCanvasSize]);

  const status = useMemo(() => {
    const live = connected
      ? "live"
      : connectionError
        ? `offline: ${connectionError}`
        : "offline";
    if (!presence) return live;
    return `${live} / ${presence.mobiles} mobile`;
  }, [connected, connectionError, presence]);

  return (
    <Page>
      <Header>
        <span>finger-skating / screen</span>
        <span>{status}</span>
      </Header>
      <Field>
        <PulseCanvas ref={canvasRef} />
      </Field>
      {!hasPulses ? <Idle>waiting for mobile signal</Idle> : null}
    </Page>
  );
}
