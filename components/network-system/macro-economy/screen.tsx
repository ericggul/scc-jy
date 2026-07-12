"use client";

import { useState } from "react";
import styled from "styled-components";
import { useNetworkSystemSocket } from "@/components/network-system/macro-economy/use-network-system-socket";
import {
  createInitialSystemSnapshot,
  screenInstitutionMap,
  type NetworkSystemSnapshot,
} from "@/components/network-system/macro-economy/model";
import { institutionWrapperRegistry } from "@/components/network-system/macro-economy/wrappers/registry";
import type { NetworkSystemScreenId } from "@/components/network-system/experiments";

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #050505;
`;

const SingleFrame = styled.div`
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
`;

const WholeStage = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  background: #050505;
`;

const Pane = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #050505;
`;

const DesignCanvas = styled.div<{ $scale: number }>`
  position: absolute;
  left: 0;
  top: 0;
  width: ${({ $scale }) => `${100 / $scale}%`};
  height: ${({ $scale }) => `${100 / $scale}%`};
  container-name: network-system-screen;
  container-type: size;
  transform: scale(${({ $scale }) => $scale});
  transform-origin: top left;
`;

function InstitutionPane({
  screenId,
  snapshot,
  renderScale,
}: {
  screenId: NetworkSystemScreenId;
  snapshot: NetworkSystemSnapshot;
  renderScale: number;
}) {
  const institutionId = screenInstitutionMap[screenId];
  const Wrapper = institutionWrapperRegistry[institutionId];
  const lastIntervention = snapshot.lastIntervention;
  const active =
    lastIntervention?.kind === "node-shock" &&
    lastIntervention.institutionId === institutionId &&
    snapshot.serverTime - lastIntervention.appliedAt < 700;

  return (
    <Pane>
      <DesignCanvas $scale={renderScale}>
        <Wrapper
          institutionId={institutionId}
          snapshot={snapshot}
          active={active}
        />
      </DesignCanvas>
    </Pane>
  );
}

export function NetworkSystemScreenExperience({
  screenIds,
}: {
  screenIds: readonly NetworkSystemScreenId[];
}) {
  const [snapshot, setSnapshot] = useState<NetworkSystemSnapshot>(() =>
    createInitialSystemSnapshot(),
  );

  useNetworkSystemSocket({
    experimentSlug: "macro-economy",
    role: "screen",
    onState: setSnapshot,
  });

  if (screenIds.length === 1) {
    return (
      <Page>
        <SingleFrame>
          <InstitutionPane
            renderScale={1}
            screenId={screenIds[0]}
            snapshot={snapshot}
          />
        </SingleFrame>
      </Page>
    );
  }

  return (
    <Page>
      <WholeStage>
        {screenIds.map((screenId) => (
          <InstitutionPane
            key={screenId}
            renderScale={0.5}
            screenId={screenId}
            snapshot={snapshot}
          />
        ))}
      </WholeStage>
    </Page>
  );
}

export default function NetworkSystemScreen({
  screenId,
}: {
  screenId: NetworkSystemScreenId;
}) {
  return <NetworkSystemScreenExperience screenIds={[screenId]} />;
}
