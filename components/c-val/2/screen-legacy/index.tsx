"use client";

import { useState } from "react";
import styled from "styled-components";
import CValMediaScreen from "./media";
import CValNewsScreen from "./news";
import CValCasinoLegacyScreen from "./casino-legacy";
import CValRollercoasterLegacyScreen from "./rollercoaster-legacy";
import { createInitialCValSnapshot, type CValSnapshot } from "@/components/c-val/2/model";
import { useCValSocket } from "@/components/c-val/2/transport";
type CValTwoLegacyScreenId = "casino-legacy" | "rollercoaster-legacy" | "news" | "media";

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
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  grid-template-rows: repeat(2, minmax(0, 1fr));
`;

const Pane = styled.div<{ $screenId?: CValTwoLegacyScreenId }>`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  container-type: size;

  ${({ $screenId }) => $screenId === "rollercoaster-legacy" && "grid-row: 1 / span 2;"}
`;

function ScreenContent({ screenId, snapshot }: { screenId: CValTwoLegacyScreenId; snapshot: CValSnapshot }) {
  if (screenId === "casino-legacy") return <CValCasinoLegacyScreen snapshot={snapshot} />;
  if (screenId === "news") return <CValNewsScreen snapshot={snapshot} />;
  if (screenId === "media") return <CValMediaScreen snapshot={snapshot} />;
  if (screenId === "rollercoaster-legacy") {
    return <CValRollercoasterLegacyScreen snapshot={snapshot} />;
  }
  return null;
}

export function CValScreenExperience({ screenIds }: { screenIds: readonly CValTwoLegacyScreenId[] }) {
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
          <Pane key={screenId} $screenId={screenId}><ScreenContent screenId={screenId} snapshot={snapshot} /></Pane>
        ))}
      </WholeGrid>
    </Stage>
  );
}

export default function CValScreen({ screenId }: { screenId: CValTwoLegacyScreenId }) {
  return <CValScreenExperience screenIds={[screenId]} />;
}
