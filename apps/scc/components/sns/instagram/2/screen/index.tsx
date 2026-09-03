"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getInstagramGridStories } from "../model/data";
import type { InstagramStory } from "../model/types";
import styles from "./story-tray.module.css";

const STORY_SIZE = 93;
const STORY_ROW_HEIGHT = 116;
const MINIMUM_GAP = 12;

type GridSize = {
  columns: number;
  rows: number;
};

function getGridSize(width: number, height: number): GridSize {
  return {
    columns: Math.max(1, Math.floor((width + MINIMUM_GAP) / (STORY_SIZE + MINIMUM_GAP))),
    rows: Math.max(1, Math.floor((height + MINIMUM_GAP) / (STORY_ROW_HEIGHT + MINIMUM_GAP))),
  };
}

function StoryViewer({ onClose, story }: { onClose: () => void; story: InstagramStory }) {
  return (
    <section aria-label={`${story.handle} story`} aria-modal="true" className={styles.storyViewer} role="dialog">
      <button aria-label="Close story" className={styles.viewerDismissArea} onClick={onClose} type="button" />
      <div className={styles.viewerContent}>
        <button aria-label="Close story" className={styles.viewerClose} onClick={onClose} type="button">×</button>
        <div className={styles.viewerRing}>
          <span aria-hidden="true" className={styles.viewerPortrait} style={{ backgroundImage: `url("${story.profileImage}")` }} />
        </div>
        <span className={styles.viewerHandle}>{story.handle}</span>
      </div>
    </section>
  );
}

export function InstagramStoryTray() {
  const gridRef = useRef<HTMLUListElement>(null);
  const [gridSize, setGridSize] = useState<GridSize>({ columns: 1, rows: 1 });
  const [selectedStory, setSelectedStory] = useState<InstagramStory | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateGridSize = () => {
      const next = getGridSize(grid.clientWidth, grid.clientHeight);
      setGridSize((current) => (
        current.columns === next.columns && current.rows === next.rows ? current : next
      ));
    };

    updateGridSize();
    const observer = new ResizeObserver(updateGridSize);
    observer.observe(grid);

    return () => observer.disconnect();
  }, []);

  const stories = useMemo(
    () => getInstagramGridStories(gridSize.columns * gridSize.rows),
    [gridSize],
  );
  const gridStyle = {
    "--grid-columns": gridSize.columns,
    "--grid-rows": gridSize.rows,
  } as CSSProperties;

  return (
    <main aria-label="Instagram stories" className={styles.screen}>
      <ul className={styles.storyGrid} ref={gridRef} style={gridStyle}>
        {stories.map((story) => (
          <li className={styles.gridItem} key={story.id}>
            <button aria-label={`Open ${story.handle}'s story`} className={styles.story} onClick={() => setSelectedStory(story)} type="button">
              <span className={styles.storyRing}>
                <span aria-hidden="true" className={styles.profilePhoto} style={{ backgroundImage: `url("${story.profileImage}")` }} />
              </span>
              <span className={styles.storyLabel}>{story.handle}</span>
            </button>
          </li>
        ))}
      </ul>

      {selectedStory ? <StoryViewer onClose={() => setSelectedStory(null)} story={selectedStory} /> : null}
    </main>
  );
}
