import type { ParametricSong } from "../song";
import { u2YoureTheBestThingAboutMe } from "./u2-youre-the-best-thing-about-me";

export const parametricSongs = [u2YoureTheBestThingAboutMe] as const satisfies readonly ParametricSong[];

export const activeParametricSong = u2YoureTheBestThingAboutMe;

export function getParametricSong(id: string) {
  return parametricSongs.find((song) => song.id === id);
}
