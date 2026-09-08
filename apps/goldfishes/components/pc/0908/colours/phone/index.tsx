import { memo } from "react";
import { fieldConfig } from "../model/config";
import type { FishPhone } from "../model/field";
import styles from "../phone-field.module.css";

export default memo(function Phone({ phone, width }: { phone: FishPhone; width: number }) {
  return (
    <section
      aria-hidden={phone.activeColour === null}
      aria-label={phone.activeColour ? `Goldfish ${phone.id}, monochrome colour` : undefined}
      className={styles.phoneSlot}
      data-present={phone.activeColour !== null}
      inert={phone.activeColour === null}
    >
      <div
        className={styles.phone}
        style={{
          width: fieldConfig.phoneWidth,
          height: fieldConfig.phoneHeight,
          transform: `scale(${width / fieldConfig.phoneWidth})`,
        }}
      >
        <div className={styles.colour} style={{ backgroundColor: phone.activeColour ?? "transparent" }}>
          <span aria-hidden="true" className={styles.camera} />
        </div>
      </div>
    </section>
  );
});
