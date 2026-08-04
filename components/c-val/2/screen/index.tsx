"use client";

import { useState } from "react";
import styled from "styled-components";
import CValEmploymentScreen from "./employment";
import CValMarketScreen from "./market";
import CValMediaScreen from "./media";
import CValNewsScreen from "./news";
import { createInitialCValSnapshot, type CValSnapshot } from "@/components/c-val/2/model";
import { useCValSocket } from "@/components/c-val/2/transport";
import type { CValScreenId } from "@/components/c-val/experiments";

const Stage = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #11110f;
`;

const WholeGrid = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
`;

const Pane = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  container-type: size;
`;

function ScreenContent({ screenId, snapshot }: { screenId: CValScreenId; snapshot: CValSnapshot }) {
  if (screenId === "news") return <CValNewsScreen snapshot={snapshot} />;
  if (screenId === "media") return <CValMediaScreen snapshot={snapshot} />;
  if (screenId === "employment") return <CValEmploymentScreen snapshot={snapshot} />;
  return <CValMarketScreen snapshot={snapshot} />;
}

export function CValScreenExperience({ screenIds }: { screenIds: readonly CValScreenId[] }) {
  const [fallback] = useState(() => createInitialCValSnapshot());
  const { state } = useCValSocket({ role: "screen" });
  const snapshot = state ?? fallback;

  if (screenIds.length === 1) {
    return <Stage><Pane><ScreenContent screenId={screenIds[0]} snapshot={snapshot} /></Pane></Stage>;
  }

  return (
    <Stage>
      <WholeGrid>
        {screenIds.map((screenId) => (
          <Pane key={screenId}><ScreenContent screenId={screenId} snapshot={snapshot} /></Pane>
        ))}
      </WholeGrid>
    </Stage>
  );
}

export default function CValScreen({ screenId }: { screenId: CValScreenId }) {
  return <CValScreenExperience screenIds={[screenId]} />;
}
