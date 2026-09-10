export const barabasiAlbertExperiments = [
  { slug: "1", label: "barabasi-albert / 1" },
] as const;

export type BarabasiAlbertExperimentSlug =
  (typeof barabasiAlbertExperiments)[number]["slug"];

export function isBarabasiAlbertExperimentSlug(
  value: string,
): value is BarabasiAlbertExperimentSlug {
  return barabasiAlbertExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
