import type { MeditationContentSlug } from "../../model/content-catalog";
import MeditationContentExperience from "./experience";
import { findMobileMeditationContent } from "./registry";

type DdongMeongContentProps = {
  slug: MeditationContentSlug;
};

export default function DdongMeongContent({
  slug,
}: DdongMeongContentProps) {
  return (
    <MeditationContentExperience
      content={findMobileMeditationContent(slug)}
    />
  );
}
