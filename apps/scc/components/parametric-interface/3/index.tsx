"use client";

import MacosMenuBarOne from "@/components/standalone/macos/1";
import { useLyricCue } from "../timeline/use-lyric-cue";

export default function ParametricInterfaceThree() {
  const { lyric, currentWord, activeWordPosition } = useLyricCue();
  const words = lyric.flatMap((line) => line.split(" "));

  return (
    <MacosMenuBarOne
      centerRowWords={words}
      currentWord={currentWord}
      activeWordPosition={activeWordPosition}
      openActiveMenu
    />
  );
}
