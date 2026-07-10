export const snsExperiments = [
  { category: "feed", slug: "1", label: "sns/feed/1" },
  { category: "navigation", slug: "1", label: "sns/navigation/1" },
] as const;

export type SnsExperiment = (typeof snsExperiments)[number];
export type SnsExperimentCategory = SnsExperiment["category"];

type ExperimentKey<
  Experiment extends { category: string; slug: string },
> = Experiment extends unknown
  ? `${Experiment["category"]}/${Experiment["slug"]}`
  : never;

export type SnsExperimentKey = ExperimentKey<SnsExperiment>;

export function findSnsExperiment(category: string, slug: string) {
  return snsExperiments.find(
    (experiment) =>
      experiment.category === category && experiment.slug === slug,
  );
}
