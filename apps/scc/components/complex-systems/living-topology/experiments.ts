export const livingTopologyExperiments = [
  { slug: "1", label: "living-topology/1" },
  { slug: "2", label: "living-topology/2" },
  { slug: "3", label: "living-topology/3" },
  { slug: "4", label: "living-topology/4" },
  { slug: "5", label: "living-topology/5" },
  { slug: "6", label: "living-topology/6" },
  { slug: "8", label: "living-topology/8" },
] as const;

export type LivingTopologyExperimentSlug =
  (typeof livingTopologyExperiments)[number]["slug"];

export function isLivingTopologyExperimentSlug(
  value: string,
): value is LivingTopologyExperimentSlug {
  return livingTopologyExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
