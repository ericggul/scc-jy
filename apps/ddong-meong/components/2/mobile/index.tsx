"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GradientShell from "../surface/gradient-shell";
import IntroFlow from "./intro-flow";

const splashDurationMs = 3000;
const nicknameExitDurationMs = 420;

type Stage = "splash" | "nickname" | "nickname-exit";

export default function DdongMeongTwoMobile() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("splash");
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setStage("nickname");
    }, splashDurationMs);

    return () => window.clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (stage !== "nickname-exit") return;

    const exitTimer = window.setTimeout(() => {
      router.push("/2/main");
    }, nicknameExitDurationMs);

    return () => window.clearTimeout(exitTimer);
  }, [router, stage]);

  function continueToMain() {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) return;
    window.sessionStorage.setItem(
      "ddong-meong:2:nickname",
      trimmedNickname,
    );
    setNickname(trimmedNickname);
    setStage("nickname-exit");
  }

  return (
    <GradientShell>
      <IntroFlow
        stage={stage}
        nickname={nickname}
        onNicknameChange={setNickname}
        onContinue={continueToMain}
      />
    </GradientShell>
  );
}
