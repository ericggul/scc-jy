export const snsExperiments = [
  { key: "feed/1", category: "feed", slug: "1", label: "sns/feed/1" },
  {
    key: "navigation/default",
    category: "navigation",
    slug: "default",
    label: "sns/navigation/default",
  },
  {
    key: "navigation/1",
    category: "navigation",
    slug: "1",
    label: "sns/navigation/1",
  },
  { key: "youtube/1", category: "youtube", slug: "1", label: "sns/youtube/1" },
  { key: "youtube/2", category: "youtube", slug: "2", label: "sns/youtube/2" },
] as const;

export type SnsExperiment = (typeof snsExperiments)[number];
export type SnsExperimentCategory = SnsExperiment["category"];
export type SnsExperimentKey = SnsExperiment["key"];

export function findSnsExperiment(category: string, slug: string) {
  return snsExperiments.find(
    (experiment) =>
      experiment.category === category && experiment.slug === slug,
  );
}
