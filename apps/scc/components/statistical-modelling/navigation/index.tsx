import Link from "next/link";
import type { StatisticalModellingExperiment } from "./model";
import styles from "./navigation.module.css";

export default function StatisticalModellingNavigation({
  experiments,
}: Readonly<{
  experiments: readonly StatisticalModellingExperiment[];
}>) {
  return (
    <main className={styles.page}>
      <h1>statistical modelling</h1>
      <nav aria-label="Statistical modelling experiments" className={styles.routes}>
        {experiments.map((experiment) => (
          <Link
            key={experiment.id}
            className={styles.route}
            href={experiment.href}
            prefetch={false}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>{experiment.groupLabel}</span>
            <span>{experiment.slug}</span>
            {experiment.summary ? <small>{experiment.summary}</small> : null}
          </Link>
        ))}
      </nav>
    </main>
  );
}
