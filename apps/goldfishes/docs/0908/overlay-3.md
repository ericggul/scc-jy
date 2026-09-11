# 0908 overlay-3

Route: `/screen/0908/overlay-3` (alias `/0908/overlay-3`). Date: 2026-09-08.

Question: can the colour-coded technology abbreviations retain the compact, instrument-like presence of `overlay-2` while participants compare different type voices in the same field?

Baseline: a complete local copy of `0908/overlay-2`. Mutation: `tech mono` is the default surface, and both `tech` and `tech mono` expose the same three bottom-control type treatments: the original mono, system UI sans, and the bundled IDF Voyageur display face. The two surfaces continue to differ only in their existing ring-colour treatment. The edge is fixed to the parent’s plain line; the directed-edge authoring control and rendering branch are removed. Bubble labels and their control are removed, so the grid and fish target field use icon-only rows. The school contains 350 fish rendered at the `1.0` baseline scale. A target fish turns toward its bubble and steers its mouth to `icon radius + 7.15px`; a directional hard exclusion boundary accounts for the 6.15px mouth, 13.08px tail, and 6.15px side extents, so no rendered fish part intersects any bubble. Near the target, environmental-current and tangential flocking drift are damped, avoiding circumferential orbiting; its position settles while its existing tail animation continues. Target reconsideration occurs every 2.1–3.7 seconds unless the target disappears. Untargeted cruise speed is 24px/s and target speed tops out at 44px/s. The remaining authoring controls are collapsed by default behind one bottom-right `expand` / `collapse` button.

Invariants: the 350-fish 3D school, local attention and story models, 24Hz cadence, story geometry, keyword/ring palette mapping, all other surface options, and backboard and trace controls remain local copies of the parent. The field background is darkened to `#07090b`; technology bubbles are darkened to `#171a1e`.

Evidence boundary: this is a typographic trial, not a claim that any treatment is more legible or appropriate. `pnpm --filter @scc/goldfishes typecheck` passes; browser comparison remains unverified.
