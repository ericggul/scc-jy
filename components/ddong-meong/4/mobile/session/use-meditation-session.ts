"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  useDocumentPresence,
  useInteractionIdle,
} from "../disengagement";
import type {
  DdongMeongEngagementState,
  DdongMeongPhase,
  DdongMeongSessionOutcome,
} from "../../model/types";
import { useDdongMeongSocket } from "../../transport/use-ddong-meong-socket";

const nicknameStorageKey = "ddong-meong:4:nickname";
const participantStorageKey = "ddong-meong:4:participant";

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
  const {
    connected,
    completeSession,
    sendDisengagementBeacon,
    startSession,
    updateEngagement,
    updateSession,
  } = useDdongMeongSocket("mobile");
  const identityRef = useRef<{
    nickname: string;
    participantId: string;
  } | null>(null);
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);
  const [isStarted, setIsStarted] = useState(false);
  const pauseStartedAtRef = useRef<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedDurationMs, setPausedDurationMs] = useState(0);

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
    setIsStarted(true);
  }, [connected, content.slug, content.title, startSession]);

  const reportEngagement = useCallback(
    (engagement: DdongMeongEngagementState) => {
      if (!hasStartedRef.current || hasEndedRef.current) return;
      updateEngagement(engagement);
    },
    [updateEngagement],
  );

  const signalPresence = useCallback(
    (signal: "hidden" | "visible" | "leaving") => {
      const participantId = identityRef.current?.participantId;
      if (!participantId || hasEndedRef.current) return;
      sendDisengagementBeacon({ participantId, signal });
    },
    [sendDisengagementBeacon],
  );

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
      setIsStarted(false);
      completeSession(outcome);
    },
    [completeSession],
  );

  const reportVisible = useCallback(() => {
    if (!hasStartedRef.current || hasEndedRef.current) return;
    const startedPauseAt = pauseStartedAtRef.current;
    if (startedPauseAt !== null) {
      pauseStartedAtRef.current = null;
      setPausedAt(null);
      setPausedDurationMs(
        (durationMs) => durationMs + Math.max(0, Date.now() - startedPauseAt),
      );
    }
    reportEngagement("active");
    signalPresence("visible");
  }, [reportEngagement, signalPresence]);

  const reportHidden = useCallback(() => {
    if (!hasStartedRef.current || hasEndedRef.current) return;
    if (pauseStartedAtRef.current === null) {
      const now = Date.now();
      pauseStartedAtRef.current = now;
      setPausedAt(now);
    }
    reportEngagement("paused");
    signalPresence("hidden");
  }, [reportEngagement, signalPresence]);

  const reportLeaving = useCallback(() => {
    signalPresence("leaving");
    finishSession("left");
  }, [finishSession, signalPresence]);

  useDocumentPresence({
    enabled: isStarted,
    onHidden: reportHidden,
    onLeaving: reportLeaving,
    onVisible: reportVisible,
  });

  const reportDirectInput = useInteractionIdle({
    enabled: isStarted,
    onActive: () => reportEngagement("active"),
    onIdle: () => reportEngagement("idle"),
    paused: pausedAt !== null,
  });

  useLayoutEffect(
    () => () => {
      finishSession("left");
    },
    [finishSession],
  );

  return {
    finishSession,
    pausedAt,
    pausedDurationMs,
    reportDirectInput,
    reportPhase,
  };
}
