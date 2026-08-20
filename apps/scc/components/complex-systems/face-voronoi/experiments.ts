export const faceVoronoiExperiments = [
  { slug: "1", label: "face-voronoi/1" },
  { slug: "2", label: "face-voronoi/2" },
  { slug: "3", label: "face-voronoi/3" },
] as const;

export type FaceVoronoiExperimentSlug =
  (typeof faceVoronoiExperiments)[number]["slug"];

export function isFaceVoronoiExperimentSlug(
  value: string,
): value is FaceVoronoiExperimentSlug {
  return faceVoronoiExperiments.some((experiment) => experiment.slug === value);
}
