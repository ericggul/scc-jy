"use client";

import { CursorSwarm } from "../4";
import { SWARM_FIVE_SETTINGS } from "../4/model";

export default function SwarmFive() {
  return (
    <CursorSwarm
      cursorCount={1000}
      cursorScale={0.5}
      settings={SWARM_FIVE_SETTINGS}
    />
  );
}
