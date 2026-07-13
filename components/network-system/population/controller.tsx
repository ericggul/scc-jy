"use client";

import { useState } from "react";
import styled from "styled-components";
import { formatPopulationParameter, populationEdges, populationNodes } from "./graph";
import { createInitialPopulationSnapshot, type PopulationEdgeId } from "./model";
import { usePopulationSocket } from "./use-population-socket";

const PAPER = "#f3f2ee";
const INK = "#171714";

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: ${PAPER};
  color: ${INK};
  font-family: "Apple SD Gothic Neo", Arial, sans-serif;
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
`;

const EdgePath = styled.path.attrs<{ $flow: number }>(({ $flow }) => ({
  style: { strokeWidth: `${0.75 + Math.min(Math.abs($flow), 12) * 0.08}px` },
}))<{ $generative: boolean }>`
  fill: none;
  stroke: ${INK};
  stroke-dasharray: ${({ $generative }) => ($generative ? "5 4" : "none")};
  stroke-opacity: 0.68;
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

const EdgeLabel = styled.span`
  padding: 1px 4px;
  background: ${PAPER};
  font-size: clamp(8px, 1.05vmin, 11px);
  white-space: nowrap;
`;

const RateControl = styled.div`
  display: grid;
  grid-template-columns: clamp(22px, 3.5vmin, 32px) minmax(48px, auto) clamp(22px, 3.5vmin, 32px);
  border: 1px solid ${INK};
  background: ${PAPER};
`;

const RateButton = styled.button`
  width: clamp(22px, 3.5vmin, 32px);
  height: clamp(26px, 3.8vmin, 34px);
  border: 0;
  background: transparent;
  color: ${INK};
  font: 500 18px/1 Arial, sans-serif;
  cursor: pointer;
  touch-action: manipulation;

  &:hover,
  &:active,
  &:focus-visible {
    outline: none;
    background: ${INK};
    color: ${PAPER};
  }
`;

const RateValue = styled.output`
  display: grid;
  min-width: 48px;
  place-content: center;
  gap: 1px;
  border-right: 1px solid ${INK};
  border-left: 1px solid ${INK};
  text-align: center;
  font: 500 clamp(9px, 1.15vmin, 11px)/1 "SFMono-Regular", Consolas, monospace;

  small {
    color: #74736d;
    font-size: clamp(7px, 0.9vmin, 9px);
  }
`;

const Node = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${({ $x }) => `${$x * 100}%`};
  top: ${({ $y }) => `${$y * 100}%`};
  width: clamp(104px, 20vmin, 170px);
  aspect-ratio: 1;
  overflow: hidden;
  display: grid;
  grid-template-rows: 1fr 1fr;
  border: 1px solid ${INK};
  border-radius: 50%;
  background: ${PAPER};
  transform: translate(-50%, -50%);
  z-index: 3;
`;

const StockButton = styled.button<{ $lower?: boolean }>`
  border: 0;
  border-top: ${({ $lower }) => ($lower ? `1px solid ${INK}` : "0")};
  background: transparent;
  color: ${INK};
  padding: ${({ $lower }) => ($lower ? "18% 0 0" : "0 0 18%")};
  font: 400 clamp(20px, 4vmin, 34px)/1 Arial, sans-serif;
  cursor: pointer;

  &:hover,
  &:active,
  &:focus-visible {
    outline: none;
    background: ${INK};
    color: ${PAPER};
  }
`;

const NodeReading = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  min-width: 58%;
  padding: 5px 7px;
  border: 1px solid ${INK};
  background: ${PAPER};
  text-align: center;
  transform: translate(-50%, -50%);
  pointer-events: none;

  strong { display: block; font-size: clamp(12px, 2.2vmin, 21px); font-weight: 500; }
  small { display: block; margin-top: 2px; font: 500 clamp(8px, 1.15vmin, 11px)/1 "SFMono-Regular", Consolas, monospace; }
`;

const Year = styled.output`
  position: absolute;
  left: clamp(12px, 2.2vmin, 22px);
  bottom: clamp(12px, 2.2vmin, 22px);
  font: 500 clamp(11px, 1.5vmin, 14px)/1 "SFMono-Regular", Consolas, monospace;
`;

const Reset = styled.button`
  position: absolute;
  top: clamp(12px, 2.2vmin, 22px);
  right: clamp(12px, 2.2vmin, 22px);
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid ${INK};
  background: ${PAPER};
  color: ${INK};
  font: 500 10px/1 "SFMono-Regular", Consolas, monospace;
  cursor: pointer;
  z-index: 5;
`;

function rounded(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString("ko-KR");
}

export default function PopulationController() {
  const [fallback] = useState(() => createInitialPopulationSnapshot());
  const { connected, state, sendIntervention, resetSystem } = usePopulationSocket("controller");
  const snapshot = state ?? fallback;

  function flowLabel(edgeId: PopulationEdgeId) {
    return `${snapshot.edgeFlows[edgeId].toFixed(1)}/년`;
  }

  return (
    <Page>
      <Reset disabled={!connected} type="button" onClick={resetSystem}>RESET</Reset>
      <Year>YEAR {String(snapshot.year).padStart(3, "0")} · 생존 {rounded(snapshot.livingPopulation)}</Year>
      <Graph aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 1 1">
        <defs>
          <marker id="population-arrow" markerHeight="7" markerUnits="strokeWidth" markerWidth="7" orient="auto" refX="6" refY="3.5" viewBox="0 0 7 7">
            <path d="M 0 0 L 7 3.5 L 0 7 z" fill={INK} />
          </marker>
        </defs>
        {populationEdges.map((edge) => (
          <EdgePath
            key={edge.id}
            $flow={snapshot.edgeFlows[edge.id]}
            $generative={Boolean(edge.generative)}
            d={edge.path}
            markerEnd="url(#population-arrow)"
          />
        ))}
      </Graph>

      {populationEdges.map((edge) => (
        <EdgeControl key={edge.id} $x={edge.control.x} $y={edge.control.y}>
          <EdgeLabel>{edge.label}</EdgeLabel>
          <RateControl>
            <RateButton type="button" aria-label={`${edge.label} 감소`} onPointerDown={() => sendIntervention({ kind: "parameter", parameter: edge.parameter, amount: -edge.step })}>−</RateButton>
            <RateValue>
              {formatPopulationParameter(edge.parameter, snapshot.parameters[edge.parameter])}
              <small>{flowLabel(edge.id)}</small>
            </RateValue>
            <RateButton type="button" aria-label={`${edge.label} 증가`} onPointerDown={() => sendIntervention({ kind: "parameter", parameter: edge.parameter, amount: edge.step })}>+</RateButton>
          </RateControl>
        </EdgeControl>
      ))}

      {populationNodes.map((node) => (
        <Node key={node.id} $x={node.x} $y={node.y}>
          <StockButton type="button" aria-label={`${node.label} 인구 5명 증가`} onPointerDown={() => sendIntervention({ kind: "population", state: node.id, amount: 5 })}>+</StockButton>
          <StockButton $lower type="button" aria-label={`${node.label} 인구 5명 감소`} onPointerDown={() => sendIntervention({ kind: "population", state: node.id, amount: -5 })}>−</StockButton>
          <NodeReading><strong>{node.label}</strong><small>{rounded(snapshot.counts[node.id])}</small></NodeReading>
        </Node>
      ))}
    </Page>
  );
}

