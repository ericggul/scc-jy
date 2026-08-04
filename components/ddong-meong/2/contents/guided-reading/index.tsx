"use client";

import { useState } from "react";
import {
  findGuidedMeditation,
  type GuidedMeditationSlug,
} from "../../model/guided-meditations";
import GradientShell from "../../surface/gradient-shell";
import ReadingPage from "../dummy/reading-page";

type GuidedReadingProps = {
  slug: GuidedMeditationSlug;
};

function GuidedReading({ slug }: GuidedReadingProps) {
  const [startedAt] = useState(() => Date.now());
  const meditation = findGuidedMeditation(slug);

  return (
    <GradientShell>
      <ReadingPage
        lines={meditation.lines}
        startedAt={startedAt}
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
