"use client";

// A separate document preserves the original document, CSS cascade, canvas,
// global Runner singleton, input listeners and audio lifecycle. Unmounting the
// frame disposes that whole browsing context, including requestAnimationFrame.
export default function SourceFrame({
  html,
}: {
  html: string;
}) {
  return (
    <iframe
      title="spoon-class — Chrome Dino"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      allow="autoplay"
      onLoad={(event) => {
        event.currentTarget.focus();
        event.currentTarget.contentWindow?.focus();
      }}
      style={{
        position: "fixed",
        inset: 0,
        display: "block",
        width: "100%",
        height: "100%",
        border: 0,
        background: "#f7f7f7",
      }}
    />
  );
}
