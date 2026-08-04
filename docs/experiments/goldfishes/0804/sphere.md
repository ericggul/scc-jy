# Goldfishes 0804/sphere

Date: 2026-08-04

Route: `/goldfishes/0804/sphere`

Short description: **Pointer-placed textured spheres distributed through a spatial volume.**

## Interface premise

1. **Participant situation:** one person places spheres while observing and
   orbiting a school of goldfish in a full-screen spatial field.
2. **Primary parameter:** the continuous XYZ position of every sphere along the
   camera ray cast by its pointer event.
3. **Perceptual job:** read independently placed points occupying different
   positions and depths within one rectangular volume.
4. **Interaction job:** clicking casts a ray through the pointer and samples a
   sphere center along the part of that ray inside the spatial volume. Its
   projected center therefore appears at the pointer in top and orbit views;
   dragging samples the continuous pointer path.
5. **Wrapper justification:** the sphere removes the directional face and
   vertical-axis emphasis of the pillar while keeping each visible object tied
   to an operational attraction point.
6. **System family:** fish model and motion, media collections, authoring
   controls, camera scale, and monochrome field remain aligned with
   `0804/pillars`; its grid and rectangular selection grammar do not.
7. **Removal test:** there are no labels, legends, panels beyond the existing
   collapsed authoring surface, rectangular media planes, or decorative spatial
   guides. Removing a sphere would remove a selected attraction point.

## Geometry and texture contract

Each click creates one instanced sphere with a stable numeric ID and normalized,
continuous XYZ anchor. There is no grid coordinate, floor-plane placement, cell
snapping, selected-cell rectangle, dot field, or crossing field. A ray-box
intersection finds the visible segment inside the rectangular spatial volume;
a stable per-sphere sample selects one point on that segment. Sphere centers
remain inside the floor footprint and their full diameters remain inside the
vertical extent. Normalized anchors preserve relative XYZ placement on resize.

The former default cell width is retained only as a responsive minimum-diameter
scale of 40–60 units; it no longer defines positions or discrete regions. A
separate stable hash samples each sphere's volume uniformly from
0.5³× (0.125×) through 2³× (8×) that base volume; the cube-root conversion means
its diameter ranges from 0.5× through 2×. These limits are named model constants so the
range and volume basis can be revised directly. Sphere spacing has no touching,
separation, or overlap constraint.

The pointer ray determines X, Y, and Z together rather than assigning height
after a 2D placement. The sampled point's XZ coordinate is also the fish
attraction target. Fish perimeter and protection calculations are circular
around the sampled radius rather than rectangular. The volume retains the same
6× camera scale and 1,080-unit vertical extent as `0804/pillars`.

Cat remains the initial surface. White and the Company, KISS, and Politician
collections use the same local atlas loaders, per-point tile assignment, and
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
