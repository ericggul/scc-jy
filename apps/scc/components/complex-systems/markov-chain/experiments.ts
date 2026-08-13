export const markovChainExperiments = [
  { slug: "1", label: "markov-chain/1" },
] as const;

export type MarkovChainExperimentSlug =
  (typeof markovChainExperiments)[number]["slug"];

export function isMarkovChainExperimentSlug(
  value: string,
): value is MarkovChainExperimentSlug {
  return markovChainExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
