"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CONCENTRIC_SMILE_COUNT,
  concentricSmileRecords,
} from "../model/data";
import styles from "./concentric-smile-field.module.css";

type FieldSize = Readonly<{
  height: number;
  width: number;
}>;

const EMPTY_FIELD_SIZE: FieldSize = { height: 0, width: 0 };
function transformForRadius(
  x: number,
  y: number,
  radius: number,
  rotation = 0,
) {
  return `translate(${x} ${y}) scale(${radius}) rotate(${rotation})`;
}

function SmileGlyph() {
  return (
    <g id="concentric-smile-glyph">
      <circle
        cx="0"
        cy="0"
        fill="none"
        r="1"
        stroke="currentColor"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="-0.367" cy="-0.245" fill="currentColor" r="0.092" />
      <circle cx="0.367" cy="-0.245" fill="currentColor" r="0.092" />
      <path
        d="M-0.49 0.145 C-0.42 0.185 -0.35 0.31 -0.27 0.39 C-0.18 0.48 -0.06 0.525 0 0.525 C0.06 0.525 0.18 0.48 0.27 0.39 C0.35 0.31 0.42 0.185 0.49 0.145"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.45"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function ConcentricSmileField() {
  const fieldRef = useRef<SVGSVGElement>(null);
  const [fieldSize, setFieldSize] = useState<FieldSize>(EMPTY_FIELD_SIZE);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const updateFieldSize = () => {
      const bounds = field.getBoundingClientRect();
      const next: FieldSize = {
        height: Math.round(bounds.height),
        width: Math.round(bounds.width),
      };

      setFieldSize((current) => (
        current.width === next.width && current.height === next.height
          ? current
          : next
      ));
    };

    updateFieldSize();
    const observer = new ResizeObserver(updateFieldSize);
    observer.observe(field);

    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    const { width, height } = fieldSize;
    const largestRadius = Math.hypot(width, height) / 2;
    const smallestRadius = largestRadius / CONCENTRIC_SMILE_COUNT;
    const radiusStep = (largestRadius - smallestRadius)
      / (CONCENTRIC_SMILE_COUNT - 1);

    return {
      centreX: width / 2,
      centreY: height / 2,
      largestRadius,
      smallestRadius,
      radiusStep,
    };
  }, [fieldSize]);

  const viewBox = `0 0 ${Math.max(1, fieldSize.width)} ${Math.max(1, fieldSize.height)}`;

  return (
    <main
      aria-label={`${CONCENTRIC_SMILE_COUNT} concentric smile marks`}
      className={styles.screen}
    >
      <svg
        aria-hidden="true"
        className={styles.field}
        focusable="false"
        ref={fieldRef}
        viewBox={viewBox}
      >
        <defs>
          <SmileGlyph />
        </defs>
        {concentricSmileRecords.map(({ id, rank }) => {
          const radius = geometry.smallestRadius + geometry.radiusStep * rank;
          const rotation = CONCENTRIC_SMILE_COUNT - 1 - rank;

          return (
            <use
              href="#concentric-smile-glyph"
              key={id}
              transform={transformForRadius(
                geometry.centreX,
                geometry.centreY,
                radius,
                rotation,
              )}
            />
          );
        })}
      </svg>
    </main>
  );
}
