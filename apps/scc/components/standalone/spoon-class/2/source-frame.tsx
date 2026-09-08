"use client";

import { forwardRef } from "react";

// A separate document preserves the original document, CSS cascade, canvas,
// global Runner singleton, input listeners and audio lifecycle. Unmounting the
// frame disposes that whole browsing context, including requestAnimationFrame.
const SourceFrame = forwardRef<
  HTMLIFrameElement,
  { html: string; title: string }
>(function SourceFrame({ html, title }, ref) {
  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      allow="autoplay"
      tabIndex={0}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        border: 0,
        background: "#f7f7f7",
      }}
    />
  );
});

export default SourceFrame;
