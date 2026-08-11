import type { MeditationContentSlug } from "../../model/content-catalog";
import { guidedMeditations } from "../../model/guided-meditations";
import type { ReadingLine } from "../../model/reading-script";
import {
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

export const mobileMeditationContents = guidedMeditations.map((meditation) => ({
  accumulationProfile: guidedAccumulationProfiles[meditation.slug],
  description: meditation.description,
  durationMs: meditation.durationSeconds * 1000,
  lines: meditation.lines,
  slug: meditation.slug,
  title: meditation.title,
})) satisfies MobileMeditationContent[];

export function findMobileMeditationContent(slug: MeditationContentSlug) {
  return mobileMeditationContents.find((content) => content.slug === slug)!;
}
