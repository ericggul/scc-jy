import type { DdongMeongArchiveEntry } from "../../model/types";
import {
  formatDuration,
  getContentRankings,
  getParticipantRankings,
  getTotalDuration,
} from "../insights";
import styles from "../styles.module.css";

function PoopBar({ durationMs, maximumDurationMs }: { durationMs: number; maximumDurationMs: number }) {
  const count = Math.max(1, Math.round((durationMs / maximumDurationMs) * 12));

  return (
    <span aria-label={`${formatDuration(durationMs)} 동안 똥멍`} className={styles.poopBar}>
      <span aria-hidden="true">{"💩".repeat(count)}</span>
    </span>
  );
}

export default function RankingView({ archive }: { archive: DdongMeongArchiveEntry[] }) {
  const participantRankings = getParticipantRankings(archive).slice(0, 5);
  const contentRanking = getContentRankings(archive)[0];
  const totalDuration = getTotalDuration(archive);
  const maximumDurationMs = participantRankings[0]?.durationMs ?? 1;

  return (
    <section className={styles.screenView} aria-labelledby="ranking-title">
      <div className={styles.viewHeading}>
        <div>
          <p>누적 기록</p>
          <h2 id="ranking-title">똥멍 랭킹</h2>
        </div>
      </div>

      {participantRankings.length > 0 ? (
        <ol className={styles.rankingList}>
          {participantRankings.map((ranking, index) => (
            <li key={ranking.participantId}>
              <span className={styles.rankingPlace}>{index + 1}</span>
              <strong className={styles.rankingNickname}>{ranking.nickname}</strong>
              <PoopBar
                durationMs={ranking.durationMs}
                maximumDurationMs={maximumDurationMs}
              />
              <div className={styles.rankingMeta}>
                <b>{formatDuration(ranking.durationMs)}</b>
                <small>{ranking.sessions}회 비움</small>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyView}>누적 기록이 쌓이면 가장 오래, 가장 자주 선택된 똥멍이 보입니다.</p>
      )}

      <p className={styles.viewFootnote}>
        {contentRanking ? `가장 많이 고른 똥멍: ${contentRanking.title} · ${contentRanking.sessions}회` : ""}
        {contentRanking ? <br /> : null}
        지금까지 함께 멍때린 시간 {formatDuration(totalDuration)}
      </p>
    </section>
  );
}
