"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";
import type { CValSnapshot } from "@/components/c-val/2/model";
import {
  C_VAL_PEOPLE_COLUMNS,
  C_VAL_PEOPLE_COUNT,
  C_VAL_PEOPLE_ROWS,
  presentCValPeople,
} from "./presenter";

const Stage = styled.main`
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  overflow: hidden;
  background: #f4f3ef;
`;

const Square = styled.div`
  width: min(100cqw, 100cqh);
  height: min(100cqw, 100cqh);
`;

const Field = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

function emojiTile(emoji: string) {
  const tile = document.createElement("canvas");
  tile.width = 128;
  tile.height = 128;
  const context = tile.getContext("2d");
  if (context) {
    context.font = '104px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(emoji, 64, 68);
  }
  return tile;
}

export default function CValEmploymentScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<{
    drawAll: (cryingCount: number) => void;
    drawRange: (from: number, to: number, cryingCount: number) => void;
  } | null>(null);
  const people = presentCValPeople(snapshot);
  const displayedCountRef = useRef(people.cryingCount);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const smile = emojiTile("🙂");
    const cry = emojiTile("😢");

    const drawCell = (index: number, cryingCount: number) => {
      const cellWidth = canvas.width / C_VAL_PEOPLE_COLUMNS;
      const cellHeight = canvas.height / C_VAL_PEOPLE_ROWS;
      const size = Math.min(cellWidth, cellHeight) * 0.94;
      const column = index % C_VAL_PEOPLE_COLUMNS;
      const row = Math.floor(index / C_VAL_PEOPLE_COLUMNS);
      const x = column * cellWidth;
      const y = row * cellHeight;
      context.fillStyle = "#f4f3ef";
      context.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellWidth) + 1, Math.ceil(cellHeight) + 1);
      context.drawImage(
        index < cryingCount ? cry : smile,
        x + (cellWidth - size) / 2,
        y + (cellHeight - size) / 2,
        size,
        size,
      );
    };

    const renderer = {
      drawAll(cryingCount: number) {
        context.fillStyle = "#f4f3ef";
        context.fillRect(0, 0, canvas.width, canvas.height);
        for (let index = 0; index < C_VAL_PEOPLE_COUNT; index += 1) {
          drawCell(index, cryingCount);
        }
      },
      drawRange(from: number, to: number, cryingCount: number) {
        for (let index = from; index < to; index += 1) {
          drawCell(index, cryingCount);
        }
      },
    };
    rendererRef.current = renderer;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(C_VAL_PEOPLE_COLUMNS, Math.round(bounds.width * pixelRatio));
      canvas.height = Math.max(C_VAL_PEOPLE_ROWS, Math.round(bounds.height * pixelRatio));
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
    const nextCount = people.cryingCount;
    displayedCountRef.current = nextCount;
    if (previousCount === nextCount) return;
    rendererRef.current?.drawRange(
      Math.min(previousCount, nextCount),
      Math.max(previousCount, nextCount),
      nextCount,
    );
  }, [people.cryingCount]);

  return (
    <Stage>
      <Square>
        <Field ref={canvasRef} role="img" aria-label={`${people.smilingCount} smiling and ${people.cryingCount} crying people`} />
      </Square>
    </Stage>
  );
}
