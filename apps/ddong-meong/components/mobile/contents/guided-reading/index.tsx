import type { GuidedMeditationSlug } from "@/components/model/guided-meditations";
import MeditationContentExperience from "../../content/experience";
import { findMobileMeditationContent } from "../../content/registry";

type GuidedReadingProps = {
  slug: GuidedMeditationSlug;
};

function GuidedReading({ slug }: GuidedReadingProps) {
  return (
    <MeditationContentExperience
      content={findMobileMeditationContent(slug)}
    />
  );
}

export function MorningUrgentMeditation() {
  return <GuidedReading slug="morning-urgent" />;
}

export function EmergencyChillMeditation() {
  return <GuidedReading slug="emergency-chill" />;
}

export function CelebrityApplauseMeditation() {
  return <GuidedReading slug="celebrity-applause" />;
}

export function ThickPoopImaginationMeditation() {
  return <GuidedReading slug="thick-poop-imagination" />;
}

export function ConstipationDialogueMeditation() {
  return <GuidedReading slug="constipation-dialogue" />;
}

export function DogPoopRemedyMeditation() {
  return <GuidedReading slug="dog-poop-remedy" />;
}

export function BeforeAfterPoopMeditation() {
  return <GuidedReading slug="before-after-poop" />;
}

export function MuddyDogHuskMeditation() {
  return <GuidedReading slug="muddy-dog-husk" />;
}
