# Parametric Interface — modular song playback

`/parametric-interface/1` through `/6` and `/whole` use one `SongPlayback`
provider. The visible `PLAY` control is the only start action. After that
gesture, each interface reads the loaded audio element's `currentTime`; no
route uses a repeating wall-clock interval.

## Current candidate

- U2 — *You're the Best Thing About Me*
- audio: `public/audio/mp3/U2_-_You_re_The_Best_Thing_About_Me_(SkySound7.com).mp3`
- measured file duration: 225.776327 seconds
- lyrics: the original sentence text follows [U2's published lyric
  page](https://www.u2.com/music/lyrics/610)
- every displayed word has an absolute millisecond onset in
  `components/parametric-interface/model/songs/u2-youre-the-best-thing-about-me.ts`.
  The line starts were checked against the matching synchronized lyric record,
  then word onsets were extracted from this supplied audio file.

## Adding or switching a song

Create a `ParametricSong` using the `line(startMs, endMs, text, wordStartMs)`
helper. Supply the actual audio path, measured duration, original lyric
sentences, and one timestamp for every word. Register the candidate in
`model/songs/index.ts`; set it as `activeParametricSong`, or pass it as the
optional `song` prop to any interface or `whole`.

The player, current-word hook, all sentence hosts, and `whole` then consume
that candidate directly. No interface may retain a song-specific lyric array
or a synthetic duration after the switch.
