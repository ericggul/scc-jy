"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./navigation.module.css";

type ActionId = "like" | "comment" | "repost" | "send" | "save";

type ActionDefinition = {
  id: ActionId;
  label: string;
  count?: string;
  icon: ReactNode;
};

const actions: readonly ActionDefinition[] = [
  { id: "like", label: "Like", count: "3,473", icon: <LikeIcon /> },
  { id: "comment", label: "Comment", count: "81", icon: <CommentIcon /> },
  { id: "repost", label: "Repost", icon: <RepostIcon /> },
  { id: "send", label: "Send", count: "525", icon: <SendIcon /> },
  { id: "save", label: "Save", icon: <SaveIcon /> },
];

function LikeIcon() {
  return (
    <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24">
      <path
        d="M20.8 4.6c-2-2-5.2-1.8-6.9.4L12 7.3 10.1 5C8.4 2.8 5.2 2.6 3.2 4.6.9 6.9 1 10.5 3.4 12.8L12 21l8.6-8.2c2.4-2.3 2.5-5.9.2-8.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24">
      <g transform="translate(24 0) scale(-1 1)">
        <path
          d="M21 11.5a8.4 8.4 0 0 1-8.7 8.3 9.7 9.7 0 0 1-3.5-.7L3 20.6l1.6-5.2a8.1 8.1 0 0 1-.9-3.9A8.4 8.4 0 0 1 12.3 3 8.4 8.4 0 0 1 21 11.5Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </g>
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg aria-hidden="true" className={styles.repostIcon} viewBox="0 0 24 24">
      <path
        d="M5.1 9.15h9.65l-2.9-2.9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.95"
      />
      <path
        d="M18.9 14.85H9.25l2.9 2.9M18.9 9.15v2.05a3.65 3.65 0 0 1-3.65 3.65H9.25M5.1 14.85V12.8a3.65 3.65 0 0 1 3.65-3.65h6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.95"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24">
      <path
        d="m21 3-7.2 18-4.1-8.7L1 8.2 21 3Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m9.7 12.3 5.6-4.9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24">
      <path
        d="M3.5 2.5h17v19.9L12 17.2l-8.5 5.2V2.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function isActionId(value: string | undefined): value is ActionId {
  return actions.some((action) => action.id === value);
}

function ActionButton({
  rowIndex,
  action,
  selected,
  skating,
  onActivate,
}: {
  rowIndex: number;
  action: ActionDefinition;
  selected: boolean;
  skating: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      aria-label={action.count ? `${action.label}, ${action.count}` : action.label}
      aria-pressed={selected}
      className={styles.actionButton}
      data-action={action.id}
      data-skate-action={action.id}
      data-skate-row={rowIndex}
      data-selected={selected || undefined}
      data-skating={skating || undefined}
      type="button"
      onClick={(event) => {
        if (event.detail === 0) {
          onActivate();
        }
      }}
    >
      {action.icon}
      {action.count ? <span className={styles.count}>{action.count}</span> : null}
    </button>
  );
}

export default function SnsNavigationTwo() {
  const [stackMetrics, setStackMetrics] = useState({
    rowCount: 8,
    rowHeight: 72,
  });
  const [selectedActions, setSelectedActions] = useState<(ActionId | null)[]>(
    () => Array.from({ length: 8 }, () => null),
  );
  const [skatingSelections, setSkatingSelections] = useState<string[]>([]);
  const activePointerIdsRef = useRef(new Set<number>());
  const pointerSelectionRef = useRef(new Map<number, string>());

  useEffect(() => {
    function syncRowCount() {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const verticalPadding = 16;
      const referenceRowHeight = Math.min(
        202,
        Math.max(76, viewportWidth * 0.1715),
      );
      const nextRowCount = Math.max(
        3,
        Math.min(
          12,
          Math.floor((viewportHeight - verticalPadding * 2) / referenceRowHeight),
        ),
      );
      const nextRowHeight = Math.max(
        52,
        Math.floor((viewportHeight - verticalPadding * 2) / nextRowCount),
      );

      setStackMetrics({
        rowCount: nextRowCount,
        rowHeight: nextRowHeight,
      });
      setSelectedActions((current) =>
        Array.from({ length: nextRowCount }, (_, index) => current[index] ?? null),
      );
    }

    syncRowCount();
    window.addEventListener("resize", syncRowCount);
    window.visualViewport?.addEventListener("resize", syncRowCount);

    return () => {
      window.removeEventListener("resize", syncRowCount);
      window.visualViewport?.removeEventListener("resize", syncRowCount);
    };
  }, []);

  const { rowCount, rowHeight } = stackMetrics;
  const stackStyle = {
    "--action-row-height": `${rowHeight}px`,
    gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
  } as CSSProperties & { "--action-row-height": string };

  function setRowAction(rowIndex: number, actionId: ActionId) {
    setSelectedActions((current) => {
      if (
        rowIndex < 0 ||
        rowIndex >= current.length ||
        current[rowIndex] === actionId
      ) {
        return current;
      }

      return current.map((action, index) =>
        index === rowIndex ? actionId : action,
      );
    });
  }

  function refreshSkatingSelections() {
    setSkatingSelections([...new Set(pointerSelectionRef.current.values())]);
  }

  function selectAtPoint(pointerId: number, clientX: number, clientY: number) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-skate-row][data-skate-action]");

    if (!target) return;

    const rowIndex = Number(target.dataset.skateRow);
    const actionId = target.dataset.skateAction;

    if (!Number.isInteger(rowIndex) || !isActionId(actionId)) return;

    const selectionKey = `${rowIndex}:${actionId}`;
    if (pointerSelectionRef.current.get(pointerId) === selectionKey) return;

    pointerSelectionRef.current.set(pointerId, selectionKey);
    setRowAction(rowIndex, actionId);
    refreshSkatingSelections();
  }

  function selectFromPointerEvent(event: PointerEvent<HTMLElement>) {
    const coalescedPoints = event.nativeEvent.getCoalescedEvents?.();
    const points =
      coalescedPoints && coalescedPoints.length > 0
        ? coalescedPoints
        : [event.nativeEvent];

    for (const point of points) {
      selectAtPoint(event.pointerId, point.clientX, point.clientY);
    }
  }

  function clearPointer(pointerId: number) {
    activePointerIdsRef.current.delete(pointerId);

    if (pointerSelectionRef.current.delete(pointerId)) {
      refreshSkatingSelections();
    }
  }

  function finishPointer(event: PointerEvent<HTMLElement>) {
    if (!activePointerIdsRef.current.has(event.pointerId)) return;

    selectFromPointerEvent(event);
    clearPointer(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <main
      className={styles.experiment}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onLostPointerCapture={(event) => clearPointer(event.pointerId)}
      onPointerCancel={(event) => clearPointer(event.pointerId)}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        event.preventDefault();
        activePointerIdsRef.current.add(event.pointerId);
        event.currentTarget.setPointerCapture(event.pointerId);
        selectFromPointerEvent(event);
      }}
      onPointerMove={(event) => {
        if (activePointerIdsRef.current.has(event.pointerId)) {
          selectFromPointerEvent(event);
        }
      }}
      onPointerUp={finishPointer}
    >
      <section
        aria-label="Instagram post action navigation stack"
        className={styles.stack}
        style={stackStyle}
      >
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <nav
            aria-label={`Instagram post actions ${rowIndex + 1}`}
            className={styles.actionRow}
            key={`sns-navigation-2-row-${rowIndex}`}
          >
            {actions.map((action) => {
              const selectionKey = `${rowIndex}:${action.id}`;

              return (
                <ActionButton
                  action={action}
                  key={`${rowIndex}-${action.id}`}
                  onActivate={() => setRowAction(rowIndex, action.id)}
                  rowIndex={rowIndex}
                  selected={selectedActions[rowIndex] === action.id}
                  skating={skatingSelections.includes(selectionKey)}
                />
              );
            })}
          </nav>
        ))}
      </section>
    </main>
  );
}
