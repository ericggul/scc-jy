"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import { useExperimentSocket } from "@/hooks/use-experiment-socket";

const EXPERIMENT_ID = "w1";

const Page = styled.main`
  min-height: 100vh;
  background: #171717;
  color: #f8f3e8;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 24px;
  padding: 20px;
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
  color: #b9b0a1;
`;

const Pad = styled.button<{ $hue: number; $intensity: number }>`
  width: min(100%, 560px);
  aspect-ratio: 1;
  justify-self: center;
  align-self: center;
  border: 1px solid rgba(248, 243, 232, 0.24);
  border-radius: 8px;
  background:
    radial-gradient(
      circle at center,
      hsl(${({ $hue }) => $hue} 88% 62% / ${({ $intensity }) => $intensity}),
      transparent 58%
    ),
    #211f1d;
  color: inherit;
  touch-action: none;
  cursor: crosshair;
`;

const Controls = styled.section`
  display: grid;
  gap: 14px;
  width: min(100%, 560px);
  justify-self: center;
`;

const Label = styled.label`
  display: grid;
  gap: 8px;
  color: #d8d0c2;
  font-size: 13px;
`;

const Range = styled.input`
  width: 100%;
  accent-color: #ff5c35;
`;

export default function W1MobilePage() {
  const { connected, presence, sendSignal } = useExperimentSocket({
    experimentId: EXPERIMENT_ID,
    role: "mobile",
  });
  const [hue, setHue] = useState(12);
  const [intensity, setIntensity] = useState(0.72);
  const connectionLabel = connected ? "connected" : "offline";

  const countLabel = useMemo(() => {
    if (!presence) return "waiting";
    return `${presence.screens} screen / ${presence.mobiles} mobile`;
  }, [presence]);

  function emitAt(clientX: number, clientY: number, target: HTMLButtonElement) {
    const rect = target.getBoundingClientRect();
    sendSignal({
      hue,
      intensity,
      x: Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1),
      y: Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1),
      label: "touch",
    });
  }

  return (
    <Page>
      <Status>
        <span>w1 / mobile: {connectionLabel}</span>
        <span>{countLabel}</span>
      </Status>

      <Pad
        $hue={hue}
        $intensity={intensity}
        aria-label="Send w1 artwork signal"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          emitAt(event.clientX, event.clientY, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (event.buttons > 0) {
            emitAt(event.clientX, event.clientY, event.currentTarget);
          }
        }}
      />

      <Controls>
        <Label>
          hue
          <Range
            min="0"
            max="360"
            value={hue}
            type="range"
            onChange={(event) => setHue(Number(event.target.value))}
          />
        </Label>
        <Label>
          intensity
          <Range
            min="0"
            max="1"
            step="0.01"
            value={intensity}
            type="range"
            onChange={(event) => setIntensity(Number(event.target.value))}
          />
        </Label>
      </Controls>
    </Page>
  );
}
