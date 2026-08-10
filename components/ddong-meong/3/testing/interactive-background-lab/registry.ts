import {
  baselineAccumulationProfile,
  guidedAccumulationProfiles,
  type AccumulationProfile,
} from "../../mobile/background/profiles";

export type BackgroundExperiment = {
  label: string;
  profile: AccumulationProfile;
  slug: string;
};

export const backgroundExperiments = [
  {
    label: "original",
    profile: baselineAccumulationProfile,
    slug: "original",
  },
  {
    label: "viscous stream",
    profile: guidedAccumulationProfiles["letting-go"],
    slug: "viscous-stream",
  },
  {
    label: "solid form",
    profile: guidedAccumulationProfiles["waiting-body"],
    slug: "solid-form",
  },
  {
    label: "heavy column",
    profile: guidedAccumulationProfiles["downward-breath"],
    slug: "heavy-column",
  },
  {
    label: "drifting mist",
    profile: guidedAccumulationProfiles["private-room"],
    slug: "drifting-mist",
  },
  {
    label: "liquid burst",
    profile: guidedAccumulationProfiles["lighter-moment"],
    slug: "liquid-burst",
  },
] satisfies BackgroundExperiment[];

export function findBackgroundExperiment(slug: string) {
  return backgroundExperiments.find((experiment) => experiment.slug === slug);
}
