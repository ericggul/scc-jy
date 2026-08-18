import type { DdongMeongArchiveEntry } from "../../model/types";
import { formatDuration, getBuildingUsage } from "../insights";
import styles from "../styles.module.css";

const buildingPositions: Record<string, { left: string; top: string }> = {
  N25: { left: "49.1%", top: "43.2%" },
  E11: { left: "47.8%", top: "61.5%" },
  W2: { left: "31.1%", top: "76.8%" },
};

export default function CampusMapView({ archive }: { archive: DdongMeongArchiveEntry[] }) {
  const usage = getBuildingUsage(archive);
  const markers = usage.flatMap((entry) => {
    const position = buildingPositions[entry.building];
    return position ? [{ ...entry, position }] : [];
  });

  return (
    <section className={styles.screenView} aria-labelledby="map-title">
      <div className={styles.viewHeading}>
        <div>
          <p>KAIST</p>
          <h2 id="map-title">똥멍 지도</h2>
        </div>
      </div>

      <div className={styles.campusMap}>
        <img
          alt="KAIST 캠퍼스 맵"
          className={styles.mapImage}
          src="/campus-map/kaist-campus-map.png"
        />
        {markers.map((entry) => (
          <div
            aria-label={`${entry.building} 똥멍 ${entry.sessions}회`}
            className={styles.poopMarker}
            key={entry.building}
            style={entry.position}
          >
            <span aria-hidden="true">💩</span>
            <strong>{entry.building}</strong>
            <b>{entry.sessions}</b>
          </div>
        ))}
      </div>

      {markers.length > 0 ? (
        <ul className={styles.mapUsage}>
          {markers.map((entry) => (
            <li key={entry.building}>
              <strong>{entry.building}</strong>
              <span>{entry.sessions}회 · {formatDuration(entry.durationMs)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyView}>위치가 연결된 QR로 시작한 똥멍이 이곳에 남습니다.</p>
      )}
    </section>
  );
}
