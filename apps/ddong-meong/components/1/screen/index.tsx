"use client";

import { useDdongMeongSocket } from "../transport/use-ddong-meong-socket";
import type {
  DdongMeongArchiveEntry,
  DdongMeongSession,
} from "../model/types";
import { ddongMeongSans } from "../design-system/fonts";
import theme from "../design-system/theme.module.css";
import styles from "./styles.module.css";

function formatDuration(durationMs: number) {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
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

function LiveMark({ session }: { session: DdongMeongSession }) {
  return (
    <li
      className={`${styles.liveMark} ${styles[session.phase]}`}
      aria-label={`${session.cycleCount + 1}번째 호흡 진행 중`}
    />
  );
}

function ArchiveRow({ entry }: { entry: DdongMeongArchiveEntry }) {
  return (
    <li className={styles.archiveRow}>
      <div>
        <strong>{formatDuration(entry.durationMs)}</strong>
        <span>{entry.cycleCount}번의 호흡</span>
      </div>
      <time dateTime={new Date(entry.endedAt).toISOString()}>
        {formatTime(entry.endedAt)}
      </time>
    </li>
  );
}

export default function DdongMeongOneScreen() {
  const { connected, snapshot } = useDdongMeongSocket("screen");
  const activeSessions = snapshot?.activeSessions ?? [];
  const archive = snapshot?.archive ?? [];

  return (
    <main
      className={`${ddongMeongSans.variable} ${theme.theme} ${styles.page}`}
      lang="ko"
    >
      <div className={styles.photoShade} />

      <header className={styles.header}>
        <h1>ddong-meong</h1>
        <p>
          {connected
            ? `${activeSessions.length}명이 지금 함께 앉아 있어요`
            : "전시 화면에 연결하는 중"}
        </p>
      </header>

      <section className={styles.live} aria-labelledby="live-title">
        <p>LIVE MEDITATION</p>
        <h2 id="live-title">
          잠시 앉아,
          <br />
          가볍게 비우는 시간.
        </h2>

        {activeSessions.length > 0 ? (
          <ul className={styles.liveMarks}>
            {activeSessions.map((session) => (
              <LiveMark key={session.id} session={session} />
            ))}
          </ul>
        ) : (
          <p className={styles.emptyLive}>
            모바일에서 명상을 시작하면
            <br />
            이곳에 조용히 나타납니다.
          </p>
        )}
      </section>

      <aside className={styles.archive} aria-labelledby="archive-title">
        <div className={styles.archiveHeading}>
          <div>
            <span>RECENT</span>
            <h2 id="archive-title">비운 기록</h2>
          </div>
          <strong>{archive.length}</strong>
        </div>

        {archive.length > 0 ? (
          <ol>
            {archive.slice(0, 12).map((entry) => (
              <ArchiveRow key={entry.id} entry={entry} />
            ))}
          </ol>
        ) : (
          <p className={styles.emptyArchive}>
            아직 끝난 명상이 없습니다.
          </p>
        )}
      </aside>
    </main>
  );
}
