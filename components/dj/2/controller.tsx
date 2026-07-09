"use client";

import { useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  type DjReactionInteraction,
  type DjReactionParameters,
  useDjSocket,
} from "@/components/dj/1/use-dj-socket";
import type { DjScreenId } from "@/components/dj/experiments";

type ActiveTarget = "1" | "2" | "connector" | null;

const initialParameters: DjReactionParameters = {
  coupling: 0,
  diffusionA: 0.92,
  diffusionB: 0.48,
  rooms: {
    "1": { feed: 0.026, kill: 0.052, drive: 0 },
    "2": { feed: 0.026, kill: 0.052, drive: 0 },
  },
};

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #060706;
  color: #eef2e8;
  touch-action: none;
  overscroll-behavior: none;
`;

const Surface = styled.div`
  position: absolute;
  inset: 0;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
`;

const Connector = styled.div<{ $active: boolean; $coupling: number }>`
  position: absolute;
  left: 28%;
  right: 28%;
  top: 50%;
  height: clamp(28px, 8vmin, 70px);
  border-top: 1px solid
    ${({ $active }) =>
      $active ? "rgba(255, 89, 64, 0.96)" : "rgba(238, 242, 232, 0.36)"};
  border-bottom: 1px solid
    ${({ $active }) =>
      $active ? "rgba(255, 89, 64, 0.72)" : "rgba(238, 242, 232, 0.18)"};
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 89, 64, ${({ $coupling }) => 0.08 + $coupling * 0.24}),
    transparent
  );
  transform: translateY(-50%);
  pointer-events: none;
`;

const Node = styled.div<{
  $x: number;
  $active: boolean;
  $feed: number;
  $kill: number;
}>`
  position: absolute;
  left: ${({ $x }) => `${$x * 100}%`};
  top: 50%;
  width: clamp(120px, 28vmin, 260px);
  aspect-ratio: 1;
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(238, 242, 232, 0.96)" : "rgba(238, 242, 232, 0.42)"};
  border-radius: 8px;
  background:
    radial-gradient(
      circle at ${({ $feed }) => `${18 + $feed * 900}%`}
        ${({ $kill }) => `${112 - $kill * 1000}%`},
      rgba(80, 235, 212, 0.22),
      transparent 46%
    ),
    radial-gradient(
      circle at ${({ $feed }) => `${102 - $feed * 800}%`}
        ${({ $kill }) => `${8 + $kill * 900}%`},
      rgba(255, 89, 64, 0.2),
      transparent 42%
    ),
    rgba(238, 242, 232, ${({ $active }) => ($active ? 0.09 : 0.035)});
  box-shadow: ${({ $active }) =>
    $active
      ? "0 0 42px rgba(238, 242, 232, 0.26)"
      : "0 0 0 rgba(0, 0, 0, 0)"};
  transform: translate(-50%, -50%);
  pointer-events: none;
`;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cloneParameters(parameters: DjReactionParameters): DjReactionParameters {
  return {
    coupling: parameters.coupling,
    diffusionA: parameters.diffusionA,
    diffusionB: parameters.diffusionB,
    rooms: {
      "1": { ...parameters.rooms["1"] },
      "2": { ...parameters.rooms["2"] },
    },
  };
}

function getPointerPosition(clientX: number, clientY: number, target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  return {
    x: clamp((clientX - rect.left) / rect.width, 0, 1),
    y: clamp((clientY - rect.top) / rect.height, 0, 1),
  };
}

function resolveTarget(x: number, y: number): ActiveTarget {
  const roomOneDistance = Math.hypot(x - 0.28, y - 0.5);
  const roomTwoDistance = Math.hypot(x - 0.72, y - 0.5);

  if (roomOneDistance <= 0.18) return "1";
  if (roomTwoDistance <= 0.18) return "2";
  if (x >= 0.32 && x <= 0.68 && y >= 0.42 && y <= 0.58) return "connector";

  return null;
}

function updateParameters(
  current: DjReactionParameters,
  target: ActiveTarget,
  x: number,
  y: number,
) {
  const next = cloneParameters(current);

  if (target === "connector") {
    next.coupling = clamp((x - 0.32) / 0.36, 0, 1);
    return next;
  }

  if (target === "1" || target === "2") {
    next.rooms[target] = {
      feed: 0.018 + x * 0.044,
      kill: 0.038 + y * 0.032,
      drive: target === "1" ? 1 - y : x,
    };
  }

  return next;
}

function getRoomLocalPosition(roomId: "1" | "2", x: number, y: number) {
  const centerX = roomId === "1" ? 0.28 : 0.72;

  return {
    localX: clamp((x - (centerX - 0.18)) / 0.36, 0, 1),
    localY: clamp((y - 0.32) / 0.36, 0, 1),
  };
}

function getInteraction(
  target: ActiveTarget,
  x: number,
  y: number,
): DjReactionInteraction | null {
  if (target === "1" || target === "2") {
    const { localX, localY } = getRoomLocalPosition(target, x, y);
    const materialB = clamp(localY, 0, 1);

    return {
      target,
      localX,
      localY,
      materialA: 1 - materialB,
      materialB,
      strength: 0.78,
    };
  }

  if (target === "connector") {
    return {
      target,
      localX: clamp((x - 0.32) / 0.36, 0, 1),
      localY: clamp((y - 0.42) / 0.16, 0, 1),
      materialA: 0,
      materialB: 0,
      strength: 0.9,
    };
  }

  return null;
}

export default function DjReactionController() {
  const { sendSignal } = useDjSocket({
    experimentSlug: "2",
    role: "controller",
  });
  const [parameters, setParameters] = useState<DjReactionParameters>(
    () => initialParameters,
  );
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>(null);
  const pointerDownRef = useRef(false);
  const lastEmitRef = useRef(0);
  const roomIds = useMemo(() => ["1", "2"] as const, []);

  function emitParameters(
    nextParameters: DjReactionParameters,
    interaction: DjReactionInteraction,
    x: number,
    y: number,
  ) {
    const now = performance.now();
    if (now - lastEmitRef.current < 55) return;

    lastEmitRef.current = now;
    sendSignal({
      source: "parameter",
      targetScreenIds: ["1", "2"] as DjScreenId[],
      x,
      y,
      parameters: nextParameters,
      interaction,
    });
  }

  function handlePointer(clientX: number, clientY: number, target: HTMLElement) {
    const { x, y } = getPointerPosition(clientX, clientY, target);
    const nextTarget = resolveTarget(x, y);
    setActiveTarget(nextTarget);

    if (!nextTarget) return;

    setParameters((current) => {
      const next = updateParameters(current, nextTarget, x, y);
      const interaction = getInteraction(nextTarget, x, y);
      if (interaction) {
        emitParameters(next, interaction, x, y);
      }
      return next;
    });
  }

  return (
    <Page>
      <Surface
        aria-label="DJ reaction diffusion controller"
        role="application"
        onPointerDown={(event) => {
          pointerDownRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          handlePointer(event.clientX, event.clientY, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse" && !pointerDownRef.current) return;
          handlePointer(event.clientX, event.clientY, event.currentTarget);
        }}
        onPointerCancel={() => {
          pointerDownRef.current = false;
          setActiveTarget(null);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          setActiveTarget(null);
        }}
        onPointerUp={() => {
          pointerDownRef.current = false;
          setActiveTarget(null);
        }}
      >
        <Connector
          $active={activeTarget === "connector"}
          $coupling={parameters.coupling}
        />
        {roomIds.map((roomId) => (
          <Node
            key={roomId}
            $active={activeTarget === roomId}
            $feed={parameters.rooms[roomId].feed}
            $kill={parameters.rooms[roomId].kill}
            $x={roomId === "1" ? 0.28 : 0.72}
          />
        ))}
      </Surface>
    </Page>
  );
}
