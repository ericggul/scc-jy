"use client";

import { useState } from "react";
import styled from "styled-components";
import type { NetworkSystemScreenId } from "@/components/network-system/experiments";
import { createInitialMarkovSnapshot, screenNodeMap } from "./model";
import { useMarkovSocket } from "./use-markov-socket";
import { useMorphedMarkovState } from "./use-morphed-markov-state";

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #fff;
  color: #000;
`;

const WholeGrid = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
`;

const Pane = styled.section`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  font-variant-numeric: tabular-nums;
  isolation: isolate;
`;

const Fill = styled.div.attrs<{ $value: number }>(({ $value }) => ({
  style: { height: `${Math.min(Math.max($value, 0), 1) * 100}%` },
}))`
  position: absolute;
  inset: auto 0 0;
  background: #000;
  pointer-events: none;
`;

const Readout = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: end;
`;

const Value = styled.output`
  color: #fff;
  font-size: clamp(66px, 27vmin, 380px);
  font-weight: 600;
  line-height: 0.82;
  letter-spacing: -0.075em;
  mix-blend-mode: difference;
`;

const Change = styled.output<{ $delta: number }>`
  margin-top: clamp(12px, 2.4vmin, 28px);
  color: ${({ $delta }) => ($delta > 0 ? "#d43d31" : $delta < 0 ? "#2868b2" : "#77756f")};
  font: 600 clamp(13px, 2.4vmin, 30px) / 1 monospace;
`;

function signedPercent(delta: number) {
  if (Math.abs(delta) < 0.00005) return "0.00%";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta * 100).toFixed(2)}%`;
}

function ScreenPane({ screenId, value, delta }: { screenId: NetworkSystemScreenId; value: number; delta: number }) {
  return (
    <Pane aria-label={`Node ${screenId} value`}>
      <Fill $value={value} aria-hidden="true" />
      <Readout>
        <Value>{value.toFixed(3)}</Value>
        <Change $delta={delta}>{signedPercent(delta)}</Change>
      </Readout>
    </Pane>
  );
}

export function MarkovScreenExperience({ screenIds }: { screenIds: readonly NetworkSystemScreenId[] }) {
  const [fallback] = useState(() => createInitialMarkovSnapshot());
  const { state } = useMarkovSocket("screen");
  const { displayed, deltas } = useMorphedMarkovState(state ?? fallback);
  const isWhole = screenIds.length > 1;

  const renderPane = (screenId: NetworkSystemScreenId) => {
    const nodeId = screenNodeMap[screenId];
    return (
      <ScreenPane
        key={screenId}
        screenId={screenId}
        value={displayed.values[nodeId]}
        delta={deltas.values[nodeId]}
      />
    );
  };

  return (
    <Page>
      {isWhole ? <WholeGrid>{screenIds.map(renderPane)}</WholeGrid> : renderPane(screenIds[0] ?? "1")}
    </Page>
  );
}

export default function MarkovScreen({ screenId }: { screenId: NetworkSystemScreenId }) {
  return <MarkovScreenExperience screenIds={[screenId]} />;
}
