import type { ReactNode } from "react";
import styles from "./styles.module.css";

type GradientShellProps = {
  children: ReactNode;
};

export default function GradientShell({ children }: GradientShellProps) {
  return (
    <main className={styles.shell}>
      <div className={styles.content}>{children}</div>
    </main>
  );
}
