"use client";

import type { CSSProperties, PointerEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSubscribeButtonRecords,
  type SubscribeButtonRecord,
} from "../model/data";
import styles from "./youtube-subscribe-grid.module.css";

type GridSize = {
  columns: number;
  rows: number;
};

const INITIAL_GRID_SIZE: GridSize = { columns: 1, rows: 1 };
const DEFAULT_BUTTON_WIDTH = 32;
const MIN_BUTTON_WIDTH = 12;
const MAX_BUTTON_WIDTH = 104;
const DEFAULT_BUTTON_GAP = 3;
const MIN_BUTTON_GAP = 0;
const MAX_BUTTON_GAP = 28;
const DEFAULT_RADIUS_PERCENT = 0;
const MIN_RADIUS_PERCENT = 0;
const MAX_RADIUS_PERCENT = 100;
const BUTTON_ASPECT_RATIO = 52 / 18;
const FONT_SIZE_RATIO = 7 / 52;
const LINE_HEIGHT_RATIO = 10 / 52;

function pixelValue(value: string) {
  return Number.parseFloat(value);
}

function getGridSize(
  width: number,
  height: number,
  buttonWidth: number,
  buttonHeight: number,
  columnGap: number,
  rowGap: number,
): GridSize {
  return {
    columns: Math.max(
      1,
      Math.ceil((width + columnGap) / (buttonWidth + columnGap)),
    ),
    rows: Math.max(
      1,
      Math.ceil((height + rowGap) / (buttonHeight + rowGap)),
    ),
  };
}

const SubscribeButton = memo(function SubscribeButton({
  button,
  subscribed,
}: {
  button: SubscribeButtonRecord;
  subscribed: boolean;
}) {
  const label = subscribed ? "Subscribed" : "Subscribe";

  return (
    <button
      aria-label={`${label} channel ${button.channelNumber}`}
      aria-pressed={subscribed}
      className={subscribed ? styles.subscribedButton : styles.subscribeButton}
      data-subscribe-id={button.id}
      type="button"
    >
      {label}
    </button>
  );
});

export function YoutubeSubscribeGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState<GridSize>(INITIAL_GRID_SIZE);
  const [buttonWidth, setButtonWidth] = useState(DEFAULT_BUTTON_WIDTH);
  const [buttonGap, setButtonGap] = useState(DEFAULT_BUTTON_GAP);
  const [radiusPercent, setRadiusPercent] = useState(DEFAULT_RADIUS_PERCENT);
  const [subscribedIds, setSubscribedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateGridSize = () => {
      const button = grid.querySelector<HTMLButtonElement>("button");
      if (!button) return;

      const computedStyle = window.getComputedStyle(grid);
      const buttonBounds = button.getBoundingClientRect();
      const next = getGridSize(
        grid.clientWidth,
        grid.clientHeight,
        buttonBounds.width,
        buttonBounds.height,
        pixelValue(computedStyle.columnGap),
        pixelValue(computedStyle.rowGap),
      );

      setGridSize((current) =>
        current.columns === next.columns && current.rows === next.rows
          ? current
          : next,
      );
    };

    let animationFrame: number | null = null;
    const scheduleGridSizeUpdate = () => {
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateGridSize();
      });
    };

    scheduleGridSizeUpdate();
    const observer = new ResizeObserver(scheduleGridSizeUpdate);
    observer.observe(grid);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      observer.disconnect();
    };
  }, [buttonGap, buttonWidth]);

  const buttons = useMemo(
    () => getSubscribeButtonRecords(gridSize.columns * gridSize.rows),
    [gridSize],
  );
  const gridStyle = {
    "--button-columns": gridSize.columns,
    "--button-rows": gridSize.rows,
  } as CSSProperties;
  const buttonHeight = buttonWidth / BUTTON_ASPECT_RATIO;
  const buttonRadius = (buttonHeight / 2) * (radiusPercent / 100);
  const screenStyle = {
    "--subscribe-button-width": `${buttonWidth}px`,
    "--subscribe-button-height": `${buttonHeight}px`,
    "--subscribe-button-font-size": `${buttonWidth * FONT_SIZE_RATIO}px`,
    "--subscribe-button-line-height": `${buttonWidth * LINE_HEIGHT_RATIO}px`,
    "--button-gap": `${buttonGap}px`,
    "--subscribe-button-radius": `${buttonRadius}px`,
  } as CSSProperties;

  const toggleSubscription = useCallback((id: string) => {
    setSubscribedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleGridPointerOver = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const id = target.closest<HTMLButtonElement>("button[data-subscribe-id]")?.dataset
      .subscribeId;
    if (!id) return;

    toggleSubscription(id);
  }, [toggleSubscription]);

  return (
    <main
      aria-label="YouTube subscribe button field"
      className={styles.screen}
      style={screenStyle}
    >
      <div
        className={styles.buttonGrid}
        onPointerOver={handleGridPointerOver}
        ref={gridRef}
        style={gridStyle}
      >
        {buttons.map((button) => (
          <SubscribeButton
            button={button}
            key={button.id}
            subscribed={subscribedIds.has(button.id)}
          />
        ))}
      </div>
      <section aria-label="Button field test controls" className={styles.controls}>
        <label className={styles.sizeControl}>
          <span>size</span>
          <input
            aria-label="Subscribe button size"
            max={MAX_BUTTON_WIDTH}
            min={MIN_BUTTON_WIDTH}
            onChange={(event) => setButtonWidth(Number(event.currentTarget.value))}
            step="1"
            type="range"
            value={buttonWidth}
          />
          <output>{buttonWidth}px</output>
        </label>
        <label className={styles.sizeControl}>
          <span>margin</span>
          <input
            aria-label="Space between subscribe buttons"
            max={MAX_BUTTON_GAP}
            min={MIN_BUTTON_GAP}
            onChange={(event) => setButtonGap(Number(event.currentTarget.value))}
            step="1"
            type="range"
            value={buttonGap}
          />
          <output>{buttonGap}px</output>
        </label>
        <label className={styles.sizeControl}>
          <span>radius</span>
          <input
            aria-label="Subscribe button corner radius"
            max={MAX_RADIUS_PERCENT}
            min={MIN_RADIUS_PERCENT}
            onChange={(event) => setRadiusPercent(Number(event.currentTarget.value))}
            step="1"
            type="range"
            value={radiusPercent}
          />
          <output>{radiusPercent}%</output>
        </label>
      </section>
    </main>
  );
}
