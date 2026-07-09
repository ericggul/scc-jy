"use client";

import { useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import {
  type DjReactionInteraction,
  type DjReactionParameters,
  type DjSignal,
  useDjSocket,
} from "@/components/dj/1/use-dj-socket";
import type { DjScreenId } from "@/components/dj/experiments";

type ReactionRoomId = "1" | "2";

const gridSize = 74;
const cellCount = gridSize * gridSize;
const scratchCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
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
  display: grid;
  place-items: center;
  background: #020302;
  color: #eef2e8;
`;

const SingleFrame = styled.div`
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
`;

const WholeStage = styled.div`
  --gap: clamp(10px, 2vw, 24px);
  width: calc(100vw - 32px);
  height: min(46dvh, calc((100vw - 32px - var(--gap)) / 2));
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);

  @media (max-width: 720px) {
    width: calc(100vw - 24px);
    height: min(46dvh, calc((100vw - 24px - var(--gap)) / 2));
  }
`;

const RoomFrame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #030403;
  contain: strict;

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
`;

function createField() {
  const a = new Float32Array(cellCount);
  const b = new Float32Array(cellCount);
  a.fill(1);

  return { a, b };
}

function laplacian(field: Float32Array, x: number, y: number) {
  const center = y * gridSize + x;
  const left = y * gridSize + ((x + gridSize - 1) % gridSize);
  const right = y * gridSize + ((x + 1) % gridSize);
  const up = ((y + gridSize - 1) % gridSize) * gridSize + x;
  const down = ((y + 1) % gridSize) * gridSize + x;

  return (
    field[left] * 0.2 +
    field[right] * 0.2 +
    field[up] * 0.2 +
    field[down] * 0.2 -
    field[center] * 0.8
  );
}

function makeSimulation() {
  const roomOne = createField();
  const roomTwo = createField();
  const nextOne = createField();
  const nextTwo = createField();

  return {
    rooms: {
      "1": roomOne,
      "2": roomTwo,
    },
    nextRooms: {
      "1": nextOne,
      "2": nextTwo,
    },
  };
}

function stepRoom(
  roomId: ReactionRoomId,
  simulation: ReturnType<typeof makeSimulation>,
  parameters: DjReactionParameters,
) {
  const room = simulation.rooms[roomId];
  const other = simulation.rooms[roomId === "1" ? "2" : "1"];
  const next = simulation.nextRooms[roomId];
  const roomParameters = parameters.rooms[roomId];
  const coupling = parameters.coupling * 0.032;

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const index = y * gridSize + x;
      const a = room.a[index];
      const b = room.b[index];
      const reaction = a * b * b;
      const coupledB = coupling * (other.b[index] - b);
      const drive = roomParameters.drive * 0.0015 * b;

      next.a[index] =
        a +
        parameters.diffusionA * laplacian(room.a, x, y) -
        reaction +
        roomParameters.feed * (1 - a);
      next.b[index] =
        b +
        parameters.diffusionB * laplacian(room.b, x, y) +
        reaction -
        (roomParameters.kill + roomParameters.feed) * b +
        coupledB +
        drive;

      next.a[index] = Math.min(Math.max(next.a[index], 0), 1);
      next.b[index] = Math.min(Math.max(next.b[index], 0), 1);
    }
  }
}

function swapRoom(
  roomId: ReactionRoomId,
  simulation: ReturnType<typeof makeSimulation>,
) {
  const current = simulation.rooms[roomId];
  simulation.rooms[roomId] = simulation.nextRooms[roomId];
  simulation.nextRooms[roomId] = current;
}

function injectIntoRoom(
  roomId: ReactionRoomId,
  simulation: ReturnType<typeof makeSimulation>,
  interaction: DjReactionInteraction,
) {
  const room = simulation.rooms[roomId];
  const centerX = interaction.localX * (gridSize - 1);
  const centerY = interaction.localY * (gridSize - 1);
  const radius = 5 + interaction.strength * 8;
  const radiusSquared = radius * radius;

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > radiusSquared) continue;

      const index = y * gridSize + x;
      const falloff = 1 - distanceSquared / radiusSquared;
      const amount = falloff * interaction.strength;

      room.a[index] = Math.min(
        Math.max(room.a[index] - amount * (0.2 + interaction.materialB * 0.55), 0),
        1,
      );
      room.b[index] = Math.min(
        Math.max(
          room.b[index] +
            amount * (0.24 + interaction.materialA * 0.18 + interaction.materialB * 0.58),
          0,
        ),
        1,
      );
    }
  }
}

function injectConnector(
  simulation: ReturnType<typeof makeSimulation>,
  interaction: DjReactionInteraction,
) {
  const y = Math.floor(interaction.localY * (gridSize - 1));
  const rowStart = Math.max(0, y - 6);
  const rowEnd = Math.min(gridSize - 1, y + 6);

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const index = row * gridSize + x;
      const one = simulation.rooms["1"];
      const two = simulation.rooms["2"];
      const average = (one.b[index] + two.b[index]) * 0.5;
      const strength = interaction.strength * 0.22;

      one.b[index] += (average - one.b[index]) * strength;
      two.b[index] += (average - two.b[index]) * strength;
      one.b[index] = Math.min(Math.max(one.b[index], 0), 1);
      two.b[index] = Math.min(Math.max(two.b[index], 0), 1);
    }
  }
}

function applyInteraction(
  simulation: ReturnType<typeof makeSimulation>,
  interaction: DjReactionInteraction,
) {
  if (interaction.target === "1" || interaction.target === "2") {
    injectIntoRoom(interaction.target, simulation, interaction);
    return;
  }

  injectConnector(simulation, interaction);
}

function inferInteraction(signal: DjSignal): DjReactionInteraction | null {
  if (signal.interaction) return signal.interaction;
  if (signal.x === null || signal.y === null) return null;

  const roomOneDistance = Math.hypot(signal.x - 0.28, signal.y - 0.5);
  const roomTwoDistance = Math.hypot(signal.x - 0.72, signal.y - 0.5);

  if (roomOneDistance <= 0.18) {
    const localX = Math.min(Math.max((signal.x - 0.1) / 0.36, 0), 1);
    const localY = Math.min(Math.max((signal.y - 0.32) / 0.36, 0), 1);

    return {
      target: "1",
      localX,
      localY,
      materialA: 1 - localY,
      materialB: localY,
      strength: 0.78,
    };
  }

  if (roomTwoDistance <= 0.18) {
    const localX = Math.min(Math.max((signal.x - 0.54) / 0.36, 0), 1);
    const localY = Math.min(Math.max((signal.y - 0.32) / 0.36, 0), 1);

    return {
      target: "2",
      localX,
      localY,
      materialA: 1 - localY,
      materialB: localY,
      strength: 0.78,
    };
  }

  if (signal.x >= 0.32 && signal.x <= 0.68 && signal.y >= 0.42 && signal.y <= 0.58) {
    return {
      target: "connector",
      localX: Math.min(Math.max((signal.x - 0.32) / 0.36, 0), 1),
      localY: Math.min(Math.max((signal.y - 0.42) / 0.16, 0), 1),
      materialA: 0,
      materialB: 0,
      strength: 0.9,
    };
  }

  return null;
}

function drawRoom(
  canvas: HTMLCanvasElement,
  roomId: ReactionRoomId,
  simulation: ReturnType<typeof makeSimulation>,
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  const targetWidth = Math.max(1, Math.floor(width * ratio));
  const targetHeight = Math.max(1, Math.floor(height * ratio));

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const image = context.createImageData(gridSize, gridSize);
  const room = simulation.rooms[roomId];

  for (let index = 0; index < cellCount; index += 1) {
    const a = room.a[index];
    const b = room.b[index];
    const materialA = Math.floor(28 + a * 88 + b * 24);
    const materialB = Math.floor(40 + b * 190);
    const materialC = Math.floor(32 + (1 - a) * 132 + b * 44);
    const pixel = index * 4;

    image.data[pixel] = materialC;
    image.data[pixel + 1] = materialA + Math.floor(b * 54);
    image.data[pixel + 2] = materialB;
    image.data[pixel + 3] = 255;
  }

  let scratch = scratchCanvases.get(canvas);
  if (!scratch) {
    scratch = document.createElement("canvas");
    scratchCanvases.set(canvas, scratch);
  }
  scratch.width = gridSize;
  scratch.height = gridSize;
  const scratchContext = scratch.getContext("2d");
  if (!scratchContext) return;

  scratchContext.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(scratch, 0, 0, canvas.width, canvas.height);
}

function ReactionRoom({
  roomId,
  simulationRef,
}: {
  roomId: ReactionRoomId;
  simulationRef: React.MutableRefObject<ReturnType<typeof makeSimulation>>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let frame = 0;

    function render() {
      const canvas = canvasRef.current;
      if (canvas) {
        drawRoom(canvas, roomId, simulationRef.current);
      }
      frame = window.requestAnimationFrame(render);
    }

    render();

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [roomId, simulationRef]);

  return (
    <RoomFrame aria-label={`DJ reaction diffusion room ${roomId}`}>
      <canvas ref={canvasRef} />
    </RoomFrame>
  );
}

export function DjReactionScreenExperience({
  screenIds,
}: {
  screenIds: readonly DjScreenId[];
}) {
  const parametersRef = useRef<DjReactionParameters>(initialParameters);
  const simulationRef = useRef(makeSimulation());
  const pendingStepsRef = useRef(0);

  const handleSignal = useCallback((signal: DjSignal) => {
    if (signal.variantId !== "2" || !signal.parameters) {
      return;
    }
    const interaction = inferInteraction(signal);
    if (!interaction) return;

    parametersRef.current = signal.parameters;
    applyInteraction(simulationRef.current, interaction);
    pendingStepsRef.current = Math.min(pendingStepsRef.current + 96, 220);
  }, []);

  useDjSocket({
    experimentSlug: "2",
    role: "screen",
    onSignal: handleSignal,
    replayLastSignal: true,
  });

  useEffect(() => {
    let frame = 0;

    function run() {
      const simulation = simulationRef.current;
      const parameters = parametersRef.current;

      if (pendingStepsRef.current > 0) {
        const stepCount = Math.min(3, pendingStepsRef.current);

        for (let index = 0; index < stepCount; index += 1) {
          stepRoom("1", simulation, parameters);
          stepRoom("2", simulation, parameters);
          swapRoom("1", simulation);
          swapRoom("2", simulation);
        }

        pendingStepsRef.current -= stepCount;
      }

      frame = window.requestAnimationFrame(run);
    }

    run();

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const rooms = screenIds.filter(
    (screenId): screenId is ReactionRoomId =>
      screenId === "1" || screenId === "2",
  );

  return (
    <Page>
      {rooms.length > 1 ? (
        <WholeStage>
          {rooms.map((roomId) => (
            <ReactionRoom
              key={roomId}
              roomId={roomId}
              simulationRef={simulationRef}
            />
          ))}
        </WholeStage>
      ) : (
        <SingleFrame>
          <ReactionRoom
            roomId={rooms[0] ?? "1"}
            simulationRef={simulationRef}
          />
        </SingleFrame>
      )}
    </Page>
  );
}

export default function DjReactionScreen({
  screenId,
}: {
  screenId: DjScreenId;
}) {
  return <DjReactionScreenExperience screenIds={[screenId]} />;
}
