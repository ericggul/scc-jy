"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CValSnapshot } from "@/components/c-val/1/model";
import { useCValCommentAudio } from "./audio";
import styles from "./comments.module.css";
import {
  cValCommentPlacement,
  cValCommentPlaybackRate,
  censorCValCommentText,
  presentCValCommentPulse,
  selectCValCommentPerformance,
  shouldAdmitCValComment,
  type CValCommentCorpus,
  type CValCommentCorpusEntry,
  type CValCommentDirection,
} from "./presenter";

const CORPUS_URL = "/audio/c-val/exclamations/comments-index.json";
const MAX_VISIBLE_COMMENTS = 24;

type VisibleComment = {
  id: string;
  runId: string;
  direction: CValCommentDirection;
  text: string;
  performance: CValCommentCorpusEntry;
};

type PlacementProperties = CSSProperties & {
  "--x": number;
  "--y": number;
  "--tilt": number;
  "--scale": number;
  "--age": number;
};

export default function CValCommentsScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const [corpus, setCorpus] = useState<CValCommentCorpus | null>(null);
  const [comments, setComments] = useState<VisibleComment[]>([]);
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
      admittedRef.current = { signature: null, time: 0 };
      sequenceRef.current = 0;
      return;
    }
    const pulse = presentCValCommentPulse(snapshot);
    if (!shouldAdmitCValComment(
      pulse,
      admittedRef.current.signature,
      admittedRef.current.time,
      snapshot.serverTime,
    ) || !pulse) return;

    const sequence = sequenceRef.current;
    const performance = selectCValCommentPerformance(corpus.entries, pulse, sequence);
    if (!performance) return;
    const comment = {
      id: `${snapshot.runId}:${snapshot.revision}:${performance.id}`,
      runId: snapshot.runId,
      direction: pulse.direction,
      text: censorCValCommentText(performance.text),
      performance,
    } satisfies VisibleComment;

    sequenceRef.current += 1;
    admittedRef.current = { signature: pulse.signature, time: snapshot.serverTime };
    setComments((current) => [
      comment,
      ...current.filter(({ runId }) => runId === snapshot.runId),
    ].slice(0, MAX_VISIBLE_COMMENTS));
    speak({
      entry: performance,
      beep: corpus.beep,
      playbackRate: cValCommentPlaybackRate(pulse),
    });
  }, [corpus, snapshot, speak]);

  const visibleComments = snapshot.phase === "active"
    ? comments.filter(({ runId }) => runId === snapshot.runId)
    : [];
  const current = visibleComments[0];

  return (
    <main className={styles.stage} aria-label="C-VAL market reaction comments">
      {current ? (
        <>
          <ol className={styles.trail} aria-hidden="true">
            {visibleComments.slice(1).map((comment, index) => {
              const age = index + 1;
              const placement = cValCommentPlacement(comment.id, age);
              const style = {
                "--x": placement.x,
                "--y": placement.y,
                "--tilt": placement.tilt,
                "--scale": placement.scale,
                "--age": age,
              } as PlacementProperties;
              return (
                <li
                  className={`${styles.trailComment} ${styles[comment.direction]}`}
                  key={comment.id}
                  style={style}
                >
                  {comment.text}
                </li>
              );
            })}
          </ol>
          <p
            className={`${styles.current} ${styles[current.direction]}`}
            key={current.id}
            aria-live="assertive"
          >
            {current.text}
          </p>
        </>
      ) : (
        <div className={styles.waiting} aria-hidden="true">···</div>
      )}
    </main>
  );
}
