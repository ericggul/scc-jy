import {
  createVideoCells,
  type VideoFieldExperiment,
} from "@/components/standalone/grid/model/field";
import { videoMedia } from "@/components/standalone/grid/model/media";

const mixedMedia = [
  videoMedia.dance67,
  videoMedia.facepalm,
  videoMedia.youtubePoop,
  videoMedia.catJump,
  videoMedia.catOnBed,
] as const;

const rateWave = [0.5, 0.67, 0.82, 1, 1.18, 1.35, 1.6, 2] as const;

export const gridOneExperiment = {
  slug: "1",
  label: "grid/1",
  columns: 16,
  rows: 5,
  gap: 0,
  background: "#000000",
  cells: createVideoCells({
    experiment: "grid-1",
    count: 80,
    media: mixedMedia,
    rates: rateWave,
    phaseStep: 0.127,
  }),
} as const satisfies VideoFieldExperiment;

export const gridExperiments = [
  { slug: "1", label: "grid/1" },
  { slug: "2", label: "grid/2" },
] as const;

export type GridExperimentSlug = (typeof gridExperiments)[number]["slug"];

export function isGridExperimentSlug(
  value: string,
): value is GridExperimentSlug {
  return gridExperiments.some(({ slug }) => slug === value);
}
