import {
  createVideoCells,
  type VideoFieldExperiment,
} from "@/components/standalone/videos/model/field";
import { videoMedia } from "@/components/standalone/videos/model/media";

const mixedMedia = [
  videoMedia.dance67,
  videoMedia.facepalm,
  videoMedia.youtubePoop,
  videoMedia.catJump,
  videoMedia.catOnBed,
] as const;

const rateWave = [0.5, 0.67, 0.82, 1, 1.18, 1.35, 1.6, 2] as const;

export const videoExperiments = [
  {
    slug: "1",
    label: "videos/1",
    columns: 16,
    rows: 5,
    gap: 0,
    background: "#000000",
    cells: createVideoCells({
      experiment: "videos-1",
      count: 80,
      media: mixedMedia,
      rates: rateWave,
      phaseStep: 0.127,
    }),
  },
] as const satisfies readonly VideoFieldExperiment[];

export type VideoExperimentSlug = (typeof videoExperiments)[number]["slug"];

export function isVideoExperimentSlug(
  value: string,
): value is VideoExperimentSlug {
  return videoExperiments.some(({ slug }) => slug === value);
}

export function getVideoExperiment(slug: VideoExperimentSlug) {
  return videoExperiments.find((experiment) => experiment.slug === slug)!;
}
