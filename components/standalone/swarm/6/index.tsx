"use client";

import { CursorSwarm } from "../4";
import { SWARM_FOUR_SETTINGS } from "../4/model";

export default function SwarmSix() {
  return (
    <CursorSwarm
      cursorCount={200}
      cursorScale={1}
      settings={SWARM_FOUR_SETTINGS}
      initialCollisionPrevention={false}
      initialGoldfish
      sideGoldfishView
      motionProfile="sideFish"
      controls={{
        minCursorCount: 50,
        maxCursorCount: 1000,
        cursorCountStep: 50,
      }}
    />
  );
}
