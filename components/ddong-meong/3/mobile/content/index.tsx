import type { MeditationContentSlug } from "../../model/content-catalog";
import MeditationContentExperience from "./experience";
import { findMobileMeditationContent } from "./registry";

type DdongMeongThreeContentProps = {
  slug: MeditationContentSlug;
};

export default function DdongMeongThreeContent({
  slug,
}: DdongMeongThreeContentProps) {
  return (
    <MeditationContentExperience
      content={findMobileMeditationContent(slug)}
    />
  );
}
