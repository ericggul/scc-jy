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
    label: "morning urgent",
    profile: guidedAccumulationProfiles["morning-urgent"],
    slug: "viscous-stream",
  },
  {
    label: "thick poop imagination",
    profile: guidedAccumulationProfiles["thick-poop-imagination"],
    slug: "solid-form",
  },
  {
    label: "emergency chill",
    profile: guidedAccumulationProfiles["emergency-chill"],
    slug: "heavy-column",
  },
  {
    label: "constipation dialogue",
    profile: guidedAccumulationProfiles["constipation-dialogue"],
    slug: "drifting-mist",
  },
  {
    label: "celebrity applause",
    profile: guidedAccumulationProfiles["celebrity-applause"],
    slug: "liquid-burst",
  },
] satisfies BackgroundExperiment[];

export function findBackgroundExperiment(slug: string) {
  return backgroundExperiments.find((experiment) => experiment.slug === slug);
}
