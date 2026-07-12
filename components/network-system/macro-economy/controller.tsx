"use client";

import { useState } from "react";
import styled from "styled-components";
import {
  getInstitutionalEdge,
  getInstitutionalNode,
  institutionalConnections,
  institutionalNodes,
} from "@/components/network-system/macro-economy/graph";
import {
  createInitialSystemSnapshot,
} from "@/components/network-system/macro-economy/model";
import { presentInstitution } from "@/components/network-system/macro-economy/presenter";
import { useNetworkSystemSocket } from "@/components/network-system/macro-economy/use-network-system-socket";

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #f2f1ed;
  color: #11110f;
  font-family: Arial, Helvetica, sans-serif;
  touch-action: none;
  overscroll-behavior: none;
`;

const ResetButton = styled.button`
  position: absolute;
  top: clamp(10px, 2.2vmin, 22px);
  right: clamp(10px, 2.2vmin, 22px);
  z-index: 4;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #11110f;
  background: #f2f1ed;
  color: #11110f;
  font: 500 clamp(9px, 1.25vmin, 12px) / 1
    "SFMono-Regular", Consolas, monospace;
  letter-spacing: 0.04em;
  cursor: pointer;
  touch-action: manipulation;

  &:hover,
  &:active,
  &:focus-visible {
    background: #11110f;
    color: #f2f1ed;
    outline: none;
  }

  &:disabled {
    cursor: default;
    opacity: 0.35;
  }
`;

const Graph = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
`;

const DirectedEdgeLine = styled.line.attrs<{ $weight: number }>(({ $weight }) => ({
  style: {
    strokeWidth: 0.55 + $weight * 0.55,
  },
}))`
  stroke: #11110f;
  stroke-opacity: 0.72;
  vector-effect: non-scaling-stroke;
`;

const NegativeDirectedEdgeLine = styled(DirectedEdgeLine)`
  stroke-dasharray: 4 3;
`;

const FlowDot = styled.circle`
  fill: #11110f;
`;

const EdgeControl = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${({ $x }) => `${$x * 100}%`};
  top: ${({ $y }) => `${$y * 100}%`};
  display: grid;
  justify-items: center;
  gap: 3px;
  transform: translate(-50%, -50%);
  z-index: 2;
`;

const EdgeName = styled.span`
  max-width: clamp(84px, 14vw, 148px);
  overflow: hidden;
  padding: 2px 4px;
  background: #f2f1ed;
  font-size: clamp(7px, 1.15vmin, 10px);
  letter-spacing: 0.04em;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DirectionRow = styled.div`
  display: grid;
  grid-template-columns: minmax(46px, auto) auto;
  align-items: center;
  gap: 4px;
  padding: clamp(1px, 0.3vmin, 2px);
  background: #f2f1ed;
`;

const DirectionName = styled.span`
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: clamp(7px, 1.05vmin, 10px);
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
`;

const WeightControl = styled.div`
  display: grid;
  grid-template-columns:
    clamp(24px, 4vmin, 34px)
    minmax(clamp(38px, 5vmin, 48px), auto)
    clamp(24px, 4vmin, 34px);
  border: 1px solid #11110f;
  background: #f2f1ed;
`;

const WeightButton = styled.button`
  width: clamp(24px, 4vmin, 34px);
  height: clamp(24px, 3.8vmin, 32px);
  border: 0;
  background: transparent;
  color: #11110f;
  font: 500 19px/1 Arial, sans-serif;
  cursor: pointer;
  touch-action: manipulation;

  &:hover,
  &:active,
  &:focus-visible {
    background: #11110f;
    color: #f2f1ed;
    outline: none;
  }
`;

const WeightValue = styled.output`
  display: grid;
  place-items: center;
  min-width: clamp(38px, 5vmin, 48px);
  border-right: 1px solid #11110f;
  border-left: 1px solid #11110f;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
`;

const NodeControl = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${({ $x }) => `${$x * 100}%`};
  top: ${({ $y }) => `${$y * 100}%`};
  width: clamp(92px, 21vmin, 166px);
  aspect-ratio: 1;
  overflow: hidden;
  display: grid;
  grid-template-rows: 1fr 1fr;
  border: 1px solid #11110f;
  border-radius: 999px;
  background: #f2f1ed;
  transform: translate(-50%, -50%);
  z-index: 3;
`;

const ShockButton = styled.button<{ $lower?: boolean }>`
  border: 0;
  border-top: ${({ $lower }) => ($lower ? "1px solid #11110f" : "0")};
  background: transparent;
  color: #11110f;
  font: 400 clamp(18px, 4vmin, 34px) / 1 Arial, sans-serif;
  cursor: pointer;
  touch-action: manipulation;
  padding: ${({ $lower }) => ($lower ? "18% 0 0" : "0 0 18%")};

  &:hover,
  &:active,
  &:focus-visible {
    background: #11110f;
    color: #f2f1ed;
    outline: none;
  }
`;

const NodeIdentity = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  min-width: 46%;
  padding: 5px 7px;
  border: 1px solid #11110f;
  background: #f2f1ed;
  color: #11110f;
  text-align: center;
  transform: translate(-50%, -50%);
  pointer-events: none;

  strong {
    display: block;
    font-size: clamp(13px, 2.6vmin, 24px);
    font-weight: 500;
  }

  small {
    display: block;
    margin-top: 2px;
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: clamp(7px, 1.1vmin, 10px);
  }
`;

function pointAlong(
  from: { x: number; y: number },
  to: { x: number; y: number },
  progress: number,
) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

function directedLineGeometry(
  connection: (typeof institutionalConnections)[number],
  directionIndex: number,
) {
  const referenceEdge = getInstitutionalEdge(connection.edgeIds[0]);
  const edge = getInstitutionalEdge(connection.edgeIds[directionIndex]);
  if (!referenceEdge || !edge) return null;

  const referenceFrom = getInstitutionalNode(referenceEdge.from);
  const referenceTo = getInstitutionalNode(referenceEdge.to);
  const from = getInstitutionalNode(edge.from);
  const to = getInstitutionalNode(edge.to);
  if (!referenceFrom || !referenceTo || !from || !to) return null;

  const dx = referenceTo.x - referenceFrom.x;
  const dy = referenceTo.y - referenceFrom.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = directionIndex === 0 ? -0.006 : 0.006;
  const offsetX = (-dy / length) * offset;
  const offsetY = (dx / length) * offset;

  const offsetFrom = { x: from.x + offsetX, y: from.y + offsetY };
  const offsetTo = { x: to.x + offsetX, y: to.y + offsetY };

  return {
    edge,
    from: pointAlong(offsetFrom, offsetTo, 0.16),
    to: pointAlong(offsetFrom, offsetTo, 0.84),
  };
}

export default function NetworkSystemController() {
  const [initialState] = useState(() => createInitialSystemSnapshot());
  const { connected, state, sendIntervention, resetSystem } =
    useNetworkSystemSocket({
    experimentSlug: "macro-economy",
    role: "controller",
  });
  const snapshot = state ?? initialState;
  const flowProgress = 0.14 + ((snapshot.revision % 28) / 27) * 0.72;

  return (
    <Page>
      <ResetButton disabled={!connected} type="button" onClick={resetSystem}>
        RESET SYSTEM
      </ResetButton>
      <Graph aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 1 1">
        <defs>
          <marker
            id="direction-arrow"
            markerHeight="6"
            markerUnits="strokeWidth"
            markerWidth="6"
            orient="auto"
            refX="5"
            refY="3"
            viewBox="0 0 6 6"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#11110f" />
          </marker>
        </defs>
        {institutionalConnections.flatMap((connection) =>
          connection.edgeIds.map((edgeId, directionIndex) => {
            const geometry = directedLineGeometry(connection, directionIndex);
            if (!geometry) return null;
            const { edge, from, to } = geometry;
            const flow = snapshot.edgeFlows[edgeId];
            const flowPoint = pointAlong(from, to, flowProgress);
            const Line =
              edge.coefficient < 0
                ? NegativeDirectedEdgeLine
                : DirectedEdgeLine;

            return (
              <g key={edgeId}>
                <Line
                  $weight={snapshot.edgeWeights[edgeId]}
                  markerEnd="url(#direction-arrow)"
                  x1={from.x}
                  x2={to.x}
                  y1={from.y}
                  y2={to.y}
                />
                {Math.abs(flow) >= 0.004 ? (
                  <FlowDot cx={flowPoint.x} cy={flowPoint.y} r="0.0045" />
                ) : null}
              </g>
            );
          }),
        )}
      </Graph>

      {institutionalConnections.map((connection) => (
        <EdgeControl
          key={connection.id}
          $x={connection.controlsAt.x}
          $y={connection.controlsAt.y}
        >
          <EdgeName>{connection.label}</EdgeName>
          {connection.edgeIds.map((edgeId) => {
            const edge = getInstitutionalEdge(edgeId);
            const from = edge ? getInstitutionalNode(edge.from) : null;
            const to = edge ? getInstitutionalNode(edge.to) : null;
            if (!edge || !from || !to) return null;

            return (
              <DirectionRow key={edgeId}>
                <DirectionName>
                  {from.shortLabel}→{to.shortLabel}
                </DirectionName>
                <WeightControl>
                  <WeightButton
                    aria-label={`Decrease ${from.label} to ${to.label} weight`}
                    type="button"
                    onPointerDown={() =>
                      sendIntervention({
                        kind: "edge-weight",
                        edgeId,
                        amount: -0.5,
                        x: connection.controlsAt.x,
                        y: connection.controlsAt.y,
                      })
                    }
                  >
                    −
                  </WeightButton>
                  <WeightValue>
                    {snapshot.edgeWeights[edgeId].toFixed(2)}
                  </WeightValue>
                  <WeightButton
                    aria-label={`Increase ${from.label} to ${to.label} weight`}
                    type="button"
                    onPointerDown={() =>
                      sendIntervention({
                        kind: "edge-weight",
                        edgeId,
                        amount: 0.5,
                        x: connection.controlsAt.x,
                        y: connection.controlsAt.y,
                      })
                    }
                  >
                    +
                  </WeightButton>
                </WeightControl>
              </DirectionRow>
            );
          })}
        </EdgeControl>
      ))}

      {institutionalNodes.map((node) => {
        const primary = presentInstitution(node.id, snapshot).readings[0];
        return (
          <NodeControl key={node.id} $x={node.x} $y={node.y}>
            <ShockButton
              aria-label={`Increase shock on ${node.label}`}
              type="button"
              onPointerDown={() =>
                sendIntervention({
                  kind: "node-shock",
                  institutionId: node.id,
                  amount: 0.55,
                  x: node.x,
                  y: node.y,
                })
              }
            >
              +
            </ShockButton>
            <ShockButton
              $lower
              aria-label={`Decrease shock on ${node.label}`}
              type="button"
              onPointerDown={() =>
                sendIntervention({
                  kind: "node-shock",
                  institutionId: node.id,
                  amount: -0.55,
                  x: node.x,
                  y: node.y,
                })
              }
            >
              −
            </ShockButton>
            <NodeIdentity>
              <strong>{node.shortLabel}</strong>
              <small>
                {primary.display}
              </small>
            </NodeIdentity>
          </NodeControl>
        );
      })}
    </Page>
  );
}
