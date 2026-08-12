# 0806 duration

Route: `/0806/duration`
Date: 2026-08-06

## Preservation contract

```text
question:   Can a click become a visible duration rather than a stationary target?
baseline:   0806/compositional-grid.
mutation:   Each selected 1×1 cell records its creation time and grows only
            downward from one fixed present layer; an optional 2×2 media
            companion shares that temporal record.
invariants: click/drag selection, fish field behavior, media atlas, fish model,
            full-orbit camera input, controls, and the sparse field grammar.
evidence:   Earlier clicks become longer history below the same upper layer,
            while later clicks remain visibly shorter beside them.
```

## Trial

`duration` names the experiment after Bergsonian duration rather than a
time-lapse effect. The scene starts with no temporal columns. A selection at
time *t* creates one 1×1 media surface at the fixed current layer. Its pillar
length is derived each frame from `now − t`, so earlier selections always have
more accumulated length and no stored height drifts over time.

`Composition > 2×2+ blocks` is off by default. When enabled, each later
selection also seeds one locally offset 2×2 media pillar. The 1×1 cell remains
the only fish attraction target, while both sizes share a timestamp, growth
rate, media surface, and retained-strata behavior. Turning the option off
removes only the optional 2×2 layer; it does not alter the 1×1 records.

The exact-top camera remains the interaction view: media footprints stay
coincident with the selection grid. The current layer begins at a fixed
`700` world units, between the original centered duration layer and the aligned
media-top coordinate of `0806/compositional-grid`; the camera itself never
follows the growing columns. Alt/right-drag exposes the past as pillars
descending below that layer. Goldfish motion is vertically confined to a narrow
band immediately above the current layer rather than distributed through the
full historical depth.

## Rendering boundary

The field-texture mesh remains hidden. Columns and media tops use the existing
instanced meshes and atlas; new clicks add an instance rather than a mesh or
material. Only the current pillar matrices are updated per frame to reflect
elapsed time. Each rendered length is numerically capped at 4,800 world units.
The cap prevents unbounded transforms; tails can leave the camera frame well
before it is reached. This is an architectural bound, not a frame-rate
measurement.

## Media strata

`Field > media strata` is enabled by default. A media change closes the current
image interval into one retained stratum. The next image starts a new interval
at the fixed present layer; previously closed intervals occupy the pillar below
it, so a column becomes a sequence of image-time layers rather than having its
entire side texture replaced.

The image-speed control is deliberately bounded to `0`–`24` and defaults to
`12`. Strata use one
fixed-capacity (2,048-instance) GPU mesh with a ring buffer: a new image change
updates one instance’s cell position, source tile, and start/end times. Their
downward movement is derived in the vertex shader from one elapsed-time uniform,
not by moving every historical instance on the CPU each frame. Disabling the
toggle clears retained strata and restores the previous single-current-image
pillar behavior; re-enabling begins a new history from that moment.

At most 64 image transitions are admitted in one animation frame. Multiple
strata written in that frame are merged into one GPU attribute upload range.
This keeps a dense selection from turning a high requested image rate into a
burst of per-stratum draw calls or texture uploads.

The COMPANY atlas is a transparent logo atlas: its empty tile area is not
filled white. The current pillar, media top, and retained strata discard
transparent pixels, leaving only the logo glyphs rather than a rectangular
pillar background.
Fully black company marks are converted to white during the one-time atlas
build so they remain legible against the dark pillar; colored marks stay in
their original color. Other media atlases remain opaque.

`Duration > pillar growth` controls the time-to-length mapping from `0` to
`1000` world units per second (default `1000`). It updates the live pillar and all
retained strata through the same renderer parameter, so faster strata remain a
continuous stack rather than a separate visual mode.

The default media surface is COMPANY.

## Open question

At what rate does the downward accumulation remain perceptible as duration,
rather than becoming either an imperceptible increment or a graphic scale cue?
