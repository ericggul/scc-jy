# Grid

`grid` is a standalone, installation-scale family of full-screen portrait media
fields. It is registered at `/grid` and has five variants: `/grid/1`,
`/grid/2`, `/grid/3`, `/grid/4`, and `/grid/5`.

## Shared spatial contract

### Participant situation

One participant encounters a single screen, primarily calibrated for
`1920 × 1080`. The visible field is a gapless arrangement of 80 moving `9:16`
cells (`16 × 5`). No feed chrome, captions, ranking, authorship, or engagement
metadata appears inside the active work.

### Full-cover rule

The field must cover every viewport, not merely fit within it. The grid width
is the larger of:

```text
viewport width
viewport height × grid aspect ratio
```

The oversized grid is anchored at `50% / 50%` and translated by `-50% / -50%`.
When viewport and grid aspect ratios differ, outer cells crop equally from the
opposing edges; no blank edge is exposed. At `1920 × 1080`, the `16 × 5` field
is `1944 × 1080`, so 12px crops from each horizontal side while every cell
remains exactly `9:16`.

### Wrapper justification

The grid retains mobile portrait-video proportions but deliberately removes the
social platform wrapper. The work isolates rapid circulation, repetition, and
desynchronisation rather than reproducing a feed or a dashboard.

## Code ownership

```text
app/(standalone)/grid/
  page.tsx                         # minimal experiment index
  [experiment]/page.tsx            # validates slug and selects the variant

components/standalone/grid/
  experiments.ts                   # grid/1 data and shared variant registry
  1/index.tsx                      # video field composition
  2/index.tsx                      # random image field and Leva controls
  3/index.tsx                      # mutable rectangular image composition
  4/index.tsx                      # persistent unit field with flash rectangles
  5/index.tsx                      # random-coordinate orthogonal composition
  model/
    field.ts                       # stable video-cell records
    media.ts                       # local video manifest
  media/
    video-cell.tsx                 # per-cell native video lifecycle
  screen/
    grid.module.css                # full-cover, centered shared geometry
```

`docs/README.md` is the repository-level index. This document owns the grid
family's visual, playback, media, and performance contract.

## `/grid/1` — independently timed video field

`grid/1` is declared in `components/standalone/grid/experiments.ts`.

- 80 stable cell IDs in a gapless `16 × 5` field.
- Five local H.264 `360 × 640`, 24 fps, silent source clips.
- Each cell receives a source, an initial normalized `phase`, and a
  `playbackRate` from the configured rate wave (`0.5`–`2`).
- Every cell loops independently; the same source may therefore align, drift,
  or recur at a different phase in another cell.
- Native videos use muted inline playback and metadata preload. Document
  visibility pauses them; reduced-motion preference pauses them as well.

The source manifest supports an image record too, but grid/1 currently uses
only its local video records.

### Grid/1 media provenance

The following test derivatives live in `public/video/videos/`. They are silent,
portrait-cropped H.264 files; the linked Commons descriptions remain the
authority for attribution and licensing.

| Local file | Source | License |
| --- | --- | --- |
| `67-dance.mp4` | [67 dance](https://commons.wikimedia.org/wiki/File:67_dance.webm), RowanJ LP | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `facepalm.mp4` | [Facepalm](https://commons.wikimedia.org/wiki/File:Facepalm.webm), Rattyexalt | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `youtube-poop.mp4` | [YouTube Poop – Guns Fucking Rule!](https://commons.wikimedia.org/wiki/File:YouTube_Poop_-_Guns_Fucking_Rule!.webm), RockosModernLifeFan848 | Public domain per source page |
| `cat-jump.mp4` | [Cat jumping backwards](https://commons.wikimedia.org/wiki/File:Cat_jumping_backwards.webm), Mary Qin | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |
| `cat-on-bed.mp4` | [Cat-on-bed](https://commons.wikimedia.org/wiki/File:Cat-on-bed.webm), Sora/OpenAI | Public domain per source page |

The two CC BY-SA derivatives retain their attribution and ShareAlike obligation
when redistributed.

## `/grid/2` — random image field

`grid/2` preserves the exact `16 × 5` full-cover geometry, but replaces video
decoders with a rapidly changing local image field. The only visible control is
the collapsed Leva panel in the top-right corner.

### Leva parameters

| Parameter | Default | Range | Meaning |
| --- | ---: | ---: | --- |
| `album` | `CAT` | `ALL`, `CAT`, `KISS`, `FRENCH` | Selects the source pool. |
| `speed` | `24` | `1`–`60` | Base image changes per second. |
| `speed diversity` | `0.72` | `0`–`1` | Random per-transition deviation around the base speed. |

### Album composition

| Album | Records | Source implementation |
| --- | ---: | --- |
| `CAT` | 20 | `components/dashboard/stock/4/model/cat-sources.json` |
| `KISS` | 62 | `components/dashboard/stock/4/model/kiss-sources.json` |
| `FRENCH` | 162 | 60 `bastilleDayImages` + 25 `good-sources.json` + 77 `dark-sources.json` |
| `POLITICIANS` | 60 | `components/standalone/grid/2/politician-sources.json`; one Commons-sourced political image per configured country |
| `ALL` | 304 | CAT + KISS + FRENCH + POLITICIANS |

`FRENCH` intentionally contains both national celebration/revolution imagery
and contemporary social tension. It is not limited to the Bastille Day
celebration set. `POLITICIANS` uses 60 local roughly-320px Commons derivatives selected
from a country-specific query ledger; see the [local image collection
method](../../../harness/local-image-collections.md) for collection and source
review rules. `POLITICIANS` is intentionally geographically distributed across
60 configured country records; it is not a claim that a single figure can
represent a country or its political reality.

### Playback contract

On album selection, the current pool clears and the selected local images are
decoded sequentially. The work begins after the first eight successfully
decoded images are available. Every later decoded image joins the same live
source pool immediately without restarting the visible field.

Each of the 80 cells owns only two abstract state values:

```text
current source index
next change timestamp
```

One `requestAnimationFrame` scheduler checks those timestamps. When a cell is
due, it chooses a uniform random index excluding its current image, calculates
a new random interval from `speed` and `speed diversity`, and changes only that
cell's image `src`. Cells do not follow a shared ordered sequence and do not
share a common beat. Reduced-motion preference stops the scheduler.

### Grid/2 performance contract

- No `setInterval` per cell.
- No React state update for animation time.
- No React rerender of the 80-cell grid or Leva panel per animation frame.
- One scheduler performs DOM updates only for cells whose own deadline has
  arrived.
- Only the selected album is decoded; `ALL` can grow to its full 304-image
pool in the background after the first eight images make the work visible.

This is materially lighter than grid/1's 80 independently decoded videos, but
`speed: 24` with high diversity can still produce a large number of image
source changes per second. Installation-machine runtime measurement remains
necessary before declaring a guaranteed frame rate.

## `/grid/3` — mutable rectangular image composition

`grid/3` isolates one change from Grid 2: how the changing image pool is
composed. It fills the viewport with a dense `28 × 16` rectangular base grid,
then groups its units into media tiles from `1 × 1` through `5 × 5`, including
`4 × 4`, `4 × 5`, and `5 × 4` blocks. Each local reconfiguration samples six
complete rectangular packings, then chooses the proposal with the strongest
mix of large squares, asymmetric blocks, and span diversity. Instead of a
global re-layout, a single staggered scheduler repeatedly chooses a local
neighbourhood, expands it only to include whole current tiles, and immediately
repacks that area. The field is therefore a **locally reconfiguring
variable-span grid**: its changes are dispersed and abrupt, not synchronized
movements or tile swaps.

The Grid 2-derived CAT, KISS, FRENCH, and POLITICIANS pool is decoded with the
same first-eight threshold and later grows sequentially in the background. A
single animation-frame scheduler changes the visible image of each active tile
independently at `72` changes-per-second—three times Grid 2's default—with
`0.72` speed diversity. The local layout scheduler waits a randomized `22`–`54ms` between
pulses and only replaces the tiles inside its selected region. Reduced-motion
preference freezes both the image changes and the composition after its initial
layout.

### Grid/3 preservation contract

```text
question:   How does variable rectangular scale alter the perception of a
            rapid, mixed-image field?
baseline:   /grid/2
mutation:   A dense 28 × 16 field abruptly and locally repacks media across
            a scored vocabulary of rectangular spans from 1 × 1 to 5 × 5.
invariants: Full-screen black ground; no feed wrapper, captions, or decorative
            chrome; local image pool; independent image changes; no per-tile
            timer.
evidence:   Local areas flicker into new scale, neighbourhood, and cropping
            relations while the rest of the field retains its current state.
```

## `/grid/4` — flash rectangles over a persistent unit field

`grid/4` forks Grid 3's dense `28 × 16` media scale, but rejects persistent
multi-unit layouts. Every base position remains a `1 × 1` image cell. At each
of 60 field iterations per second, fifteen to sixty `2 × 1` through `5 × 5`
image rectangles are placed above that base field. This is five times Grid 4's
original maximum appearance capacity. Each rectangle receives an
independent random lifespan from its next visible field tick to one second; it
then disappears, and an empty slot may later receive a new rectangle. Its
geometry persists for that lifespan, while its image continues to change on
every 60fps field iteration.

All rapid media is rendered through one canvas. Sources decode once and remain
in an in-memory image pool; each iteration selects and draws all 448 base cells
plus the active flashes without DOM image-source writes, React renders, layout,
or repeated decoder work. Placement first preserves non-overlap; once the dense
field cannot fit another rectangle, later flashes intentionally overflow over
existing ones so the requested quantity remains visible.

### Grid/4 preservation contract

```text
question:   What happens when variable rectangular media is only a brief
            interruption of a persistent image-unit field?
baseline:   /grid/3
mutation:   Remove every persistent multi-unit tile. Flash several temporary
            multi-unit image rectangles for a random duration up to one second.
invariants: Dense full-screen 1 × 1 field; black ground; local image pool;
            no feed wrapper, labels, movement interpolation, or per-cell timer.
evidence:   Rectangles are perceived as abrupt, short-lived media events, not
            as a layout that settles into place.
```

## `/grid/5` — random-coordinate orthogonal media field

`grid/5` isolates the coordinate system as its changed variable. It preserves
Grid 4's persistent media ground, rapid image iteration, and short-lived
rectangular interruptions, but removes the shared `28 × 16` lattice. The base
field is a guillotine partition: it begins as the full viewport and repeatedly
splits a randomly selected large region at a continuous random X or Y position.
The resulting 240 axis-aligned rectangles cover the screen exactly without
rows, columns, gaps, or snapped spans. Splits favour compact, near-cell-scale
regions so the visual rhythm is dominated by the equivalent of `1 × 1` media.

Six to twenty-two temporary rectangles appear above that covering partition.
Eighty-two percent are sampled from a compact, approximately square range; the
remaining larger rectangles are bounded to a much smaller maximum than the
first Grid 5 trial. Their X and Y positions remain continuous random values.
Placement first seeks non-overlap and then permits overlap when the field is too
dense, matching Grid 4's compositional pressure without borrowing its cell
coordinates. Geometry persists for an independently random lifetime of up to
one second while images continue changing at 60 field iterations per second.
The same decoded CAT, KISS, FRENCH, and POLITICIANS pool and single-canvas
rendering boundary remain in use.

### Grid/5 preservation contract

```text
question:   What happens to Grid 4's dense base-plus-flash composition when no
            element is positioned by a predefined shared lattice?
baseline:   /grid/4
mutation:   Replace every row, column, and integer span with continuous random
            axis-aligned bounds while retaining complete viewport coverage.
invariants: Full-screen image field; orthogonal rectangles; black ground;
            local media pool; rapid image changes; short-lived interruptions;
            no labels, feed wrapper, interpolation, or per-element timer.
evidence:   Pending direct observation. The implementation establishes the
            bounded trial but no browser/runtime result is claimed yet.
```

## Verification

Static checks last run after the current grid implementation:

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `git diff --check`

No browser/runtime claim is inferred from those checks. Browser verification
requires explicit authorization under repository rules.
