"use client";

import { useState } from "react";
import styled from "styled-components";
import CValMediaScreen from "./media";
import CValNewsScreen from "./news";
import CValCasinoScreen from "./casino";
import CValCommentsScreen from "./comments";
import CValCommentsLegacyScreen from "./comments-legacy";
import CValRollercoasterScreen from "./rollercoaster";
import { createInitialCValSnapshot, type CValSnapshot } from "@/components/1/model";
import { useCValSocket } from "@/components/1/transport";
import type { CValOneScreenId } from "@/components/experiments";

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

const Pane = styled.div<{ $screenId?: CValOneScreenId }>`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  container-type: size;

  ${({ $screenId }) => $screenId === "rollercoaster" && "grid-row: 1 / span 2;"}
`;

function ScreenContent({ screenId, snapshot }: { screenId: CValOneScreenId; snapshot: CValSnapshot }) {
  if (screenId === "casino") return <CValCasinoScreen snapshot={snapshot} />;
  if (screenId === "comments") return <CValCommentsScreen snapshot={snapshot} />;
  if (screenId === "comments-legacy") return <CValCommentsLegacyScreen snapshot={snapshot} />;
  if (screenId === "news") return <CValNewsScreen snapshot={snapshot} />;
  if (screenId === "media") return <CValMediaScreen snapshot={snapshot} />;
  return <CValRollercoasterScreen snapshot={snapshot} />;
}

export function CValScreenExperience({ screenIds }: { screenIds: readonly CValOneScreenId[] }) {
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

export default function CValScreen({ screenId }: { screenId: CValOneScreenId }) {
  return <CValScreenExperience screenIds={[screenId]} />;
}
