import TerminalLineScreen from "./screen";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";

export default function ParametricInterfaceSix({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <TerminalLineScreen />
    </SongPlayback>
  );
}
