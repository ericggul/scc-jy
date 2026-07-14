"use client";

import { useState } from "react";
import styled from "styled-components";
import {
  presentCycleVideoLayout,
  type CycleVideoLayout,
} from "@/components/network-system/cycle/growth";
import { createInitialCycleSnapshot, type CycleSnapshot } from "@/components/network-system/cycle/model";
import { CycleNodeWrapper } from "@/components/network-system/cycle/node-screen";
import { useCycleSocket } from "@/components/network-system/cycle/use-cycle-socket";
import CycleVideoGrid from "@/components/network-system/cycle/video-grid";
import type { CycleMediaScreenId, NetworkSystemScreenId } from "@/components/network-system/experiments";

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

const DesignCanvas = styled.div`
  position: absolute;
  inset: 0;
  container-name: network-system-screen;
  container-type: size;
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

function CycleNodeScreen({ screenId }: { screenId: NetworkSystemScreenId }) {
  const [snapshot, setSnapshot] = useState<CycleSnapshot>(() => createInitialCycleSnapshot());
  useCycleSocket({ role: "screen", onState: setSnapshot });
  return <Page><DesignCanvas><CycleNodeWrapper screenId={screenId} snapshot={snapshot} /></DesignCanvas></Page>;
}

export default function CycleScreen({ screenId }: { screenId: NetworkSystemScreenId | CycleMediaScreenId }) {
  if (screenId === "left" || screenId === "right") {
    return <CycleVideoScreenExperience sides={[screenId]} />;
  }
  return <CycleNodeScreen screenId={screenId} />;
}
