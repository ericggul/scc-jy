"use client";

import { useState } from "react";
import styled from "styled-components";
import type { NetworkSystemScreenId } from "@/components/network-system/experiments";
import { PopulationGlyphField } from "./glyphs";
import { createInitialPopulationSnapshot, screenPopulationStateMap, type PopulationSnapshot, type PopulationStateId } from "./model";
import { usePopulationSocket } from "./use-population-socket";

const stateLabels: Record<PopulationStateId, string> = {
  juvenile: "미성년",
  single: "비혼 성인",
  partnered: "결합 성인",
  deceased: "사망 누계",
};

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #171714;
  color: #171714;
  font-family: "Apple SD Gothic Neo", Arial, sans-serif;
`;

const WholeGrid = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: #171714;
`;

const Pane = styled.section`
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  contain: strict;
  container-type: size;
  background: #f3f2ee;
  color: #171714;
`;

const Header = styled.div`
  position: absolute;
  top: clamp(10px, 2.4cqmin, 28px);
  left: clamp(12px, 2.6cqmin, 30px);
  z-index: 2;
  display: flex;
  gap: 9px;
  align-items: baseline;
  font-size: clamp(10px, 1.8cqmin, 16px);

  time {
    color: #74736d;
    font: 500 0.8em/1 "SFMono-Regular", Consolas, monospace;
  }
`;

const Count = styled.output`
  position: absolute;
  right: clamp(12px, 2.6cqmin, 30px);
  bottom: clamp(10px, 2.4cqmin, 28px);
  z-index: 2;
  display: grid;
  justify-items: end;
  font: 600 clamp(28px, 10cqmin, 104px)/0.8 "SFMono-Regular", Consolas, monospace;
  letter-spacing: -0.07em;

  small {
    margin-top: 10px;
    color: #74736d;
    font: 500 clamp(8px, 1.5cqmin, 13px)/1 "Apple SD Gothic Neo", Arial, sans-serif;
    letter-spacing: 0;
  }
`;

function PopulationPane({ screenId, snapshot }: { screenId: NetworkSystemScreenId; snapshot: PopulationSnapshot }) {
  const state = screenPopulationStateMap[screenId];
  const count = snapshot.counts[state];
  const cohorts = state === "deceased" ? undefined : snapshot.cohorts[state];
  return (
    <Pane aria-label={`${stateLabels[state]} ${Math.round(count)}명`}>
      <Header><strong>{stateLabels[state]}</strong><time>YEAR {String(snapshot.year).padStart(3, "0")}</time></Header>
      <PopulationGlyphField cohorts={cohorts} count={count} state={state} />
      <Count>{Math.max(0, Math.round(count)).toLocaleString("ko-KR")}<small>{state === "deceased" ? "누적" : "현재 인구"}</small></Count>
    </Pane>
  );
}

export function PopulationScreenExperience({ screenIds }: { screenIds: readonly NetworkSystemScreenId[] }) {
  const [fallback] = useState(() => createInitialPopulationSnapshot());
  const { state } = usePopulationSocket("screen");
  const snapshot = state ?? fallback;
  if (screenIds.length === 1) return <Page><PopulationPane screenId={screenIds[0]} snapshot={snapshot} /></Page>;
  return <Page><WholeGrid>{screenIds.map((screenId) => <PopulationPane key={screenId} screenId={screenId} snapshot={snapshot} />)}</WholeGrid></Page>;
}

export default function PopulationScreen({ screenId }: { screenId: NetworkSystemScreenId }) {
  return <PopulationScreenExperience screenIds={[screenId]} />;
}
