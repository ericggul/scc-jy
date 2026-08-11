"use client";

import GradientShell from "../../surface/gradient-shell";
import ReadingPage from "../../reader";
import { useMeditationSession } from "../../session/use-meditation-session";
import type { MobileMeditationContent } from "../registry";

type MeditationContentExperienceProps = {
  content: MobileMeditationContent;
};

export default function MeditationContentExperience({
  content,
}: MeditationContentExperienceProps) {
  const {
    finishSession,
    pausedAt,
    pausedDurationMs,
    reportDirectInput,
    reportPhase,
  } = useMeditationSession(content);

  return (
    <GradientShell>
      <ReadingPage
        accumulationProfile={content.accumulationProfile}
        lines={content.lines}
        onSessionActivity={reportDirectInput}
        onSessionComplete={finishSession}
        onSessionPhaseChange={reportPhase}
        pausedAt={pausedAt}
        pausedDurationMs={pausedDurationMs}
        totalMs={content.durationMs}
      />
    </GradientShell>
  );
}
