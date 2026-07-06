"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  type ExperimentSignal,
  useExperimentSocket,
} from "@/hooks/use-experiment-socket";

const EXPERIMENT_ID = "w1";

type Pulse = ExperimentSignal & {
  localId: string;
};

const fade = keyframes`
  from {
    opacity: 0.95;
    transform: translate(-50%, -50%) scale(0.18);
  }

  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.8);
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
`;

const Idle = styled.div`
  position: fixed;
  inset: auto 20px 24px;
  color: rgba(248, 243, 232, 0.56);
  font-size: clamp(32px, 8vw, 96px);
  font-weight: 600;
  line-height: 0.95;
`;

export default function W1ScreenPage() {
  const timeoutRef = useRef<number[]>([]);
  const [pulses, setPulses] = useState<Pulse[]>([]);

  const handleSignal = useCallback((lastSignal: ExperimentSignal) => {
    const pulse = {
      ...lastSignal,
      localId: `${lastSignal.id}-${performance.now()}`,
    };

    setPulses((current) => [...current.slice(-18), pulse]);
    const timeout = window.setTimeout(() => {
      setPulses((current) =>
        current.filter((item) => item.localId !== pulse.localId),
      );
    }, 2600);
    timeoutRef.current.push(timeout);
  }, []);

  const { connected, presence } = useExperimentSocket({
    experimentId: EXPERIMENT_ID,
    role: "screen",
    onSignal: handleSignal,
  });

  useEffect(() => {
    const timeouts = timeoutRef.current;

    return () => {
      for (const timeout of timeouts) {
        window.clearTimeout(timeout);
      }
    };
  }, []);

  const status = useMemo(() => {
    const live = connected ? "live" : "offline";
    if (!presence) return live;
    return `${live} / ${presence.mobiles} mobile`;
  }, [connected, presence]);

  return (
    <Page>
      <Header>
        <span>w1 / screen</span>
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
