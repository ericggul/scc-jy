"use client";

import { useRef, useState } from "react";
import styled from "styled-components";
import {
  djEdges,
  djNodes,
  getDjNode,
  resolveDjHitTarget,
  type DjHitTarget,
} from "@/components/dj/1/graph";
import { useDjSocket } from "@/components/dj/1/use-dj-socket";

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #070707;
  color: #f7f4ec;
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

const Graph = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const VisibleEdge = styled.line<{ $active: boolean }>`
  stroke: ${({ $active }) =>
    $active ? "rgba(255, 42, 34, 0.94)" : "rgba(247, 244, 236, 0.34)"};
  stroke-width: ${({ $active }) => ($active ? "1.2" : "0.55")};
  vector-effect: non-scaling-stroke;
`;

const Node = styled.div<{ $x: number; $y: number; $active: boolean }>`
  position: absolute;
  left: ${({ $x }) => `${$x * 100}%`};
  top: ${({ $y }) => `${$y * 100}%`};
  width: clamp(64px, 18vmin, 142px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(247, 244, 236, 0.95)" : "rgba(247, 244, 236, 0.42)"};
  border-radius: 999px;
  background: ${({ $active }) =>
    $active ? "rgba(247, 244, 236, 0.9)" : "rgba(247, 244, 236, 0.035)"};
  box-shadow: ${({ $active }) =>
    $active
      ? "0 0 36px rgba(247, 244, 236, 0.42)"
      : "0 0 0 rgba(0, 0, 0, 0)"};
  color: ${({ $active }) => ($active ? "#070707" : "rgba(247, 244, 236, 0.84)")};
  font-size: 22px;
  font-weight: 600;
  transform: translate(-50%, -50%);
  transition:
    background 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease,
    color 120ms ease;
  pointer-events: none;
`;

function getTargetKey(target: DjHitTarget | null) {
  if (!target) return null;
  return target.source === "node" ? `node:${target.nodeId}` : `edge:${target.edgeId}`;
}

export default function DjController() {
  const { sendSignal } = useDjSocket({ role: "controller" });
  const [activeTarget, setActiveTarget] = useState<DjHitTarget | null>(null);
  const pointerDownRef = useRef(false);
  const lastEmitRef = useRef<{
    key: string | null;
    sentAt: number;
  }>({ key: null, sentAt: 0 });

  function handlePointer(clientX: number, clientY: number, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
    const nextTarget = resolveDjHitTarget(x, y);
    const nextKey = getTargetKey(nextTarget);
    const now = performance.now();

    setActiveTarget(nextTarget);

    if (!nextTarget) {
      lastEmitRef.current = { key: null, sentAt: now };
      return;
    }

    if (
      nextKey === lastEmitRef.current.key &&
      now - lastEmitRef.current.sentAt < 90
    ) {
      return;
    }

    lastEmitRef.current = { key: nextKey, sentAt: now };
    sendSignal({
      ...nextTarget,
      x,
      y,
    });
  }

  const activeKey = getTargetKey(activeTarget);

  return (
    <Page>
      <Surface
        aria-label="DJ K4 graph controller"
        role="application"
        onPointerDown={(event) => {
          pointerDownRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          handlePointer(event.clientX, event.clientY, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (!pointerDownRef.current) return;
          handlePointer(event.clientX, event.clientY, event.currentTarget);
        }}
        onPointerCancel={() => {
          pointerDownRef.current = false;
          setActiveTarget(null);
        }}
        onPointerUp={() => {
          pointerDownRef.current = false;
          setActiveTarget(null);
        }}
      >
        <Graph aria-hidden="true" viewBox="0 0 1 1" preserveAspectRatio="none">
          {djEdges.map((edge) => {
            const from = getDjNode(edge.from);
            const to = getDjNode(edge.to);
            if (!from || !to) return null;

            return (
              <VisibleEdge
                key={edge.id}
                $active={activeKey === `edge:${edge.id}`}
                x1={from.x}
                x2={to.x}
                y1={from.y}
                y2={to.y}
              />
            );
          })}
        </Graph>

        {djNodes.map((node) => (
          <Node
            key={node.id}
            $active={activeKey === `node:${node.id}`}
            $x={node.x}
            $y={node.y}
          >
            {node.id}
          </Node>
        ))}
      </Surface>
    </Page>
  );
}
