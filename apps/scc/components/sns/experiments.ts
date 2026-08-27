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
  { key: "youtube/3", category: "youtube", slug: "3", label: "sns/youtube/3" },
  { key: "youtube/4", category: "youtube", slug: "4", label: "sns/youtube/4" },
  { key: "youtube/5", category: "youtube", slug: "5", label: "sns/youtube/5" },
  { key: "youtube/6", category: "youtube", slug: "6", label: "sns/youtube/6" },
  { key: "linkedin/1", category: "linkedin", slug: "1", label: "sns/linkedin/1" },
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
