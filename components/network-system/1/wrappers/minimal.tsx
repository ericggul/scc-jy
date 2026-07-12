import {
  linePath,
  presentInstitution,
} from "@/components/network-system/1/presenter";
import type { InstitutionWrapperProps } from "@/components/network-system/1/wrappers/types";
import styles from "@/components/network-system/1/wrappers/wrappers.module.css";

export function MinimalInstitutionWrapper({
  institutionId,
  snapshot,
  active,
}: InstitutionWrapperProps) {
  const view = presentInstitution(institutionId, snapshot);
  const [primary, ...secondary] = view.readings;

  return (
    <section className={styles.wrapper} data-active={active}>
      <header className={styles.header}>
        <span>{view.code}</span>
        <h1>{view.title}</h1>
      </header>

      <div className={styles.primary}>
        <p>{primary.label}</p>
        <strong>{primary.display}</strong>
        <span data-trend={primary.trend}>
          {primary.trendDisplay} · {primary.changeDisplay}
        </span>
      </div>

      <svg
        aria-label={`${primary.label} history`}
        className={styles.trace}
        data-trend={primary.trend}
        preserveAspectRatio="none"
        viewBox="0 0 100 32"
      >
        <line x1="0" x2="100" y1="32" y2="32" />
        <path d={linePath(primary.history, primary.chartMaximum)} />
      </svg>

      <dl className={styles.parameters}>
        {secondary.map((reading) => (
          <div key={reading.id}>
            <dt>{reading.label}</dt>
            <dd>
              <strong>{reading.display}</strong>
              <span data-trend={reading.trend}>
                {reading.trendDisplay} · {reading.changeDisplay}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
