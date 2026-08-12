import {
  findGuidedMeditation,
  type GuidedMeditationSlug,
} from "@/components/3/model/guided-meditations";
import GradientShell from "../../surface/gradient-shell";
import { guidedAccumulationProfiles } from "../dummy/organic-liquid-background/profiles";
import ReadingPage from "../dummy/reading-page";

type GuidedReadingProps = {
  slug: GuidedMeditationSlug;
};

function GuidedReading({ slug }: GuidedReadingProps) {
  const meditation = findGuidedMeditation(slug);

  return (
    <GradientShell>
      <ReadingPage
        accumulationProfile={guidedAccumulationProfiles[slug]}
        lines={meditation.lines}
        totalMs={meditation.durationSeconds * 1000}
      />
    </GradientShell>
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
