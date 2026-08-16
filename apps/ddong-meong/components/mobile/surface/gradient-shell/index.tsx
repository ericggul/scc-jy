import type { ReactNode } from "react";
import InteractionLock from "@/components/design-system/interaction-lock";
import { ddongMeongSans } from "@/components/design-system/fonts";
import theme from "@/components/design-system/theme.module.css";
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
      <InteractionLock />
      <div className={styles.content}>{children}</div>
    </main>
  );
}
