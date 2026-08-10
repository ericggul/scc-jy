"use client";

import type { CValSnapshot } from "@/components/c-val/2/model";
import { presentCValThreeDigitPrice } from "./presenter";
import CasinoPriceReel from "./reel";
import styles from "./casino.module.css";

export default function CValCasinoScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const presentation = presentCValThreeDigitPrice(snapshot);

  return (
    <main className={styles.stage} aria-label={`현재 체결 주가 ${presentation.text}`}>
      <section className={styles.machine} aria-hidden="true">
        <div className={styles.reelMatrix}>
          {presentation.digits.map((digit, lane) => (
            <CasinoPriceReel digit={digit} lane={lane} key={`price-digit-${lane}`} />
          ))}
        </div>
      </section>
    </main>
  );
}
