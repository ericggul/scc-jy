# 0806 temporal decay

Route: `/goldfishes/0806/temporal-decay`  
Date: 2026-08-06

## Preservation contract

```text
question:   What changes when a media stratum is active for a short period but
            leaves a fixed historical column behind?
baseline:   0806/duration.
mutation:   Each clicked 1×1 block becomes inactive after one adjustable
            lifetime; its pillar and retained media strata then freeze in place.
invariants: click/drag selection, fish field behavior, media atlas, hard-cut
            playback, current-layer camera framing, controls, and sparse field
            grammar.
evidence:   A click produces a vertically growing, media-changing trace which
            stops at its lifetime boundary without disappearing.
```

## Trial

`temporal-decay` names the ending of activity, not deletion of its trace.
The field starts empty. A click creates a 1×1 block at the same fixed present
layer as `0806/duration`; it grows downward and can accumulate image strata
while it remains active. At the end of its own lifetime, fish attraction, media
playback, and vertical growth end together. The current pillar and every
retained stratum remain at the exact length and depth reached at that boundary.

`Decay > block lifetime` ranges from `0.1` to `10` seconds and starts at `1`.
The lifetime is measured from the click, not from the latest media change. A
later click therefore remains active after an earlier block has frozen.
`pillar growth`, image speed, and `media strata` retain the duration controls
and behavior during each block's active interval.

`Composition > 2×2+ blocks` is off by default. When enabled, each selection
also creates one locally offset 2×2 media pillar with the same creation and end
time. The 1×1 cell alone remains a fish target; both footprints freeze together
at the end of the block lifetime. Disabling the option only stops and clears
the optional 2×2 companions.

## Rendering boundary

The experiment keeps duration's instanced current pillars and fixed-capacity
(2,048 instance) media-strata mesh. The end boundary is processed once per
block: it writes a frozen time to the existing GPU instances, then stops that
block's fish and media work. The renderer does not delete or re-create a frozen
pillar each frame; its depth is clamped in the shared pillar calculation and in
the media-strata vertex shader. A 2,048-anchor cap bounds persistent records;
this is an architectural workload bound, not a browser frame-rate measurement.

## Open question

At what lifetime does a frozen trace read as an ended event rather than a
second form of indefinite accumulation?
