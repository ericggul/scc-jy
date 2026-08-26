"use client";

import { useEffect, useRef, useState } from "react";
import type { CValSnapshot } from "@/components/model";
import {
  C_VAL_COMMENT_VOICE_TRIGGER_PERCENT,
  cValCommentAudioMix,
  cValCommentVoiceGapMs,
  presentCValCommentPulse,
  shouldAdmitCValCommentVoice,
  type CValCommentCorpus,
  type CValCommentCorpusEntry,
  type CValCommentDirection,
} from "../../comments/presenter";
import {
  cValMediaCommentReactionAudioParameters,
  useCValMediaCommentReactionAudio,
} from "./audio";
import {
  censorCValMediaCommentReactionText,
  selectCValMediaCommentReaction,
} from "./presenter";
import styles from "./comment-reaction.module.css";

const CORPUS_URL = "/audio/c-val/exclamations/comments-index.json";

type CurrentComment = {
  id: string;
  runId: string;
  direction: CValCommentDirection;
  text: string;
  performance: CValCommentCorpusEntry;
  beep: CValCommentCorpus["beep"];
  playbackRate: number;
  detuneCents: number;
};

/**
 * A removable media-only layer: it preserves the media field while carrying
 * the legacy screen's newest reaction text. Its audio path is deliberately
 * shared with the current comments screen rather than duplicating it here.
 */
export default function CValMediaCommentReaction({
  snapshot,
}: {
  snapshot: CValSnapshot;
}) {
  const [corpus, setCorpus] = useState<CValCommentCorpus | null>(null);
  const [currentComment, setCurrentComment] =
    useState<CurrentComment | null>(null);
  const sequenceRef = useRef(0);
  const snapshotRef = useRef(snapshot);
  const runRef = useRef(snapshot.runId);
  const phaseRef = useRef(snapshot.phase);
  const lastVoiceAtRef = useRef(Number.NEGATIVE_INFINITY);
  const loadingCorpusRef = useRef(false);
  const corpusRetryAtRef = useRef(0);
  const mountedRef = useRef(false);
  const visibleCommentIdRef = useRef<string | null>(null);
  const spokenCommentIdRef = useRef<string | null>(null);
  const { prime, speak, stop } = useCValMediaCommentReactionAudio();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      visibleCommentIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    snapshotRef.current = snapshot;
    const marketJustStopped = phaseRef.current === "active"
      && snapshot.phase !== "active";
    if (runRef.current !== snapshot.runId || marketJustStopped) {
      runRef.current = snapshot.runId;
      sequenceRef.current = 0;
      lastVoiceAtRef.current = Number.NEGATIVE_INFINITY;
      visibleCommentIdRef.current = null;
      setCurrentComment(null);
      stop();
    }
    phaseRef.current = snapshot.phase;

    if (
      !corpus
      && !loadingCorpusRef.current
      && Date.now() >= corpusRetryAtRef.current
      && snapshot.phase === "active"
      && Math.abs(snapshot.market.oneSecondMovePercent)
        >= C_VAL_COMMENT_VOICE_TRIGGER_PERCENT - 1
    ) {
      loadingCorpusRef.current = true;
      void fetch(CORPUS_URL)
        .then((response) => {
          if (!response.ok) throw new Error("C-VAL comment corpus is unavailable");
          return response.json() as Promise<CValCommentCorpus>;
        })
        .then(setCorpus)
        .catch(() => {
          corpusRetryAtRef.current = Date.now() + 5_000;
        })
        .finally(() => {
          loadingCorpusRef.current = false;
        });
    }
  }, [corpus, snapshot, stop]);

  const voiceDirection = snapshot.market.oneSecondMovePercent >= 0 ? "up" : "down";
  const voiceWarmupActive = Math.abs(snapshot.market.oneSecondMovePercent)
    >= C_VAL_COMMENT_VOICE_TRIGGER_PERCENT;
  useEffect(() => {
    const current = snapshotRef.current;
    if (!corpus || current.phase !== "active") return;
    const pulse = presentCValCommentPulse(current);
    if (!pulse) return;
    const warmPerformances = Array.from(
      { length: 30 },
      (_, offset) => selectCValMediaCommentReaction(
        corpus.entries,
        pulse,
        sequenceRef.current + offset,
      ),
    ).filter((entry): entry is CValCommentCorpusEntry => entry !== null);
    prime([...new Map(warmPerformances.map((entry) => [entry.src, entry])).values()]);
  }, [corpus, prime, snapshot.phase, snapshot.runId, voiceDirection, voiceWarmupActive]);

  useEffect(() => {
    let timer: number | null = null;
    let disposed = false;

    const admit = () => {
      if (disposed) return;
      const current = snapshotRef.current;
      const pulse = presentCValCommentPulse(current);
      const voiceNow = globalThis.performance.now();
      if (
        corpus
        && pulse
        && shouldAdmitCValCommentVoice(pulse, lastVoiceAtRef.current, voiceNow)
      ) {
        const performance = selectCValMediaCommentReaction(
          corpus.entries,
          pulse,
          sequenceRef.current,
        );
        if (performance) {
          sequenceRef.current += 1;
          lastVoiceAtRef.current = voiceNow;
          const id = `${current.runId}:${current.revision}:${performance.id}`;
          const audio = cValMediaCommentReactionAudioParameters(pulse);
          visibleCommentIdRef.current = id;
          setCurrentComment({
            id,
            runId: current.runId,
            direction: pulse.direction,
            text: censorCValMediaCommentReactionText(performance.text),
            performance,
            beep: corpus.beep,
            ...audio,
          });
        }
      }

      timer = window.setTimeout(
        admit,
        corpus && pulse ? cValCommentVoiceGapMs(pulse) : 200,
      );
    };

    timer = window.setTimeout(admit, 0);
    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [corpus]);

  useEffect(() => {
    if (!currentComment || spokenCommentIdRef.current === currentComment.id) return;
    const commentId = currentComment.id;
    spokenCommentIdRef.current = commentId;
    speak({
      entry: currentComment.performance,
      beep: currentComment.beep,
      playbackRate: currentComment.playbackRate,
      detuneCents: currentComment.detuneCents,
      shouldPlay: () => (
        mountedRef.current && visibleCommentIdRef.current === commentId
      ),
      playbackPolicy: () => {
        const currentPulse = presentCValCommentPulse(snapshotRef.current);
        if (!currentPulse || currentPulse.direction !== currentComment.direction) {
          return null;
        }
        return cValCommentAudioMix(currentPulse);
      },
      onEnded: () => {
        if (!mountedRef.current) return;
        setCurrentComment((visible) => {
          if (visible?.id !== commentId) return visible;
          visibleCommentIdRef.current = null;
          return null;
        });
      },
    });
  }, [currentComment, speak]);

  const visibleComment =
    snapshot.phase === "active" && currentComment?.runId === snapshot.runId
      ? currentComment
      : null;

  if (!visibleComment) return null;

  return (
    <aside
      className={styles.layer}
      aria-label="Latest market reaction"
      aria-live="assertive"
    >
      <p
        className={`${styles.current} ${styles[visibleComment.direction]}`}
        key={visibleComment.id}
      >
        {visibleComment.text}
      </p>
    </aside>
  );
}
