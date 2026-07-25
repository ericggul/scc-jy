"use client";

import { CursorSwarm } from "../1";
import { GOLDFISHES_2D_TWO_SETTINGS } from "../../model";

export default function Goldfishes2DTwo() {
  return (
    <CursorSwarm
      cursorCount={1000}
      cursorScale={0.5}
      settings={GOLDFISHES_2D_TWO_SETTINGS}
    />
  );
}
