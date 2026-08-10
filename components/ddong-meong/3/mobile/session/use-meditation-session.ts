"use client";

import { useCallback, useEffect, useRef } from "react";
import type {
  DdongMeongPhase,
  DdongMeongSessionOutcome,
} from "../../model/types";
import { useDdongMeongSocket } from "../../transport/use-ddong-meong-socket";

const nicknameStorageKey = "ddong-meong:3:nickname";
const participantStorageKey = "ddong-meong:3:participant";

type MeditationSessionContent = {
  slug: string;
  title: string;
};

function readNickname() {
  const nickname = window.sessionStorage.getItem(nicknameStorageKey)?.trim();
  return nickname?.slice(0, 16) || "이름 없는 사람";
}

function getParticipantId() {
  const storedId = window.sessionStorage.getItem(participantStorageKey);
  if (storedId) return storedId;

  const participantId = crypto.randomUUID();
  window.sessionStorage.setItem(participantStorageKey, participantId);
  return participantId;
}

export function useMeditationSession(content: MeditationSessionContent) {
  const { connected, completeSession, startSession, updateSession } =
    useDdongMeongSocket("mobile");
  const identityRef = useRef<{
    nickname: string;
    participantId: string;
  } | null>(null);
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);

  useEffect(() => {
    if (!connected || hasStartedRef.current || hasEndedRef.current) return;

    const identity =
      identityRef.current ?? {
        nickname: readNickname(),
        participantId: getParticipantId(),
      };
    identityRef.current = identity;
    startSession({
      ...identity,
      contentSlug: content.slug,
      contentTitle: content.title,
    });
    hasStartedRef.current = true;
  }, [connected, content.slug, content.title, startSession]);

  const reportPhase = useCallback(
    (
      phase: Exclude<DdongMeongPhase, "complete">,
      interactionCount: number,
    ) => {
      if (!hasStartedRef.current || hasEndedRef.current) return;
      updateSession(phase, interactionCount);
    },
    [updateSession],
  );

  const finishSession = useCallback(
    (outcome: DdongMeongSessionOutcome) => {
      if (!hasStartedRef.current || hasEndedRef.current) return;
      hasEndedRef.current = true;
      completeSession(outcome);
    },
    [completeSession],
  );

  useEffect(
    () => () => {
      finishSession("left");
    },
    [finishSession],
  );

  return {
    finishSession,
    reportPhase,
  };
}
