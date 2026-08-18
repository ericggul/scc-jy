"use client";

import { useEffect, useState } from "react";
import { useDdongMeongSocket } from "./transport/use-ddong-meong-socket";
import { getKoreanDayKey, useBrowserArchive } from "./archive/browser-archive";
import EntryQr from "./entry-qr";
import type {
  DdongMeongArchiveEntry,
  DdongMeongSession,
  DdongMeongSessionOutcome,
} from "../model/types";
import { displayMeditationContentTitle } from "../model/content-catalog";
import { getPausableElapsedMs } from "../model/session-timing";
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
  if (session.engagement === "paused") return "똥 끊김";
  if (session.engagement === "idle") return "똥멍 때리다 멈춤";
  if (session.phase === "arriving") return "자리 잡는 중";
  if (session.phase === "releasing") return "똥 나오는 중";
  if (session.phase === "overflowing") return "변기 넘치는 중";
  return "똥싸는 중";
}

function outcomeLabel(outcome: DdongMeongSessionOutcome) {
  if (outcome === "flushed") return "물 내리고 똥 다쌈";
  if (outcome === "left") return "똥 싸다 나감";
  if (outcome === "backgrounded") return "똥 끊김";
  if (outcome === "idle") return "똥멍 때리다 멈춤";
  if (outcome === "overflowed") return "변기 넘침";
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
      <p>
        {displayMeditationContentTitle(
          session.contentSlug,
          session.contentTitle,
        )}
      </p>
      <div className={styles.liveSessionMeta}>
        <time dateTime={new Date(session.startedAt).toISOString()}>
          {formatTime(session.startedAt)}에 앉음
        </time>
        <strong>{formatDuration(getPausableElapsedMs(session, now))}</strong>
      </div>
    </li>
  );
}

function ArchiveRow({ entry }: { entry: DdongMeongArchiveEntry }) {
  return (
    <li className={styles.archiveRow}>
      <div className={styles.archiveIdentity}>
        <strong>{entry.nickname}</strong>
        <span>
          {displayMeditationContentTitle(
            entry.contentSlug,
            entry.contentTitle,
          )}
        </span>
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

export default function DdongMeongScreen() {
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
        <div className={styles.liveHeading}>
          <div>
            <p>지금</p>
            <h2 id="live-title">똥싸는 사람</h2>
          </div>
          <strong>
            {activeSessions.length}
            <span>명</span>
          </strong>
        </div>

        {activeSessions.length > 0 ? (
          <ul className={styles.liveSessions}>
            {activeSessions.map((session) => (
              <LiveSession key={session.id} now={now} session={session} />
            ))}
          </ul>
        ) : (
          <p className={styles.emptyLive}>
            아직 아무도 없습니다.
            <br />
            먼저 들어가 앉아보세요.
          </p>
        )}

        <div className={styles.entryPoint}>
          <div className={styles.qrFrame}>
            <EntryQr />
          </div>
          <p>
            휴대폰으로 스캔해
            <br />
            똥멍에 들어오기
          </p>
        </div>
      </section>

      <aside className={styles.archive} aria-labelledby="archive-title">
        <div className={styles.archiveHeading}>
          <div>
            <span>오늘의 기록</span>
            <h2 id="archive-title">똥싼 사람들</h2>
          </div>
          <strong>{todayArchive.length}회</strong>
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
