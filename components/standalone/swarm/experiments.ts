export const swarmExperiments = [
  { slug: "1", label: "swarm/1" },
  { slug: "2", label: "swarm/2" },
  { slug: "3", label: "swarm/3" },
  { slug: "4", label: "swarm/4" },
  { slug: "5", label: "swarm/5" },
] as const;

export type SwarmExperimentSlug = (typeof swarmExperiments)[number]["slug"];

export function isSwarmExperimentSlug(
  value: string,
): value is SwarmExperimentSlug {
  return swarmExperiments.some((experiment) => experiment.slug === value);
}
