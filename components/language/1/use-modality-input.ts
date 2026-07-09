"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { slotCount, type NormalizedCoordinate } from "./data";

const center: NormalizedCoordinate = { x: 0, y: 0 };
const debugPrefix = "[language/1]";

export type ModalityInputProvider = "mouse";

export function useModalityInput(
  provider: ModalityInputProvider = "mouse",
  boundsRef?: RefObject<HTMLElement | null>,
) {
  const [coordinate, setCoordinate] = useState<NormalizedCoordinate>(center);
  const cellKeyRef = useRef("5:5");

  useEffect(() => {
    if (provider !== "mouse") {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = boundsRef?.current?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      const width = Math.max(rect?.width ?? window.innerWidth, 1);
      const height = Math.max(rect?.height ?? window.innerHeight, 1);
      const localX = Math.max(0, Math.min(width, event.clientX - left));
      const localY = Math.max(0, Math.min(height, event.clientY - top));
      const column = Math.max(
        0,
        Math.min(slotCount - 1, Math.floor((localX / width) * slotCount)),
      );
      const row = Math.max(
        0,
        Math.min(slotCount - 1, Math.floor((localY / height) * slotCount)),
      );
      const nextCellKey = `${row}:${column}`;

      if (cellKeyRef.current === nextCellKey) {
        return;
      }

      cellKeyRef.current = nextCellKey;
      setCoordinate({
        x: (column / (slotCount - 1)) * 2 - 1,
        y: (row / (slotCount - 1)) * 2 - 1,
      });
    }

    console.log(`${debugPrefix} mouse-modality-attached {}`);
    window.addEventListener("pointermove", handlePointerMove, {
      capture: true,
      passive: true,
    });
    return () => {
      console.log(`${debugPrefix} mouse-modality-detached {}`);
      window.removeEventListener("pointermove", handlePointerMove, {
        capture: true,
      });
    };
  }, [boundsRef, provider]);

  return coordinate;
}
