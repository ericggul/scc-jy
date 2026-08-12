"use client";

import { useState } from "react";
import styled from "styled-components";
import { createInitialCycleSnapshot } from "@/components/network-system/cycle/model";
import { useCycleSocket } from "@/components/network-system/cycle/transport";
import {
  presentCycleGraphs,
  type CycleGraphReading,
} from "./presenter";

const Stage = styled.main`
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: clamp(2px, 0.25vmin, 5px);
  overflow: hidden;
  background: #050505;
`;

const Panel = styled.section`
  container-type: size;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  padding: clamp(9px, 4cqh, 26px) clamp(9px, 4cqw, 26px);
  overflow: hidden;
  box-sizing: border-box;
  background: #f2f1ed;
  color: #11110f;
  font-family: Arial, Helvetica, sans-serif;
  contain: strict;
`;

const Header = styled.header`
  display: flex;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  gap: 4cqw;

  h2 {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: clamp(9px, 3.2cqmin, 18px);
    font-weight: 500;
    letter-spacing: 0.025em;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  output {
    flex: 0 0 auto;
    font: 500 clamp(11px, 4.2cqmin, 24px)/1 "SFMono-Regular", Consolas,
      monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.04em;
  }
`;

const Trace = styled.svg`
  align-self: stretch;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: visible;
  color: #343431;
  pointer-events: none;

  &[data-trend="rising"] {
    color: #3f6652;
  }

  &[data-trend="falling"] {
    color: #8a5838;
  }

  line {
    stroke: #11110f;
    stroke-width: 0.7;
    stroke-dasharray: 1 2;
    opacity: 0.25;
    vector-effect: non-scaling-stroke;
  }

  path {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.35;
    vector-effect: non-scaling-stroke;
  }
`;

function GraphPanel({ reading }: { reading: CycleGraphReading }) {
  return (
    <Panel aria-label={`${reading.label} ${reading.display}`}>
      <Header>
        <h2>{reading.label}</h2>
        <output>{reading.display}</output>
      </Header>
      <Trace
        aria-label={`${reading.label} history`}
        data-trend={reading.trend}
        preserveAspectRatio="none"
        viewBox="0 0 100 60"
      >
        <line x1="0" x2="100" y1={reading.zeroY} y2={reading.zeroY} />
        <path d={reading.path} />
      </Trace>
    </Panel>
  );
}

export default function CycleGraphsScreen() {
  const [readings, setReadings] = useState(() =>
    presentCycleGraphs(createInitialCycleSnapshot()),
  );

  useCycleSocket({
    role: "screen",
    retainState: false,
    onState: (snapshot) => setReadings(presentCycleGraphs(snapshot)),
  });

  return (
    <Stage aria-label="Cycle economic network histories">
      {readings.map((reading) => (
        <GraphPanel key={reading.id} reading={reading} />
      ))}
    </Stage>
  );
}
