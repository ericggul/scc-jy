export const videoPlayerExperiments = [
  { slug: "1", label: "video-player/1" },
] as const;

export type VideoPlayerExperimentSlug =
  (typeof videoPlayerExperiments)[number]["slug"];

export function isVideoPlayerExperimentSlug(
  value: string,
): value is VideoPlayerExperimentSlug {
  return videoPlayerExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
