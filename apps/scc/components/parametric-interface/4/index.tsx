import FlightInformationAtlas from "./screen";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";

export default function ParametricInterfaceFour({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <FlightInformationAtlas />
    </SongPlayback>
  );
}
