# 0908 overlay-2d

Route: `/0908/overlay-2d`. Separate fork of `0908/overlay`.

Question: does the flat goldfish glyph fit the original keyword field more naturally than the lit 3D anatomy? Only the fish renderer changes: locally copied `drawLegacyGoldfish` from `2d/1`, Canvas2D paths, original dark-theme gold `#d8b66a`, 1.5 scale (about 25px long). The 72-fish attention model and original DOM/SVG field remain unchanged. Transparent pointer-inert canvas, native pixel ratio capped at 2, animation capped at 24Hz. No GPU scene, lighting or atlas. Existing routes are preserved.

Static typecheck only; no browser observation.
