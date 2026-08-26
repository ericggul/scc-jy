"use client";

import { useState } from "react";
import CValController from "@/components/controller";
import { createInitialCValSnapshot } from "@/components/model";
import CValCommentsScreen from "@/components/screen/comments";
import CValMediaScreen from "@/components/screen/media";
import CValNewsScreen from "@/components/screen/news";
import { useCValSocket } from "@/components/transport";
import styles from "./whole.module.css";

function WholePane({
  position,
  children,
}: {
  position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  children: React.ReactNode;
}) {
  return <div className={[styles.pane, styles[position]].filter(Boolean).join(" ")}>{children}</div>;
}

export default function CValWhole() {
  const [fallback] = useState(() => createInitialCValSnapshot());
  const { state } = useCValSocket({ role: "screen" });
  const snapshot = state ?? fallback;

  return (
    <div className={styles.stage}>
      <WholePane position="topLeft"><CValCommentsScreen snapshot={snapshot} /></WholePane>
      <WholePane position="topRight"><CValMediaScreen snapshot={snapshot} /></WholePane>
      <WholePane position="bottomLeft"><CValNewsScreen snapshot={snapshot} /></WholePane>
      <WholePane position="bottomRight"><CValController /></WholePane>
    </div>
  );
}
