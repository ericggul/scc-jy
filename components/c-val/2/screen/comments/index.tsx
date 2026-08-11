"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { CValSnapshot } from "@/components/c-val/2/model";
import { useCValCommentAudio } from "./audio";
import { C_VAL_CHAT_ROOMS, type CValChatRoomId } from "./corpus";
import styles from "./comments.module.css";
import {
  C_VAL_COMMENT_ARCHIVE_PER_ROOM,
  C_VAL_COMMENT_VOICE_TRIGGER_PERCENT,
  cValCommentAdmissionIntervalMs,
  cValCommentPlaybackRate,
  cValVisibleChatRoomCount,
  censorCValCommentText,
  presentCValChatMessage,
  presentCValCommentPulse,
  selectCValCommentPerformance,
  shouldAdmitCValCommentVoice,
  type CValChatMessage,
  type CValCommentCorpus,
} from "./presenter";

const AUDIO_CORPUS_URL = "/audio/c-val/exclamations/comments-index.json";
const TIME_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

type RoomArchive = Record<CValChatRoomId, CValChatMessage[]>;

function emptyArchive(): RoomArchive {
  return C_VAL_CHAT_ROOMS.reduce((archive, room) => {
    archive[room.id] = [];
    return archive;
  }, {} as RoomArchive);
}

function signed(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function messageTime(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "--:--:--";
  return TIME_FORMATTER.format(timestamp);
}

function avatarLabel(author: string) {
  return author.replace(/[^가-힣A-Za-z0-9]/g, "").slice(0, 2) || "ㅇㅇ";
}

function useVisibleRoomCount() {
  const stageRef = useRef<HTMLElement | null>(null);
  const [roomCount, setRoomCount] = useState(C_VAL_CHAT_ROOMS.length);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observeWidth = (width: number) => {
      setRoomCount(cValVisibleChatRoomCount(width));
    };
    observeWidth(stage.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) observeWidth(entry.contentRect.width);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return { stageRef, roomCount };
}

function useCValParallelChat(snapshot: CValSnapshot, visibleRoomCount: number) {
  const [archive, setArchive] = useState<RoomArchive>(() => emptyArchive());
  const [audioCorpus, setAudioCorpus] = useState<CValCommentCorpus | null>(null);
  const snapshotRef = useRef(snapshot);
  const lastAdmittedMoveRef = useRef<number | null>(null);
  const archiveRef = useRef(archive);
  const sequenceRef = useRef(0);
  const runRef = useRef(snapshot.runId);
  const phaseRef = useRef(snapshot.phase);
  const lastVoiceAtRef = useRef(Number.NEGATIVE_INFINITY);
  const loadingAudioRef = useRef(false);
  const audioRetryAtRef = useRef(0);
  const visibleRoomCountRef = useRef(visibleRoomCount);
  const { speak } = useCValCommentAudio();

  useEffect(() => {
    visibleRoomCountRef.current = visibleRoomCount;
  }, [visibleRoomCount]);

  useEffect(() => {
    snapshotRef.current = snapshot;

    if (
      runRef.current !== snapshot.runId
      || (phaseRef.current === "active" && snapshot.phase === "waiting")
    ) {
      runRef.current = snapshot.runId;
      sequenceRef.current = 0;
      lastAdmittedMoveRef.current = null;
      lastVoiceAtRef.current = Number.NEGATIVE_INFINITY;
      archiveRef.current = emptyArchive();
      setArchive(archiveRef.current);
    }
    phaseRef.current = snapshot.phase;

    if (
      !audioCorpus
      && !loadingAudioRef.current
      && Date.now() >= audioRetryAtRef.current
      && snapshot.phase === "active"
      && Math.abs(snapshot.market.oneSecondMovePercent)
        >= C_VAL_COMMENT_VOICE_TRIGGER_PERCENT - 1
    ) {
      loadingAudioRef.current = true;
      void fetch(AUDIO_CORPUS_URL)
        .then((response) => {
          if (!response.ok) throw new Error("C-VAL voice corpus is unavailable");
          return response.json() as Promise<CValCommentCorpus>;
        })
        .then(setAudioCorpus)
        .catch(() => {
          audioRetryAtRef.current = Date.now() + 5_000;
        })
        .finally(() => {
          loadingAudioRef.current = false;
        });
    }
  }, [audioCorpus, snapshot]);

  useEffect(() => {
    let timer: number | null = null;
    let disposed = false;

    const admit = () => {
      if (disposed) return;
      const current = snapshotRef.current;
      if (current.phase !== "active") {
        timer = window.setTimeout(admit, 200);
        return;
      }

      const sequence = sequenceRef.current;
      const regimeMove = current.market.oneSecondMovePercent;
      let message = presentCValChatMessage({
        snapshot: current,
        previousMovePercent: lastAdmittedMoveRef.current,
        sequence,
        roomLimit: visibleRoomCountRef.current,
        previousRoomMessage: null,
      });

      if (message) {
        const roomMessages = archiveRef.current[message.roomId];
        message = presentCValChatMessage({
          snapshot: current,
          previousMovePercent: lastAdmittedMoveRef.current,
          sequence,
          roomLimit: visibleRoomCountRef.current,
          roomMessageCount: roomMessages.length,
          previousRoomMessage: roomMessages.at(-1) ?? null,
        });
      }

      if (message) {
        const pulse = presentCValCommentPulse(current);
        if (
          audioCorpus
          && shouldAdmitCValCommentVoice(pulse, lastVoiceAtRef.current, current.serverTime)
          && pulse
        ) {
          const performance = selectCValCommentPerformance(audioCorpus.entries, pulse, sequence);
          if (performance) {
            message = {
              ...message,
              corpusId: `voice:${performance.id}`,
              text: censorCValCommentText(performance.text),
              replyToAuthor: null,
            };
            lastVoiceAtRef.current = current.serverTime;
            speak({
              entry: performance,
              beep: audioCorpus.beep,
              playbackRate: cValCommentPlaybackRate(pulse),
            });
          }
        }

        const nextRoomMessages = [
          ...archiveRef.current[message.roomId],
          message,
        ].slice(-C_VAL_COMMENT_ARCHIVE_PER_ROOM);
        archiveRef.current = {
          ...archiveRef.current,
          [message.roomId]: nextRoomMessages,
        };
        lastAdmittedMoveRef.current = regimeMove;
        setArchive(archiveRef.current);
        sequenceRef.current += 1;
      }

      timer = window.setTimeout(
        admit,
        cValCommentAdmissionIntervalMs(regimeMove, sequenceRef.current),
      );
    };

    timer = window.setTimeout(admit, 0);
    return () => {
      disposed = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [audioCorpus, speak]);

  return archive;
}

const ChatThread = memo(function ChatThread({ messages }: { messages: CValChatMessage[] }) {
  return (
    <ol className={styles.thread}>
      {messages.map((message, index) => (
        <li
          className={styles.message}
          data-direction={message.direction}
          data-newest={index === messages.length - 1 ? "true" : undefined}
          key={message.id}
        >
          <span className={styles.avatar} aria-hidden="true">
            {avatarLabel(message.author)}
          </span>
          <div className={styles.messageBody}>
            <div className={styles.messageMeta}>
              <strong>{message.author}</strong>
              <time dateTime={new Date(message.occurredAt).toISOString()}>
                {messageTime(message.occurredAt)}
              </time>
            </div>
            <div className={styles.bubble}>
              {message.replyToAuthor && (
                <span className={styles.reply}>↳ {message.replyToAuthor}</span>
              )}
              <p>{message.text}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
});

export default function CValCommentsScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const { stageRef, roomCount } = useVisibleRoomCount();
  const archive = useCValParallelChat(snapshot, roomCount);
  const move = snapshot.phase === "active" ? snapshot.market.oneSecondMovePercent : 0;
  const direction = move > 0.005 ? "up" : move < -0.005 ? "down" : "neutral";

  return (
    <main ref={stageRef} className={styles.stage} aria-label="C-VAL 병렬 시장 대화 아카이브">
      <section className={styles.roomGrid} data-phase={snapshot.phase}>
        {C_VAL_CHAT_ROOMS.map((room) => {
          const messages = archive[room.id];
          return (
            <article className={styles.room} key={room.id} data-room={room.id}>
              <header className={styles.roomHeader}>
                <span className={styles.roomCode}>{room.shortLabel}</span>
                <h2>{room.label}</h2>
                <output className={styles.marketMove} data-direction={direction}>
                  {snapshot.phase === "active" ? signed(move) : "대기"}
                </output>
              </header>
              <ChatThread messages={messages} />
              {messages.length === 0 && (
                <div className={styles.empty} aria-hidden="true">
                  <span>메시지 기록 대기</span>
                  <i />
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
