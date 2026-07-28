"use client";

import { useEffect, useState } from "react";
import { readingScript } from "../model/reading-script";
import GradientShell from "./gradient-shell";
import IntroFlow from "./intro-flow";
import ReadingPage from "./reading-page";

const splashDurationMs = 3000;
const nicknameExitDurationMs = 420;
const readingDurationMs = 4 * 60 * 1000 + 33 * 1000;

type Stage = "splash" | "nickname" | "nickname-exit" | "reading";

export default function DdongDitationTwoMobile() {
  const [stage, setStage] = useState<Stage>("splash");
  const [nickname, setNickname] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setStage("nickname");
    }, splashDurationMs);

    return () => window.clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (stage !== "nickname-exit") return;

    const exitTimer = window.setTimeout(() => {
      setStartedAt(Date.now());
      setStage("reading");
    }, nicknameExitDurationMs);

    return () => window.clearTimeout(exitTimer);
  }, [stage]);

  function continueToReading() {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) return;
    setNickname(trimmedNickname);
    setStage("nickname-exit");
  }

  return (
    <GradientShell>
      {stage !== "reading" ? (
        <IntroFlow
          stage={stage}
          nickname={nickname}
          onNicknameChange={setNickname}
          onContinue={continueToReading}
        />
      ) : startedAt !== null ? (
        <ReadingPage
          lines={readingScript}
          startedAt={startedAt}
          totalMs={readingDurationMs}
        />
      ) : (
        null
      )}
    </GradientShell>
  );
}
