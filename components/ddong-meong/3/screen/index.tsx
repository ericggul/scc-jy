"use client";

import { useEffect, useState } from "react";
import { useDdongMeongSocket } from "./transport/use-ddong-meong-socket";
import { getKoreanDayKey, useBrowserArchive } from "./archive/browser-archive";
import type {
  DdongMeongArchiveEntry,
  DdongMeongSession,
  DdongMeongSessionOutcome,
} from "../model/types";
import { ddongMeongSans } from "../design-system/fonts";
import InteractionLock from "../design-system/interaction-lock";
import theme from "../design-system/theme.module.css";
import styles from "./styles.module.css";

const emptyArchive: DdongMeongArchiveEntry[] = [];

function formatDuration(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function phaseLabel(session: DdongMeongSession) {
  if (session.engagement === "paused") return "똥 멈춤";
  if (session.engagement === "idle") return "똥멍 때리다 멈춤";
  if (session.phase === "arriving") return "자리 잡는 중";
  if (session.phase === "releasing") return "비우는 중";
  return "똥싸는 중";
}

function outcomeLabel(outcome: DdongMeongSessionOutcome) {
  if (outcome === "flushed") return "물 내리고 똥 다쌈";
  if (outcome === "left") return "똥 싸다 나감";
  if (outcome === "backgrounded") return "똥 멈춤";
  if (outcome === "idle") return "똥멍 때리다 멈춤";
  return "똥 다쌈";
}

function useClock() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function LiveSession({ now, session }: { now: number; session: DdongMeongSession }) {
  return (
    <li className={`${styles.liveSession} ${styles[session.phase]}`}>
      <div className={styles.liveSessionHead}>
        <strong>{session.nickname}</strong>
        <span>{phaseLabel(session)}</span>
      </div>
      <p>{session.contentTitle}</p>
      <div className={styles.liveSessionMeta}>
        <time dateTime={new Date(session.startedAt).toISOString()}>
          {formatTime(session.startedAt)}에 앉음
        </time>
        <strong>{formatDuration(now - session.startedAt)}</strong>
      </div>
    </li>
  );
}

function ArchiveRow({ entry }: { entry: DdongMeongArchiveEntry }) {
  return (
    <li className={styles.archiveRow}>
      <div className={styles.archiveIdentity}>
        <strong>{entry.nickname}</strong>
        <span>{entry.contentTitle}</span>
      </div>
      <div className={styles.archiveMeta}>
        <span>{formatDuration(entry.durationMs)}</span>
        <time dateTime={new Date(entry.endedAt).toISOString()}>
          {formatTime(entry.endedAt)} · {outcomeLabel(entry.outcome)}
        </time>
      </div>
    </li>
  );
}

export default function DdongMeongThreeScreen() {
  const { connected, snapshot } = useDdongMeongSocket("screen");
  const now = useClock();
  const activeSessions = snapshot?.activeSessions ?? [];
  const archive = useBrowserArchive(snapshot?.archive ?? emptyArchive);
  const todayArchive = archive.filter(
    (entry) => entry.dayKey === getKoreanDayKey(now),
  );
  const participantIds = new Set([
    ...todayArchive.map((entry) => entry.participantId),
    ...activeSessions.map((session) => session.participantId),
  ]);

  return (
    <main
      className={`${ddongMeongSans.variable} ${theme.theme} ${styles.page}`}
      lang="ko"
    >
      <InteractionLock />
      <header className={styles.header}>
        <h1>ddong-meong</h1>
        <p>
          {connected
            ? `오늘 ${participantIds.size}명 · ${todayArchive.length}회 비움`
            : "연결 중"}
        </p>
      </header>

      <section className={styles.live} aria-labelledby="live-title">
        <p className={styles.eyebrow}>NOW SITTING</p>
        <div className={styles.liveHeading}>
          <h2 id="live-title">지금 앉아 있는 사람</h2>
          <strong>{activeSessions.length}</strong>
        </div>

        {activeSessions.length > 0 ? (
          <ul className={styles.liveSessions}>
            {activeSessions.map((session) => (
              <LiveSession key={session.id} now={now} session={session} />
            ))}
          </ul>
        ) : (
          <p className={styles.emptyLive}>
            아직 조용합니다.
            <br />
            누군가 명상을 시작하면 이곳에 나타납니다.
          </p>
        )}
      </section>

      <aside className={styles.archive} aria-labelledby="archive-title">
        <div className={styles.archiveHeading}>
          <div>
            <span>오늘의 기록</span>
            <h2 id="archive-title">똥싼 사람들</h2>
          </div>
          <strong>{todayArchive.length}</strong>
        </div>

        {todayArchive.length > 0 ? (
          <ol>
            {todayArchive.map((entry) => (
              <ArchiveRow key={entry.id} entry={entry} />
            ))}
          </ol>
        ) : (
          <p className={styles.emptyArchive}>아직 오늘의 기록이 없습니다.</p>
        )}
      </aside>
    </main>
  );
}
