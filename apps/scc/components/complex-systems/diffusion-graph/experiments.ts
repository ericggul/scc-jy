export const diffusionGraphExperiments = [
  { slug: "1", label: "diffusion-graph/1" },
] as const;

export type DiffusionGraphExperimentSlug =
  (typeof diffusionGraphExperiments)[number]["slug"];

export function isDiffusionGraphExperimentSlug(
  value: string,
): value is DiffusionGraphExperimentSlug {
  return diffusionGraphExperiments.some((experiment) => experiment.slug === value);
}
