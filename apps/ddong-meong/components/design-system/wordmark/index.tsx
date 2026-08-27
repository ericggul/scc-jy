import type { ComponentPropsWithoutRef } from "react";
import styles from "./styles.module.css";

type DdongMeongWordmarkProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
>;

export default function DdongMeongWordmark({
  className,
  ...props
}: DdongMeongWordmarkProps) {
  return (
    <span
      {...props}
      aria-label={props["aria-label"] ?? "ddong-meong"}
      className={[styles.wordmark, className].filter(Boolean).join(" ")}
      role="img"
    />
  );
}
