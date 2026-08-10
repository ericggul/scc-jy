import { meditationContents, type MeditationContentSlug } from "../../model/content-catalog";
import { guidedMeditations } from "../../model/guided-meditations";
import { readingScript, type ReadingLine } from "../../model/reading-script";
import {
  baselineAccumulationProfile,
  guidedAccumulationProfiles,
  type AccumulationProfile,
} from "../background/profiles";

export type MobileMeditationContent = {
  accumulationProfile: AccumulationProfile;
  description: string;
  durationMs: number;
  lines: ReadingLine[];
  slug: MeditationContentSlug;
  title: string;
};

const dummyContent = meditationContents[0];

export const mobileMeditationContents = [
  {
    accumulationProfile: baselineAccumulationProfile,
    description: dummyContent.description,
    durationMs: dummyContent.durationSeconds * 1000,
    lines: readingScript,
    slug: dummyContent.slug,
    title: dummyContent.title,
  },
  ...guidedMeditations.map((meditation) => ({
    accumulationProfile: guidedAccumulationProfiles[meditation.slug],
    description: meditation.description,
    durationMs: meditation.durationSeconds * 1000,
    lines: meditation.lines,
    slug: meditation.slug,
    title: meditation.title,
  })),
] satisfies MobileMeditationContent[];

export function findMobileMeditationContent(slug: MeditationContentSlug) {
  return mobileMeditationContents.find((content) => content.slug === slug)!;
}
