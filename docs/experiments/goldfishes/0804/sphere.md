# Goldfishes 0804/sphere

Date: 2026-08-04

Route: `/goldfishes/0804/sphere`

Short description: **Atlas-textured spheres distributed through the attention volume.**

## Interface premise

1. **Participant situation:** one person selects cells while observing and
   orbiting a school of goldfish in a full-screen spatial field.
2. **Primary parameter:** the vertical position of the sphere attached to each
   selected attention cell.
3. **Perceptual job:** read the selected cells as points occupying different
   depths of one volume rather than as blocks rising from a plane.
4. **Interaction job:** clicking or dragging places spheres and attracts fish to
   the corresponding XZ cell perimeter; orbit and zoom reveal their separation.
5. **Wrapper justification:** the sphere removes the directional face and
   vertical-axis emphasis of the pillar while keeping each visible object tied
   to an operational attraction cell.
6. **System family:** the grid footprint, fish model and motion, selection
   behavior, media collections, authoring controls, camera scale, and monochrome
   field remain aligned with `0804/pillars`.
7. **Removal test:** there are no labels, legends, panels beyond the existing
   collapsed authoring surface, rectangular media planes, or decorative spatial
   guides. Removing a sphere would remove a selected attraction point.

## Geometry and texture contract

Each selected cell creates one instanced sphere. The current cell-width diameter
is its minimum size. A separate stable hash samples its volume uniformly from
1× through 8× that base volume; the cube-root conversion means its diameter
ranges from 1× through 2×. These limits are named renderer constants so the
range and volume basis can be revised directly. Sphere spacing has no touching,
separation, or overlap constraint.

The sphere's XZ center remains exactly aligned with the selected cell and the
fish attraction target. Another stable hash assigns its center along the
vertical range used by `0804/pillars`: the same 6× camera scale and 1,080-unit
attention extent. Each sampled radius is included when calculating the available
height, keeping the complete sphere above the field plane and inside the volume.

Cat remains the initial surface. White and the Company, KISS, and Politician
collections use the same local atlas loaders, per-cell tile assignment, and
independently staggered playback behavior as the pillar experiment. The atlas
is mapped directly onto the sphere UVs and receives restrained directional
shading so its curvature remains visible. No rectangular cap or media plane is
rendered.

`Field > sphere rotation` controls rotation from `0` through `2`, with `0.25` as
the default. Each sphere receives a stable signed rate variation. Rotation runs
in the vertex shader from one shared angle uniform, so animation retains one
instanced sphere draw rather than updating an object matrix or adding a draw call
for every sphere. Reduced-motion mode freezes the shared elapsed time.

The directory is a complete standalone experiment copy. It owns its model,
renderer, screen, styles, atlas implementations, and media-source ledgers and
does not import implementation from another Goldfishes experiment.
