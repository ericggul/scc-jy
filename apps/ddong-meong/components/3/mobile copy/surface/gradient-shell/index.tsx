import type { ReactNode } from "react";
import { ddongMeongSans } from "../../../design-system/fonts";
import theme from "../../../design-system/theme.module.css";
import styles from "./styles.module.css";

type GradientShellProps = {
  children: ReactNode;
};

export default function GradientShell({ children }: GradientShellProps) {
  return (
    <main
      className={`${ddongMeongSans.variable} ${theme.theme} ${styles.shell}`}
      lang="ko"
    >
      <div className={styles.content}>{children}</div>
    </main>
  );
}
