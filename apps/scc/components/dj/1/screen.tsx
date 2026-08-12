"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  useDjSocket,
  type DjSignal,
} from "@/components/dj/1/use-dj-socket";
import { djScreenIds, type DjScreenId } from "@/components/dj/experiments";

type FlashKind = "node" | "edge";

type Flash = {
  id: string;
  kind: FlashKind;
};

type FlashState = Record<DjScreenId, Flash[]>;

const flash = keyframes`
  0% {
    opacity: 0;
  }

  14% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
`;

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #020202;
  color: #f7f4ec;
`;

const SingleFrame = styled.div`
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
`;

const WholeGrid = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: clamp(4px, 0.8vmin, 12px);
  padding: clamp(4px, 0.8vmin, 12px);
  background: #020202;
`;

const Pane = styled.section`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at center, rgba(247, 244, 236, 0.035), transparent 58%),
    #050505;
  contain: strict;
`;

const FlashLayer = styled.div<{ $kind: FlashKind }>`
  position: absolute;
  inset: 0;
  background: ${({ $kind }) =>
    $kind === "edge"
      ? "rgba(255, 38, 32, 0.88)"
      : "rgba(247, 244, 236, 0.9)"};
  mix-blend-mode: screen;
  pointer-events: none;
  animation: ${flash} 520ms ease-out forwards;
`;

function createFlashState(): FlashState {
  return {
    "1": [],
    "2": [],
    "3": [],
    "4": [],
  };
}

function DjScreenPane({
  flashes,
  screenId,
}: {
  flashes: Flash[];
  screenId: DjScreenId;
}) {
  return (
    <Pane aria-label={`DJ screen ${screenId}`}>
      {flashes.map((item) => (
        <FlashLayer key={item.id} $kind={item.kind} />
      ))}
    </Pane>
  );
}

export function DjScreenExperience({
  screenIds,
}: {
  screenIds: readonly DjScreenId[];
}) {
  const timeoutRef = useRef<number[]>([]);
  const [flashes, setFlashes] = useState<FlashState>(() => createFlashState());

  const handleSignal = useCallback(
    (signal: DjSignal) => {
      const visibleTargets = screenIds.filter((screenId) =>
        signal.targetScreenIds.includes(screenId),
      );

      if (visibleTargets.length === 0) return;

      const flashKind: FlashKind = signal.source === "edge" ? "edge" : "node";
      const flashId = `${signal.id}-${performance.now()}`;

      setFlashes((current) => {
        const next = { ...current };

        for (const screenId of visibleTargets) {
          next[screenId] = [
            ...next[screenId].slice(-3),
            { id: `${flashId}-${screenId}`, kind: flashKind },
          ];
        }

        return next;
      });

      const timeout = window.setTimeout(() => {
        setFlashes((current) => {
          const next = { ...current };

          for (const screenId of visibleTargets) {
            next[screenId] = next[screenId].filter(
              (item) => !item.id.startsWith(flashId),
            );
          }

          return next;
        });
      }, 620);
      timeoutRef.current.push(timeout);
    },
    [screenIds],
  );

  useDjSocket({
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

  const isWhole = screenIds.length > 1;
  const orderedScreenIds = useMemo(
    () =>
      isWhole
        ? djScreenIds
        : screenIds.filter((screenId) => djScreenIds.includes(screenId)),
    [isWhole, screenIds],
  );

  return (
    <Page>
      {isWhole ? (
        <WholeGrid>
          {orderedScreenIds.map((screenId) => (
            <DjScreenPane
              key={screenId}
              flashes={flashes[screenId]}
              screenId={screenId}
            />
          ))}
        </WholeGrid>
      ) : (
        <SingleFrame>
          <DjScreenPane
            flashes={flashes[orderedScreenIds[0] ?? "1"]}
            screenId={orderedScreenIds[0] ?? "1"}
          />
        </SingleFrame>
      )}
    </Page>
  );
}

export default function DjScreen({ screenId }: { screenId: DjScreenId }) {
  return <DjScreenExperience screenIds={[screenId]} />;
}
