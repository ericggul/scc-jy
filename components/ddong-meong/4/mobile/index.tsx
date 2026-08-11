"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { DdongMeongEntryContext } from "../model/entry-context";
import { storeDdongMeongEntryContext } from "./entry-context";
import {
  markDdongMeongEntry,
  readSavedNickname,
  saveNickname,
} from "./identity";
import GradientShell from "./surface/gradient-shell";
import IntroFlow from "./intro-flow";

const splashDurationMs = 3000;
const nicknameExitDurationMs = 420;
const emptyEntryContext: DdongMeongEntryContext = {};

function subscribeToBrowserSnapshot() {
  return () => undefined;
}

function getBrowserReadySnapshot() {
  return true;
}

function getServerReadySnapshot() {
  return false;
}

type Stage = "splash" | "nickname" | "nickname-exit" | "returning-exit";

type DdongMeongFourMobileProps = {
  entryContext?: DdongMeongEntryContext;
};

export default function DdongMeongFourMobile({
  entryContext = emptyEntryContext,
}: DdongMeongFourMobileProps) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("splash");
  const [nickname, setNickname] = useState("");
  const savedNickname = useSyncExternalStore(
    subscribeToBrowserSnapshot,
    readSavedNickname,
    () => undefined,
  );
  const browserReady = useSyncExternalStore(
    subscribeToBrowserSnapshot,
    getBrowserReadySnapshot,
    getServerReadySnapshot,
  );
  const isReturning = Boolean(savedNickname);

  useEffect(() => {
    storeDdongMeongEntryContext(entryContext);
  }, [entryContext]);

  useEffect(() => {
    if (!browserReady) return;

    const splashTimer = window.setTimeout(() => {
      if (isReturning) {
        markDdongMeongEntry("returning");
        setStage("returning-exit");
      } else {
        setStage("nickname");
      }
    }, splashDurationMs);

    return () => window.clearTimeout(splashTimer);
  }, [browserReady, isReturning]);

  useEffect(() => {
    if (stage !== "nickname-exit" && stage !== "returning-exit") return;

    const exitTimer = window.setTimeout(() => {
      router.push("/ddong-meong/4/main");
    }, nicknameExitDurationMs);

    return () => window.clearTimeout(exitTimer);
  }, [router, stage]);

  function continueToMain() {
    const savedNickname = saveNickname(nickname);
    if (!savedNickname) return;
    setNickname(savedNickname);
    markDdongMeongEntry("first-visit");
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
