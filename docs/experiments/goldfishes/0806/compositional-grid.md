# 0806 compositional grid

Route: `/goldfishes/0806/compositional-grid`  
Date: 2026-08-06

## Trial

Starting directly from `0804/pillars`, this trial separates the persistent,
user-selected attention cells from a second media layer. The new layer occupies
the same fine rectangular base grid with 2×2 cells only.
It starts empty; every newly selected cell creates one local rectangle directly
around that click. No cells are generated, shuffled, interpolated, or removed
without an interaction.

## Retained invariants

- Goldfish motion, attraction, collision option, selection gestures, camera
  controls, field palette, and media source choices remain those of the fork.
- Only selected 1×1 cells affect the cursor-field simulation. Composition cells
  are visual media structures, not hidden force fields.
- Existing Field media speed remains the single control for image iteration.

## Parameters and performance boundary

`Composition > 2×2+ blocks` is enabled by default. When disabled, clicks retain
the ordinary 1×1 pillars while all larger composition blocks are hidden.
Composition also owns its maximum cell count. It uses two additional instanced
meshes—one pillar mesh and one media-top mesh—with bounded capacity (72 cells).
Matrix and atlas attributes update only when a selection adds or clears a local
rectangle; animation frames do not allocate or rebuild the grid.

`Arrangement > align image tops` is enabled by default. It gives every media
surface one shared upper plane and lets each pillar’s length extend only below
that plane. The underlying field-texture plane is hidden in this variant.

## Open question

How does the fixed 2×2 extension change the relation between the user’s 1×1
selection gesture and the larger media structure that it immediately reveals?
