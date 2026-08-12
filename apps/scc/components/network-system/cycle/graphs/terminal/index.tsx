"use client";

import { type FormEvent, useState } from "react";
import styled from "styled-components";
import {
  createInitialCycleSnapshot,
  type CycleNodeId,
} from "@/components/network-system/cycle/model";
import { useCycleSocket } from "@/components/network-system/cycle/transport";
import {
  presentCycleTerminalMetrics,
  type CycleTerminalMetric,
} from "./presenter";

const Terminal = styled.main`
  --orange: #f3a21b;
  --cream: #e8e5da;
  --cyan: #79cce8;
  --green: #60d394;
  --red: #ff6b61;
  --line: #41423d;
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  overflow: hidden;
  background: #050606;
  color: var(--cream);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
`;

const Chrome = styled.header`
  display: grid;
  grid-template-columns: auto auto minmax(240px, 1fr) auto;
  min-width: 0;
  min-height: 42px;
  border-bottom: 1px solid #5b5c56;
  background: #252724;
  font-size: clamp(9px, 0.85vw, 14px);
`;

const MenuButton = styled.button`
  padding: 0 16px;
  border: 0;
  background: #d7d5cc;
  color: #111;
  font-family: Arial, sans-serif;
  font-size: inherit;
  font-weight: 700;
  cursor: pointer;
`;

const LoadedSeries = styled.div`
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-right: 1px solid #5b5c56;
  color: #fff;
  font-weight: 700;
  white-space: nowrap;
`;

const CommandForm = styled.form`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-width: 0;
  align-items: center;

  label {
    padding: 0 11px;
    color: #b9bab4;
    font-family: Arial, sans-serif;
    white-space: nowrap;
  }

  input {
    height: 28px;
    min-width: 0;
    padding: 0 9px;
    border: 1px solid #70716a;
    outline: 0;
    background: #080909;
    color: #fff;
    font: inherit;
    text-transform: uppercase;
  }

  input:focus {
    border-color: var(--orange);
    box-shadow: inset 0 0 0 1px var(--orange);
  }

  button {
    height: 28px;
    margin: 0 9px 0 5px;
    padding: 0 11px;
    border: 0;
    background: #5fc883;
    color: #071009;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
`;

const Selection = styled.output`
  display: flex;
  min-width: 90px;
  align-items: center;
  justify-content: flex-end;
  padding: 0 13px;
  color: var(--orange);
  white-space: nowrap;
`;

const Ribbon = styled.div`
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  min-width: 0;
  border-bottom: 1px solid var(--line);
  background: #0e100f;
  font-size: clamp(7px, 0.72vw, 12px);
  font-variant-numeric: tabular-nums;

  span {
    min-width: 0;
    padding: 6px 7px;
    overflow: hidden;
    border-right: 1px solid #30322f;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span:last-child {
    border-right: 0;
  }

  b {
    color: var(--orange);
  }

  i {
    margin-left: 4px;
    font-style: normal;
  }

  i[data-trend="positive"] {
    color: var(--green);
  }

  i[data-trend="negative"] {
    color: var(--red);
  }
`;

const Toolbar = styled.div`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: clamp(12px, 2vw, 28px);
  min-height: 31px;
  padding: 0 12px;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
  background: #181a18;
  color: #e1e0d9;
  font-size: clamp(8px, 0.75vw, 12px);
  white-space: nowrap;

  b {
    margin-right: 5px;
    color: #a8aaa3;
    font-weight: 400;
  }

  span:last-child {
    margin-left: auto;
    overflow: hidden;
    color: var(--orange);
    text-overflow: ellipsis;
  }
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
`;

const MetricPanel = styled.button<{ $selected: boolean }>`
  container-type: size;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 0;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  border-top: 0;
  border-left: 0;
  background: #090a0a;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: ${({ $selected }) =>
    $selected ? "inset 0 0 0 2px var(--orange)" : "none"};

  &:nth-child(3n) {
    border-right: 0;
  }

  &:nth-last-child(-n + 3) {
    border-bottom: 0;
  }

  &:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: -2px;
  }
`;

const MetricHeading = styled.header`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 2cqw;
  padding: 1.5cqh 2.2cqw;
  background: #2b2d29;
  font-size: clamp(8px, 2.8cqmin, 12px);

  b {
    flex: 0 0 auto;
    padding: 2px 4px;
    background: var(--orange);
    color: #111;
  }

  span {
    overflow: hidden;
    color: #fff;
    font-family: Arial, sans-serif;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Quote = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 3cqw;
  padding: 1.8cqh 2.4cqw 0.8cqh;
  font-variant-numeric: tabular-nums;

  > div {
    white-space: nowrap;
  }

  strong {
    color: #fff;
    font-family: "Arial Narrow", Arial, sans-serif;
    font-size: clamp(15px, 4.8cqmin, 27px);
    letter-spacing: -0.025em;
  }

  small {
    margin-left: 0.9cqw;
    color: #9b9d96;
    font-size: clamp(8px, 2.5cqmin, 11px);
  }

  output {
    font-size: clamp(9px, 2.8cqmin, 13px);
  }

  output[data-trend="positive"] {
    color: var(--green);
  }

  output[data-trend="negative"] {
    color: var(--red);
  }

  output[data-trend="steady"] {
    color: #999b94;
  }
`;

const ChartArea = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  padding: 1cqh 2.2cqw 1.4cqh;
`;

const Chart = styled.svg`
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: visible;

  .grid {
    stroke: #343632;
    stroke-width: 0.7;
    stroke-dasharray: 1 2;
    vector-effect: non-scaling-stroke;
  }

  path {
    fill: none;
    stroke: var(--cyan);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.25;
    vector-effect: non-scaling-stroke;
  }

  circle {
    fill: var(--orange);
  }
`;

const Axis = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 7.5cqw;
  padding-left: 1.4cqw;
  color: #8c8e87;
  font-size: clamp(8px, 2.5cqmin, 11px);
  font-variant-numeric: tabular-nums;
  text-align: right;
`;

const Stats = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid #30322e;
  font-size: clamp(9px, 2.8cqmin, 12px);
  font-variant-numeric: tabular-nums;

  div {
    min-width: 0;
    padding: 1.8cqh 2.2cqw;
    border-right: 1px solid #30322e;
  }

  div:last-child {
    border-right: 0;
  }

  dt {
    color: #888a83;
  }

  dd {
    margin: 0.5cqh 0 0;
    overflow: hidden;
    color: #e8e7e0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

function Metric({
  metric,
  selected,
  onSelect,
}: {
  metric: CycleTerminalMetric;
  selected: boolean;
  onSelect: (id: CycleNodeId) => void;
}) {
  return (
    <MetricPanel
      type="button"
      aria-label={`${metric.label} ${metric.display}${metric.unit}`}
      aria-pressed={selected}
      $selected={selected}
      onClick={() => onSelect(metric.id)}
    >
      <MetricHeading>
        <b>{metric.code}</b>
        <span>{metric.label}</span>
      </MetricHeading>
      <Quote>
        <div>
          <strong>{metric.display}</strong>
          <small>{metric.unit}</small>
        </div>
        <output data-trend={metric.trend}>{metric.changeDisplay}</output>
      </Quote>
      <ChartArea>
        <Chart
          aria-label={`${metric.label} history`}
          preserveAspectRatio="none"
          viewBox="0 0 100 48"
        >
          {metric.ticks.map((tick) => (
            <line key={tick.id} className="grid" x1="0" x2="100" y1={tick.y} y2={tick.y} />
          ))}
          <path d={metric.path} />
          <circle cx="100" cy={metric.lastY} r="1.2" />
        </Chart>
        <Axis aria-hidden="true">
          {metric.ticks.map((tick) => <span key={tick.id}>{tick.display}</span>)}
        </Axis>
      </ChartArea>
      <Stats>
        <div><dt>1S CHG</dt><dd>{metric.changeDisplay}</dd></div>
        <div><dt>PERIOD HIGH</dt><dd>{metric.highDisplay}</dd></div>
        <div><dt>PERIOD LOW</dt><dd>{metric.lowDisplay}</dd></div>
      </Stats>
    </MetricPanel>
  );
}

export default function CycleTerminalGraphsScreen() {
  const [metrics, setMetrics] = useState(() =>
    presentCycleTerminalMetrics(createInitialCycleSnapshot()),
  );
  const [selectedId, setSelectedId] = useState<CycleNodeId | null>(null);
  const [command, setCommand] = useState("");

  useCycleSocket({
    role: "screen",
    retainState: false,
    onState: (snapshot) => setMetrics(presentCycleTerminalMetrics(snapshot)),
  });

  const selectedMetric = metrics.find(({ id }) => id === selectedId);

  const runCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = command.trim().toUpperCase().replace(/\s+/g, "");
    if (!query) return;
    const match = metrics.find(
      (metric) =>
        metric.code.replace(/\s+/g, "").includes(query) ||
        metric.label.replace(/\s+/g, "").includes(query),
    );
    if (match) setSelectedId(match.id);
    setCommand("");
  };

  return (
    <Terminal>
      <Chrome>
        <MenuButton type="button" onClick={() => setSelectedId(null)}>
          Menu
        </MenuButton>
        <LoadedSeries>CYCLE ECON</LoadedSeries>
        <CommandForm onSubmit={runCommand}>
          <label htmlFor="cycle-terminal-command">Command / Series</label>
          <input
            id="cycle-terminal-command"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="NFP YOY"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button type="submit">GO</button>
        </CommandForm>
        <Selection>{selectedMetric?.code ?? "9 SERIES"}</Selection>
      </Chrome>
      <Ribbon>
        {metrics.map((metric) => (
          <span key={metric.id}>
            <b>{metric.code}</b> {metric.display}
            <i data-trend={metric.trend}>{metric.changeDisplay}</i>
          </span>
        ))}
      </Ribbon>
      <Toolbar>
        <span><b>Range</b>19.2s</span>
        <span><b>Interval</b>200ms</span>
        <span><b>Type</b>Line</span>
        <span><b>Layout</b>3 × 3</span>
        <span>{selectedMetric?.label ?? "ALL ECONOMIC SERIES"}</span>
      </Toolbar>
      <MetricGrid>
        {metrics.map((metric) => (
          <Metric
            key={metric.id}
            metric={metric}
            selected={metric.id === selectedId}
            onSelect={setSelectedId}
          />
        ))}
      </MetricGrid>
    </Terminal>
  );
}
