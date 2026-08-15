"use client";

import MacosLyricMenuBar from "./macos-lyric-field";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";
import { useLyricCue } from "../timeline/use-lyric-cue";

export default function ParametricInterfaceThree({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <ParametricLyricField />
    </SongPlayback>
  );
}

function ParametricLyricField() {
  const { lyric, currentWord, activeWordPosition } = useLyricCue();

  return (
    <MacosLyricMenuBar
      centerRowWords={lyric}
      currentWord={currentWord}
      activeWordPosition={activeWordPosition}
      openActiveMenu
    />
  );
}
