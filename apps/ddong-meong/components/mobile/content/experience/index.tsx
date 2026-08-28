"use client";

import GradientShell from "../../surface/gradient-shell";
import ReadingPage from "../../reader";
import { useMeditationSession } from "../../session/use-meditation-session";
import { recordPersonalSession } from "../../personal-history";
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
    outcome: "completed" | "flushed" | "left" | "backgrounded" | "idle" | "overflowed",
    record: {
      durationMs: number;
      endedAt: number;
      interactionCount: number;
      startedAt: number;
    },
  ) {
    recordPersonalSession({
      ...record,
      contentSlug: content.slug,
      contentTitle: content.title,
      outcome,
    });
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
