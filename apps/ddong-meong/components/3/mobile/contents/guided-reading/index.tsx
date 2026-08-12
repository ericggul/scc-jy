import type { GuidedMeditationSlug } from "@/components/3/model/guided-meditations";
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

export function LettingGoMeditation() {
  return <GuidedReading slug="letting-go" />;
}

export function WaitingBodyMeditation() {
  return <GuidedReading slug="waiting-body" />;
}

export function DownwardBreathMeditation() {
  return <GuidedReading slug="downward-breath" />;
}

export function PrivateRoomMeditation() {
  return <GuidedReading slug="private-room" />;
}

export function LighterMomentMeditation() {
  return <GuidedReading slug="lighter-moment" />;
}
