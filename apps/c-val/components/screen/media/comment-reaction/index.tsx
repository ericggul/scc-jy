"use client";

import { useEffect, useRef, useState } from "react";
import type { CValSnapshot } from "@/components/model";
import {
  cValCommentPlaybackRate,
  censorCValCommentText,
  presentCValCommentPulse,
  selectCValCommentPerformance,
  shouldAdmitCValComment,
  type CValCommentCorpus,
  type CValCommentDirection,
} from "../../comments-legacy/presenter";
import { useCValCommentAudio } from "../../comments-legacy/audio";
import styles from "./comment-reaction.module.css";

const CORPUS_URL = "/audio/c-val/exclamations/comments-index.json";

type CurrentComment = {
  id: string;
  runId: string;
  direction: CValCommentDirection;
  text: string;
};

/**
 * A removable media-only layer. It keeps the media field and its single-line
 * treatment, while sharing comments-legacy's admission and audio behavior.
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
  const admittedRef = useRef({ signature: null as string | null, time: 0 });
  const { speak } = useCValCommentAudio();

  useEffect(() => {
    let disposed = false;
    void fetch(CORPUS_URL)
      .then((response) => {
        if (!response.ok) throw new Error("C-VAL comment corpus is unavailable");
        return response.json() as Promise<CValCommentCorpus>;
      })
      .then((nextCorpus) => {
        if (!disposed) setCorpus(nextCorpus);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!corpus) return;
    if (snapshot.phase === "waiting") {
      sequenceRef.current = 0;
      admittedRef.current = { signature: null, time: 0 };
      setCurrentComment(null);
      return;
    }
    if (snapshot.phase !== "active") {
      setCurrentComment(null);
      return;
    }
    const pulse = presentCValCommentPulse(snapshot);
    if (!shouldAdmitCValComment(
      pulse,
      admittedRef.current.signature,
      admittedRef.current.time,
      snapshot.serverTime,
    ) || !pulse) return;

    const performance = selectCValCommentPerformance(
      corpus.entries,
      pulse,
      sequenceRef.current,
    );
    if (!performance) return;

    sequenceRef.current += 1;
    admittedRef.current = { signature: pulse.signature, time: snapshot.serverTime };
    setCurrentComment({
      id: `${snapshot.runId}:${snapshot.revision}:${performance.id}`,
      runId: snapshot.runId,
      direction: pulse.direction,
      text: censorCValCommentText(performance.text),
    });
    speak({
      entry: performance,
      beep: corpus.beep,
      playbackRate: cValCommentPlaybackRate(pulse),
    });
  }, [corpus, snapshot, speak]);

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
