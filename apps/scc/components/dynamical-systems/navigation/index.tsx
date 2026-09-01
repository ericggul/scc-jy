import Link from "next/link";
import type { DynamicalSystemExperiment } from "./model";
import styles from "./navigation.module.css";

export default function DynamicalSystemsNavigation({
  experiments,
}: {
  experiments: DynamicalSystemExperiment[];
}) {
  return (
    <main className={styles.page}>
      <h1>dynamical systems</h1>
      <nav aria-label="Dynamical systems experiments" className={styles.routes}>
        {experiments.map((experiment) => (
          <Link
            key={experiment.id}
            href={experiment.href}
            className={styles.route}
            target="_blank"
            rel="noopener noreferrer"
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
