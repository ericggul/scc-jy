"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { createInitialCycleSnapshot } from "@/components/network-system/cycle/model";
import { useCycleSocket } from "@/components/network-system/cycle/transport";
import {
  EMPLOYMENT_EMOJI_COLUMNS,
  EMPLOYMENT_EMOJI_COUNT,
  EMPLOYMENT_EMOJI_ROWS,
  presentCycleEmploymentEmojis,
} from "./presenter";

const Stage = styled.main`
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #f4f3ef;
`;

const SquareField = styled.div`
  width: min(100vw, 100vh);
  height: min(100vw, 100vh);
  overflow: hidden;
  background: #f4f3ef;
`;

const Field = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

type EmojiRenderer = {
  drawAll: (distressedCount: number) => void;
  drawRange: (from: number, to: number, distressedCount: number) => void;
};

function createEmojiTile(emoji: string) {
  const tile = document.createElement("canvas");
  tile.width = 128;
  tile.height = 128;
  const context = tile.getContext("2d");
  if (!context) return tile;
  context.font = '104px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(emoji, 64, 68);
  return tile;
}

export default function CycleEmploymentEmojiScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<EmojiRenderer | null>(null);
  const [emojiState, setEmojiState] = useState(() =>
    presentCycleEmploymentEmojis(createInitialCycleSnapshot()),
  );
  const displayedCountRef = useRef(emojiState.distressedCount);

  useCycleSocket({
    role: "screen",
    retainState: false,
    onState: (snapshot) =>
      setEmojiState(presentCycleEmploymentEmojis(snapshot)),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const happyTile = createEmojiTile("🙂");
    const distressedTile = createEmojiTile("😢");

    const drawCell = (index: number, distressedCount: number) => {
      const column = index % EMPLOYMENT_EMOJI_COLUMNS;
      const row = Math.floor(index / EMPLOYMENT_EMOJI_COLUMNS);
      const cellWidth = canvas.width / EMPLOYMENT_EMOJI_COLUMNS;
      const cellHeight = canvas.height / EMPLOYMENT_EMOJI_ROWS;
      const x = column * cellWidth;
      const y = row * cellHeight;
      const size = Math.min(cellWidth, cellHeight) * 0.94;

      context.fillStyle = "#f4f3ef";
      context.fillRect(
        Math.floor(x),
        Math.floor(y),
        Math.ceil(cellWidth) + 1,
        Math.ceil(cellHeight) + 1,
      );
      context.drawImage(
        index < distressedCount ? distressedTile : happyTile,
        x + (cellWidth - size) / 2,
        y + (cellHeight - size) / 2,
        size,
        size,
      );
    };

    const renderer: EmojiRenderer = {
      drawAll: (distressedCount) => {
        context.fillStyle = "#f4f3ef";
        context.fillRect(0, 0, canvas.width, canvas.height);
        for (let index = 0; index < EMPLOYMENT_EMOJI_COUNT; index += 1) {
          drawCell(index, distressedCount);
        }
      },
      drawRange: (from, to, distressedCount) => {
        for (let index = from; index < to; index += 1) {
          drawCell(index, distressedCount);
        }
      },
    };
    rendererRef.current = renderer;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(
        EMPLOYMENT_EMOJI_COLUMNS,
        Math.round(bounds.width * pixelRatio),
      );
      canvas.height = Math.max(
        EMPLOYMENT_EMOJI_ROWS,
        Math.round(bounds.height * pixelRatio),
      );
      context.imageSmoothingEnabled = true;
      renderer.drawAll(displayedCountRef.current);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    return () => {
      observer.disconnect();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const previousCount = displayedCountRef.current;
    const nextCount = emojiState.distressedCount;
    displayedCountRef.current = nextCount;
    if (previousCount === nextCount) return;
    rendererRef.current?.drawRange(
      Math.min(previousCount, nextCount),
      Math.max(previousCount, nextCount),
      nextCount,
    );
  }, [emojiState.distressedCount]);

  return (
    <Stage>
      <SquareField>
        <Field
          ref={canvasRef}
          role="img"
          aria-label={`${EMPLOYMENT_EMOJI_COUNT - emojiState.distressedCount} smiling and ${emojiState.distressedCount} crying employment emojis`}
        />
      </SquareField>
    </Stage>
  );
}
