import type { AccumulationProfile } from "../../mobile/background/profiles";
import { mobileMeditationContents } from "../../mobile/content/registry";

export type BackgroundExperiment = {
  durationMs: number;
  label: string;
  profile: AccumulationProfile;
  slug: string;
};

export const backgroundExperiments = mobileMeditationContents.map(
  ({ accumulationProfile: profile, durationMs, slug, title }) => ({
    durationMs,
    label: title,
    profile,
    slug,
  }),
) satisfies BackgroundExperiment[];

export function findBackgroundExperiment(slug: string) {
  return backgroundExperiments.find((experiment) => experiment.slug === slug);
}
