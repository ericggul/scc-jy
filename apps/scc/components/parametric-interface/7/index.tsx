import LectureNoteScreen from "./screen";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";

export default function ParametricInterfaceSeven({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <LectureNoteScreen />
    </SongPlayback>
  );
}
