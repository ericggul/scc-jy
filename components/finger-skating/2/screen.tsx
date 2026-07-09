"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  type ExperimentSignal,
  useExperimentSocket,
} from "@/hooks/use-experiment-socket";

const EXPERIMENT_ID = "finger-skating";
const pulseLifetimeMs = 2600;
const cleanupIntervalMs = 300;
const maxPulsesPerStream = 18;

type Pulse = ExperimentSignal & {
  expiresAt: number;
  localId: string;
  streamKey: string;
};

type StreamPulses = Record<string, Pulse[]>;

const fade = keyframes`
  from {
    opacity: 0.95;
    transform: translate3d(-50%, -50%, 0) scale(0.18);
  }

  to {
    opacity: 0;
    transform: translate3d(-50%, -50%, 0) scale(2.8);
  }
`;

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
`;

const Field = styled.div`
  position: absolute;
  inset: 0;
  contain: layout paint style;
`;

const PulseMark = styled.div<{
  $hue: number;
  $intensity: number;
  $x: number;
  $y: number;
}>`
  position: absolute;
  left: ${({ $x }) => `${$x * 100}%`};
  top: ${({ $y }) => `${$y * 100}%`};
  width: ${({ $intensity }) => `${180 + $intensity * 360}px`};
  aspect-ratio: 1;
  border-radius: 999px;
  border: 1px solid hsl(${({ $hue }) => $hue} 90% 64% / 0.78);
  box-shadow:
    0 0 32px hsl(${({ $hue }) => $hue} 90% 64% / 0.42),
    inset 0 0 80px hsl(${({ $hue }) => $hue} 90% 64% / 0.18);
  animation: ${fade} 2.4s ease-out forwards;
  pointer-events: none;
  will-change: opacity, transform;
`;

const Idle = styled.div`
  position: fixed;
  inset: auto 20px 24px;
  color: rgba(248, 243, 232, 0.56);
  font-size: clamp(32px, 8vw, 96px);
  font-weight: 600;
  line-height: 0.95;
`;

function getStreamKey(signal: ExperimentSignal) {
  return signal.streamId || `${signal.from}:primary`;
}

export default function FingerSkatingTwoScreen() {
  const frameRef = useRef<number | null>(null);
  const pendingSignalsRef = useRef<ExperimentSignal[]>([]);
  const [streams, setStreams] = useState<StreamPulses>({});

  const flushPendingSignals = useCallback(() => {
    frameRef.current = null;

    const pendingSignals = pendingSignalsRef.current;
    if (pendingSignals.length === 0) return;

    pendingSignalsRef.current = [];
    const now = performance.now();
    const latestSignalByStream = new Map<string, ExperimentSignal>();

    for (const signal of pendingSignals) {
      latestSignalByStream.set(getStreamKey(signal), signal);
    }

    setStreams((current) => {
      const next = { ...current };

      for (const signal of latestSignalByStream.values()) {
        const streamKey = getStreamKey(signal);
        const pulse = {
          ...signal,
          expiresAt: now + pulseLifetimeMs,
          localId: `${signal.id}-${now}`,
          streamKey,
        };

        next[streamKey] = [
          ...(next[streamKey] || []).slice(-(maxPulsesPerStream - 1)),
          pulse,
        ];
      }

      return next;
    });
  }, []);

  const handleSignal = useCallback((signal: ExperimentSignal) => {
    if (signal.phase === "end") return;

    pendingSignalsRef.current.push(signal);

    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(flushPendingSignals);
    }
  }, [flushPendingSignals]);

  const { connected, connectionError, presence } = useExperimentSocket({
    experimentId: EXPERIMENT_ID,
    role: "screen",
    onSignal: handleSignal,
  });

  useEffect(() => {
    const cleanup = window.setInterval(() => {
      const now = performance.now();

      setStreams((current) => {
        let changed = false;
        const next: StreamPulses = {};

        for (const [streamKey, stream] of Object.entries(current)) {
          const livePulses = stream.filter((pulse) => pulse.expiresAt > now);
          if (livePulses.length !== stream.length) {
            changed = true;
          }
          if (livePulses.length > 0) {
            next[streamKey] = livePulses;
          }
        }

        return changed ? next : current;
      });
    }, cleanupIntervalMs);

    return () => {
      window.clearInterval(cleanup);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const pulses = useMemo(() => Object.values(streams).flat(), [streams]);
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
        {pulses.map((pulse) => (
          <PulseMark
            key={pulse.localId}
            $hue={pulse.hue}
            $intensity={pulse.intensity}
            $x={pulse.x}
            $y={pulse.y}
          />
        ))}
      </Field>
      {pulses.length === 0 ? <Idle>waiting for mobile signal</Idle> : null}
    </Page>
  );
}
