# face-voronoi

The canonical archive contains exactly three experiments:

| Route | Experiment | Primary relation |
| --- | --- | --- |
| `/face-voronoi/1` | Living portrait territories | Exact polygonal portrait cells divide and retract. |
| `/face-voronoi/2` | Population pulse | One living site ecology moves between sparse and dense populations. |
| `/face-voronoi/3` | Material field | A moving fragment-space Voronoi field changes its material, not its geometry. |

`/face-voronoi/4` and `/face-voronoi/5` are retired addresses, not aliases or redirects. The dynamic route must validate only `1`, `2`, and `3`; the group index redirects to `/face-voronoi/1`.

## /face-voronoi/1 — living portrait territories

**Participant situation.** Individual portrait photographs occupy actual Voronoi cells. A territory grows, divides, or retracts; the photograph changes only through that exact polygonal territory.

**Functionality.**

- A finite living-site model evolves through local growth, division, retraction, and resize.
- Each live seed receives one stable local portrait from `portrait-ledger.ts`.
- Canvas drawing clips every image to its current polygon before drawing it.
- The lower control row switches only the final black cell seam on or off; it does not alter the model.

**Implementation.** `components/complex-systems/face-voronoi/1/`

- `living-field.ts` is the browser-facing state adapter.
- `model/` owns site state and geometry; keep presentation decisions out of it.
- `portrait-ledger.ts` is the only source ledger for the 56 local face images.
- `screen.tsx` performs canvas clipping and rendering.

**Agent guardrails.**

- Do not replace clipping with rectangular image fading, CSS masks, or a contact sheet.
- Do not introduce face detection, identity claims, camera input, or biometric interpretation.
- Keep the image tied to the live seed through birth/retraction. A renderer-only visual effect must not mutate the ecology.
- Preserve the border control's narrow contract: it changes only the final seam stroke.

## /face-voronoi/2 — population pulse

**Participant situation.** A common living Voronoi population expands from sparse large cells to many small cells, then contracts. The same state can be observed as monochrome geometry, local faces, or local politician portraits.

**Functionality.**

- A fertility pulse determines the target population; distributed site division and retraction reach it without a count jump.
- The lower bar exposes minimum population, maximum population, tempo, and sibling separation.
- `monochrome`, `face`, and `politician` are renderers of the same state. Switching mode must not reset seeds, time, or parameters.
- Portrait drawing uses a deterministic `cover` crop per seed and clips it to the actual cell polygon.

**Implementation.** `components/complex-systems/face-voronoi/2/`

- `model/` owns the population ecology, exact cell construction, and parameter normalization.
- `media/portraits.ts` lists the local face material.
- `media/politicians.ts` and `media/politician-sources.json` retain the local politician collection and its source ledger.
- `index.tsx` owns canvas rendering, image loading, and the direct parameter controls.

**Agent guardrails.**

- Keep the three display modes presentation-only; do not fork their state machines.
- A visible site dot belongs only to monochrome mode. Portrait renderers do not add decorative dots or strokes.
- Parameter controls must continue to map to the actual model parameters, with model-side clamping preserved.
- Keep source ledgers with their associated local assets. Do not fetch remote portraits at runtime.

## /face-voronoi/3 — material field

**Participant situation.** A pointer locally bends an autonomous moving Voronoi field. The participant can compare a chromatic field, a monochrome distance field, discrete portraits, and three portrait-material continuities.

**Functionality.**

- The shader uses an IQ-style three-by-three nearest-feature pass and five-by-five bisector pass.
- Pointer warp occurs before field scaling and evaluation; feature motion remains sinusoidal and cell-seeded.
- `colour` assigns feature-owned HSL hues (`s: 100`, `l: 50`) and computes their circular weighted mean.
- `monochrome` exposes border distance and feature points.
- `face` samples exactly one local portrait at the nearest feature.
- `face-gradient 1` carries portrait samples through colour mode's exact five-by-five Gaussian influence field.
- `face-gradient 2` makes compact portrait bodies form and break a solid union; pairwise contact compresses and overlaps the two source faces against the black field.
- `face-gradient 3` first derives one shared, continuous face coordinate from colour mode's feature weights, then samples every contributing portrait at that aligned coordinate. `face core` narrows the falloff from the original broad blend toward explicit central faces.

**Implementation.** `components/complex-systems/face-voronoi/3/`

- `index.tsx` contains the renderer and all material-mode logic.
- `media/portrait-atlas.ts` turns `/1`'s local portrait ledger into a WebGL texture atlas. This cross-reference is content reuse only; `/3` never imports `/1`'s living state or rendering logic.
- `iq-voronoi.module.css` defines the shared unobtrusive lower mode bar.

**Agent guardrails.**

- Every mode must retain the same feature trajectory, pointer warp order, scale, and fragment-space Voronoi coordinate system. A mode changes material only.
- Do not use a CSS blur, an overlaid image canvas, or `/1`'s living-site model to imitate a material transition.
- Preserve the difference between gradients: `face-gradient 1` is weighted material continuity; `2` is solid contact and collapse; `3` is landmark-aligned continuity. Do not silently merge their shader branches.
- `face core` applies only to `face-gradient 3`; zero must reproduce its broad baseline. Keep it a direct shader uniform, not a stateful simulation parameter.
- Keep image loading local and keep WebGL texture/buffer cleanup in the renderer teardown.

## Shared agent handoff

1. Treat `experiments.ts` as the canonical valid-route registry. When changing a route, update the dynamic page, group redirect, registry, and this document together.
2. Do not recreate numbered `4` or `5` experiments, or add a material mode without explicit user direction. An authorized material variation belongs to `/3` only when it preserves `/3`'s coordinate and interaction invariants.
3. Do not move model logic across these experiments merely because both use Voronoi geometry. `/1` is portrait lifecycle, `/2` is population ecology, and `/3` is a fragment-space material field.
4. Local portrait assets are visual material, not evidence about the people pictured. Preserve their source ledgers and avoid identity, demographic, or biometric claims.
5. For source changes, run `pnpm --filter @scc/archive typecheck` and `git diff --check`. Do not run `pnpm build`, start a dev server, or perform runtime browser checks unless separately authorized under repository rules.
