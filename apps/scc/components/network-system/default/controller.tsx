"use client";

import { useState } from "react";
import styled from "styled-components";
import { getMarkovNode, markovNodes } from "./graph";
import {
  createInitialMarkovSnapshot,
  type MarkovEdgeId,
  type MarkovNodeId,
} from "./model";
import { useMarkovSocket } from "./use-markov-socket";
import { useMorphedMarkovState } from "./use-morphed-markov-state";

const UP = "#d43d31";
const DOWN = "#2868b2";

const pairedConnections: Array<{
  edgeIds: [MarkovEdgeId, MarkovEdgeId];
  x: number;
  y: number;
}> = [
  { edgeIds: ["1-2", "2-1"], x: 0.5, y: 0.18 },
  { edgeIds: ["1-3", "3-1"], x: 0.15, y: 0.5 },
  { edgeIds: ["1-4", "4-1"], x: 0.62, y: 0.62 },
  { edgeIds: ["2-3", "3-2"], x: 0.38, y: 0.62 },
  { edgeIds: ["2-4", "4-2"], x: 0.85, y: 0.5 },
  { edgeIds: ["3-4", "4-3"], x: 0.5, y: 0.82 },
];

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #f2f1ed;
  color: #11110f;
  font-family: Arial, Helvetica, sans-serif;
  font-variant-numeric: tabular-nums;
  touch-action: none;
  overscroll-behavior: none;
`;

const Graph = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
`;

const EdgeLine = styled.line.attrs<{ $weight: number }>(({ $weight }) => ({
  style: { strokeWidth: 0.55 + $weight * 0.55 },
}))`
  stroke: #11110f;
  stroke-opacity: 0.72;
  vector-effect: non-scaling-stroke;
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

const DirectionRow = styled.div`
  display: grid;
  grid-template-columns: minmax(34px, auto) auto;
  align-items: center;
  gap: 4px;
  padding: clamp(1px, 0.3vmin, 2px);
  background: #f2f1ed;
`;

const DirectionName = styled.span`
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: clamp(7px, 1.05vmin, 10px);
  text-align: right;
  white-space: nowrap;
`;

const WeightControl = styled.div`
  display: grid;
  grid-template-columns: clamp(24px, 4vmin, 34px) minmax(clamp(42px, 5.5vmin, 54px), auto) clamp(24px, 4vmin, 34px);
  border: 1px solid #11110f;
  background: #f2f1ed;
`;

const WeightButton = styled.button`
  width: clamp(24px, 4vmin, 34px);
  height: clamp(28px, 4.4vmin, 36px);
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

const WeightReading = styled.output`
  min-width: clamp(42px, 5.5vmin, 54px);
  display: grid;
  place-content: center;
  gap: 2px;
  border-right: 1px solid #11110f;
  border-left: 1px solid #11110f;
  text-align: center;
  font-family: "SFMono-Regular", Consolas, monospace;
`;

const WeightValue = styled.strong`
  font-size: clamp(9px, 1.2vmin, 11px);
  font-weight: 500;
  line-height: 1;
`;

const Change = styled.small<{ $delta: number }>`
  min-height: 1em;
  color: ${({ $delta }) => ($delta > 0 ? UP : $delta < 0 ? DOWN : "#77756f")};
  font: 600 clamp(7px, 0.9vmin, 9px) / 1 "SFMono-Regular", Consolas, monospace;
`;

const Node = styled.div.attrs<{ $x: number; $y: number; $weight: number }>(({ $weight }) => ({
  style: { borderWidth: 0.55 + $weight * 0.55 },
}))`
  position: absolute;
  left: ${({ $x }) => `${$x * 100}%`};
  top: ${({ $y }) => `${$y * 100}%`};
  width: clamp(92px, 21vmin, 166px);
  aspect-ratio: 1;
  overflow: hidden;
  display: grid;
  grid-template-rows: 1fr 1fr;
  border-style: solid;
  border-color: #11110f;
  border-radius: 999px;
  background: #f2f1ed;
  color: #11110f;
  transform: translate(-50%, -50%);
  z-index: 3;
`;

const SelfButton = styled.button<{ $lower?: boolean }>`
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

const NodeIdentity = styled.button`
  position: absolute;
  left: 50%;
  top: 50%;
  min-width: 56%;
  padding: 5px 7px;
  border: 1px solid #11110f;
  background: #f2f1ed;
  color: #11110f;
  text-align: center;
  transform: translate(-50%, -50%);
  cursor: pointer;

  strong {
    display: block;
    font-size: clamp(13px, 2.6vmin, 24px);
    font-weight: 500;
  }

  span,
  small {
    display: block;
    margin-top: 2px;
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: clamp(7px, 1.1vmin, 10px);
  }

  &:hover,
  &:active,
  &:focus-visible {
    background: #11110f;
    color: #f2f1ed;
    outline: none;
  }
`;

function signedPercent(delta: number) {
  if (Math.abs(delta) < 0.00005) return "0.00%";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta * 100).toFixed(2)}%`;
}

function directedGeometry(fromId: MarkovNodeId, toId: MarkovNodeId, reverse: boolean) {
  const from = getMarkovNode(fromId);
  const to = getMarkovNode(toId);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = reverse ? 0.006 : -0.006;
  const offsetX = (-dy / length) * offset;
  const offsetY = (dx / length) * offset;
  return {
    x1: from.x + dx * 0.16 + offsetX,
    y1: from.y + dy * 0.16 + offsetY,
    x2: from.x + dx * 0.84 + offsetX,
    y2: from.y + dy * 0.84 + offsetY,
  };
}

export default function MarkovController() {
  const [fallback] = useState(() => createInitialMarkovSnapshot());
  const { state, sendIntervention } = useMarkovSocket("controller");
  const { displayed, deltas } = useMorphedMarkovState(state ?? fallback);

  function renderWeightRow(edgeId: MarkovEdgeId) {
    const [from, to] = edgeId.split("-");
    const delta = deltas.weights[edgeId];
    return (
      <DirectionRow key={edgeId}>
        <DirectionName>{from}→{to}</DirectionName>
        <WeightControl>
          <WeightButton type="button" aria-label={`Decrease ${from} to ${to} weight`} onPointerDown={() => sendIntervention({ kind: "weight", edgeId, amount: -0.05 })}>−</WeightButton>
          <WeightReading>
            <WeightValue>{displayed.weights[edgeId].toFixed(2)}</WeightValue>
            <Change $delta={delta}>{signedPercent(delta)}</Change>
          </WeightReading>
          <WeightButton type="button" aria-label={`Increase ${from} to ${to} weight`} onPointerDown={() => sendIntervention({ kind: "weight", edgeId, amount: 0.05 })}>+</WeightButton>
        </WeightControl>
      </DirectionRow>
    );
  }

  return (
    <Page>
      <Graph aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 1 1">
        <defs>
          <marker id="direction-arrow" markerHeight="6" markerUnits="strokeWidth" markerWidth="6" orient="auto" refX="5" refY="3" viewBox="0 0 6 6">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#11110f" />
          </marker>
        </defs>
        {pairedConnections.flatMap((connection) =>
          connection.edgeIds.map((edgeId, index) => {
            const [from, to] = edgeId.split("-") as [MarkovNodeId, MarkovNodeId];
            const geometry = directedGeometry(from, to, index === 1);
            return <EdgeLine key={edgeId} {...geometry} $weight={displayed.weights[edgeId]} markerEnd="url(#direction-arrow)" />;
          }),
        )}
      </Graph>

      {pairedConnections.map((connection) => (
        <EdgeControl key={connection.edgeIds[0]} $x={connection.x} $y={connection.y}>
          {connection.edgeIds.map(renderWeightRow)}
        </EdgeControl>
      ))}

      {markovNodes.map((node) => {
        const selfEdgeId = `${node.id}-${node.id}` as MarkovEdgeId;
        return (
          <Node key={node.id} $x={node.x} $y={node.y} $weight={displayed.weights[selfEdgeId]}>
            <SelfButton
              type="button"
              aria-label={`Increase ${node.id} self-transition weight`}
              onPointerDown={() => sendIntervention({ kind: "weight", edgeId: selfEdgeId, amount: 0.05 })}
            >
              +
            </SelfButton>
            <SelfButton
              $lower
              type="button"
              aria-label={`Decrease ${node.id} self-transition weight`}
              onPointerDown={() => sendIntervention({ kind: "weight", edgeId: selfEdgeId, amount: -0.05 })}
            >
              −
            </SelfButton>
            <NodeIdentity
              type="button"
              aria-label={`Set all value to node ${node.id}`}
              onPointerDown={() => sendIntervention({ kind: "seed", nodeId: node.id })}
            >
              <strong>{node.id}</strong>
              <span>{displayed.values[node.id].toFixed(3)}</span>
              <Change $delta={deltas.values[node.id]}>{signedPercent(deltas.values[node.id])}</Change>
              <small>SELF {displayed.weights[selfEdgeId].toFixed(2)}</small>
            </NodeIdentity>
          </Node>
        );
      })}
    </Page>
  );
}
