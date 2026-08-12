"use client";

import { useState } from "react";
import styled from "styled-components";
import {
  CycleVideoGrid,
  presentCycleVideoLayout,
  type CycleVideoLayout,
} from "@/components/network-system/cycle/media";
import { createInitialCycleSnapshot } from "@/components/network-system/cycle/model";
import CycleEmploymentScreen from "@/components/network-system/cycle/employment";
import CycleEmploymentEmojiScreen from "@/components/network-system/cycle/employment/emoji";
import CycleGraphsScreen from "@/components/network-system/cycle/graphs";
import CycleTerminalGraphsScreen from "@/components/network-system/cycle/graphs/terminal";
import CycleNewsScreen from "@/components/network-system/cycle/news";
import { useCycleSocket } from "@/components/network-system/cycle/transport";
import type {
  CycleMediaScreenId,
  CycleEmploymentScreenId,
  CycleGraphScreenId,
  CycleNewsScreenId,
} from "@/components/network-system/experiments";

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
`;

const WholeStage = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  background: #000;
`;

const Pane = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

function VideoPane({ side, layout }: { side: CycleMediaScreenId; layout: CycleVideoLayout }) {
  const activeCount = side === "left" ? layout.leftCount : layout.rightCount;
  const dimension = side === "left" ? layout.leftDimension : layout.rightDimension;
  return <Pane><CycleVideoGrid side={side} activeCount={activeCount} dimension={dimension} /></Pane>;
}

export function CycleVideoScreenExperience({ sides }: { sides: readonly CycleMediaScreenId[] }) {
  const [layout, setLayout] = useState<CycleVideoLayout>(() =>
    presentCycleVideoLayout(createInitialCycleSnapshot()),
  );
  useCycleSocket({
    role: "screen",
    onState: (snapshot) => setLayout(presentCycleVideoLayout(snapshot)),
  });

  if (sides.length === 1) {
    return <Page><VideoPane side={sides[0]} layout={layout} /></Page>;
  }
  return <Page><WholeStage>{sides.map((side) => <VideoPane key={side} side={side} layout={layout} />)}</WholeStage></Page>;
}

export default function CycleScreen({
  screenId,
}: {
  screenId:
    | CycleNewsScreenId
    | CycleEmploymentScreenId
    | CycleGraphScreenId
    | CycleMediaScreenId;
}) {
  if (screenId === "news") {
    return <CycleNewsScreen />;
  }
  if (screenId === "employment") {
    return <CycleEmploymentScreen />;
  }
  if (screenId === "employment-2") {
    return <CycleEmploymentEmojiScreen />;
  }
  if (screenId === "graphs") {
    return <CycleGraphsScreen />;
  }
  if (screenId === "graphs-2") {
    return <CycleTerminalGraphsScreen />;
  }
  if (screenId === "left" || screenId === "right") {
    return <CycleVideoScreenExperience sides={[screenId]} />;
  }
}
