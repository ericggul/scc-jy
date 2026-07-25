# Grid

`grid` is a standalone, installation-scale family of full-screen portrait media
fields. It is registered at `/grid` and has two variants: `/grid/1` and
`/grid/2`.

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
| `ALL` | 244 | CAT + KISS + FRENCH |

`FRENCH` intentionally contains both national celebration/revolution imagery
and contemporary social tension. It is not limited to the Bastille Day
celebration set.

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
- Only the selected album is decoded; `ALL` can grow to its full 244-image
  pool in the background after the first eight images make the work visible.

This is materially lighter than grid/1's 80 independently decoded videos, but
`speed: 24` with high diversity can still produce a large number of image
source changes per second. Installation-machine runtime measurement remains
necessary before declaring a guaranteed frame rate.

## Verification

Static checks last run after the current grid implementation:

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `git diff --check`

No browser/runtime claim is inferred from those checks. Browser verification
requires explicit authorization under repository rules.
