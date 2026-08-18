"use client";

import GradientShell from "../../surface/gradient-shell";
import ReadingPage from "../../reader";
import { useMeditationSession } from "../../session/use-meditation-session";
import { recordLocalMeditationHistory } from "../../main/local-history";
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

  function handleSessionComplete(
    outcome: "completed" | "flushed" | "left" | "backgrounded" | "idle",
  ) {
    recordLocalMeditationHistory(
      content.slug,
      outcome === "completed" || outcome === "flushed",
    );
    finishSession(outcome);
  }

  return (
    <GradientShell>
      <ReadingPage
        accumulationProfile={content.accumulationProfile}
        contentTitle={content.title}
        imagePath={content.imagePath}
        lines={content.lines}
        onSessionActivity={reportDirectInput}
        onSessionComplete={handleSessionComplete}
        onSessionPhaseChange={reportPhase}
        pausedAt={pausedAt}
        pausedDurationMs={pausedDurationMs}
        totalMs={content.durationMs}
      />
    </GradientShell>
  );
}
