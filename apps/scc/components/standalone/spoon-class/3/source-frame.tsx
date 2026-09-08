"use client";

import { forwardRef } from "react";

export const NATIVE_GAME_WIDTH = 600;
export const NATIVE_GAME_HEIGHT = 150;

// Keep each document at the upstream game's native canvas size. The wall
// scales the whole browsing context after it has rendered, rather than asking
// Runner to reinterpret its game world in a tiny iframe.
const SourceFrame = forwardRef<
  HTMLIFrameElement,
  { html: string; scale: number; title: string }
>(function SourceFrame({ html, scale, title }, ref) {
  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      allow="autoplay"
      tabIndex={0}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        display: "block",
        width: NATIVE_GAME_WIDTH,
        height: NATIVE_GAME_HEIGHT,
        border: 0,
        background: "#f7f7f7",
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
      }}
    />
  );
});

export default SourceFrame;
