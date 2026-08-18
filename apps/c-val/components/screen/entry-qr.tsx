"use client";

import { useSyncExternalStore } from "react";
import styles from "./entry-qr.module.css";

function subscribe(_onStoreChange: () => void) {
  return () => undefined;
}

/** A compact, high-contrast entry point that always encodes this C-VAL host's mobile route. */
export default function CValEntryQr() {
  const entryUrl = useSyncExternalStore(
    subscribe,
    () => `${window.location.origin}/mobile`,
    () => null,
  );

  if (!entryUrl) return <div aria-hidden="true" className={styles.placeholder} />;
  return (
    <img
      alt="C-VAL 모바일 화면으로 들어가는 QR 코드"
      className={styles.qr}
      src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&format=svg&data=${encodeURIComponent(entryUrl)}`}
    />
  );
}
