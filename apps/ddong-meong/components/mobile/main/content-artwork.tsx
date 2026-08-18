"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import styles from "./styles.module.css";

type ArtworkStatus = "loading" | "loaded" | "failed";

type ContentArtworkProps = {
  src: string;
  eager?: boolean;
  historyNote?: string;
};

export default function ContentArtwork({
  src,
  eager = false,
  historyNote,
}: ContentArtworkProps) {
  const [status, setStatus] = useState<ArtworkStatus>("loading");

  const resolveCachedImage = useCallback((image: HTMLImageElement | null) => {
    if (!image?.complete) return;
    setStatus(image.naturalWidth > 0 ? "loaded" : "failed");
  }, []);

  return (
    <span
      className={`${styles.artwork} ${
        status === "loaded"
          ? styles.artworkLoaded
          : status === "failed"
            ? styles.artworkFailed
            : styles.artworkLoading
      }`}
      aria-hidden={historyNote ? undefined : true}
    >
      <Image
        ref={resolveCachedImage}
        className={styles.artworkImage}
        src={src}
        alt=""
        fill
        sizes="(max-width: 600px) 100vw, 600px"
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
      />
      {historyNote ? <time className={styles.historyOverlay}>{historyNote}</time> : null}
    </span>
  );
}
