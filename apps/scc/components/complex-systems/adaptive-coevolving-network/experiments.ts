export const adaptiveCoevolvingNetworkExperiments = [
  { slug: "1", label: "bounded confidence" },
  { slug: "human-relations", label: "human relations" },
  { slug: "p2p", label: "P2P network" },
  { slug: "polling-ecology", label: "polling ecology" },
] as const;

export type AdaptiveCoevolvingNetworkExperimentSlug =
  (typeof adaptiveCoevolvingNetworkExperiments)[number]["slug"];

export function isAdaptiveCoevolvingNetworkExperimentSlug(
  value: string,
): value is AdaptiveCoevolvingNetworkExperimentSlug {
  return adaptiveCoevolvingNetworkExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
