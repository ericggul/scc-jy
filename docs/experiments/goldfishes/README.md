# Goldfishes

Code family: `components/goldfishes`

Routes:

- `/goldfishes/2d/1`: the former `/swarm/4`, with 200 agents by default and
  adjustable count and collision prevention.
- `/goldfishes/3d/1`: the shared field and attraction behavior rendered as 3D
  goldfish, with the selected-cell hard boundary disabled and 200 agents by
  default.
- `/goldfishes/3d/2`: an orthographic 3D variant whose swarm and selected-cell
  boundary behavior matches `/goldfishes/2d/1`.

The family is top-level because it is being developed as a larger experience,
not as another standalone swarm variant. The 2D variant was moved rather than
copied; `/swarm` now contains variants 1–3 only.

## Preserved interaction and model contract

All routes use `components/goldfishes/model/index.ts`. Click or
press-drag adds persistent grid cells and stable agent IDs distribute agents
across all selected cells. Enter or Space selects the central cell and Escape
clears all cells.

The 2D route and `3d/2` retain physically excluded cells. The `3d/1` route
preserves the same flocking, edge behavior, agent-to-cell assignment,
distributed perimeter targets, arrival steering, and orbit motion. Its only
model difference is that the selected-cell hard constraint is disabled:
entering a block no longer projects a fish to the nearest edge or reverses a
velocity component. Attention therefore remains visibly strong while boundary
crossing is continuous.

`3d/2` passes the shared model's `protected-perimeter` behavior at every
settling and simulation step. Its initial count, grid scale, flocking forces,
stable agent assignment, collision toggle, perimeter targets, arrival steering,
speed limits, and edge forces are therefore the same as `2d/1`. Its default
agent scale is `2`, with a `1`–`4` authoring range; collision clearance and
minimum distance scale through the same shared function used by `2d/1`. The
agent-count slider defaults to `100` and spans `0`–`250` in steps of `50`. The
remaining differences are presentation: Canvas glyphs in 2D versus instanced
volumetric fish, independent swim height, lighting, and an orthographic 3D
camera.

### 3D/2 naturalistic model

`3d/2` starts with a top-view-specific naturalistic model. It keeps the same
eight instanced fish-part meshes and geometries as the previous model and
changes only their per-instance transforms and existing materials.
The body is stouter, the peduncle is thicker and shorter, the paired pectoral
fins begin nearer the gill region, and the caudal fin is slightly canted so its
translucent fork remains legible from directly above. The default colour is a
warmer cultivated-goldfish orange.

The eyes remain normal goldfish eyes rather than telescope-eye anatomy, but are
deliberately enlarged and moved dorsolaterally. At the default scale they read
as convex, glossy organs from the orthographic top view instead of disappearing
inside the body silhouette. `Appearance > natural model` switches between this
model and the previous minimal model without rebuilding the scene or changing
the swarm state.

`Appearance > fish side 90°` is a controlled model-orientation comparison.
Off leaves every fish at its existing `0°` top orientation. On uses the fixed
orientation of a conventional aquarium side view: the lateral body surface
faces the viewer, the dorsal side stays toward the top of the screen, and fish
face left or right according to the horizontal sign of their current velocity.
The camera, orthographic projection, field plane, grid, selected white or media
cells, agent positions, swim heights, and all steering state remain unchanged.
Consequently the screen composition and attractor locations stay fixed while
only the fish's displayed orientation changes.

A browser comparison at 100 fish and scale `2` reported the same structural
renderer counts for both toggle states: 13 draw calls, 2 textures, and 224,002
triangles. Both ran at the browser's 60 FPS cadence in that check. This proves
that the toggle does not add meshes, textures, or geometry work; it is not a
frame-rate guarantee for other machines.

The 2D route retains its movement, field, count, scale, collision, corner
mark, and theme controls. Both 3D routes retain count, collision prevention,
scale, corner mark, colour, and theme controls, and add depth, tail motion, fin
opacity, full-orbit camera input, bounded zoom, and view reset. `3d/1` retains a
default count of 200 and a 50–1000 range; `3d/2` uses the 100 default and 0–250
range stated above. Both sliders advance in steps of 50.

Leva remains an authoring and parameter-adjustment surface, not the artwork's
visual wrapper. It stays collapsed, flat, monochrome, non-draggable, and limited
to one corner. Participant-facing controls must be designed separately if they
are later required.

## 2D glyph sets

`/goldfishes/2d/1` offers Cursor, Goldfish 1, Goldfish 2, Circle eye, and
Rectangle eye. Goldfish 1 is the initial glyph. Goldfish 3, 4, and 5 were
removed from this route only.

The two collage options use the 75 SVGs in each of:

- `public/goldfishes/goldfish-eye-collage-circle-75-svg`
- `public/goldfishes/goldfish-eye-collage-rect-75-svg`

Each agent ID maps to a stable position in one of four seeded shuffle orders.
Every consecutive group of 75 IDs therefore uses all 75 SVGs once, while later
groups use a different order. Assignment does not change per frame, so the eye
identity travels with the fish rather than flickering. Both sets are loaded
once and reused as canvas image sources. Their photographic eyes and fixed SVG
body fill are preserved; the fish-colour control is shown only for Goldfish 1
and Goldfish 2 on the `/2d/1` collage menu.

## 2D media attention surfaces

`/goldfishes/2d/1` exposes the one-line `Field > blocks` selector with `WHITE`,
`CAT`, `KISS`, and `POLITICIAN`. The selection, protected-cell collision,
attraction, agent rendering, and background field remain unchanged.

The 2D media implementation does not create an `<img>` per cell and does not
redraw the full field or fish canvas for an image change. A transparent media
canvas sits between the static background and moving-agent canvases. Each active
cell copies one tile from the shared 1024×1024 atlas only when its image changes;
White clears that layer and performs no media work. Atlas decoding is lazy,
limited to four concurrent images, isolated by surface, and retained for fast
switching while `/2d/1` remains loaded.

The nominal image-change rate is 24 per cell per second. To prevent a long
selection trace from multiplying that work without bound, the combined schedule
is capped at 960 cell draws per second and automatically lowers each cell's rate
when the selected-cell count and requested speed would exceed that budget.
Image changes remain independently staggered. The `Field > image speed` slider
sets the requested rate from 0 to 40 in both `/2d/1` and `/3d/1`. At `0`, every
selected cell freezes on its own current randomly assigned image; it does not
reset all cells to one shared frame. White still performs no playback work.
This is an architectural workload bound, not a browser FPS measurement.

## Primary grid scale

`/goldfishes/2d/1`, `/goldfishes/3d/1`, and `/goldfishes/3d/2` pass the shared
`GOLDFISHES_PRIMARY_GRID_SCALE` value of `2` into grid construction, producing
cells exactly twice the prior size. Only the grid cell geometry changes: fish
size, movement, collision clearance, and attention forces retain their existing
values. Reverting the experiment requires changing the one shared scale
constant from `2` back to `1`.

## 3D interface premise

1. **Participant situation:** one person observes and redirects a full-screen
   goldfish field.
2. **Primary parameter:** the persistent set of selected cells that attracts
   fish toward distributed targets around associated media locations.
3. **Perceptual job:** see fish gather around selected blocks while clearly
   reading height, body volume, heading, and tail movement. `3d/1` emphasizes
   perspective depth; `3d/2` emphasizes planar correspondence with `2d/1`.
4. **Interaction job:** preserve click, drag, and keyboard selection exactly.
   Left drag remains selection, while Alt-drag or right drag rotates the camera
   and the wheel changes distance.
5. **Wrapper justification:** orbiting 3D cameras turn the field into a spatial
   plane and permit inspection from every side without adding camera translation
   or replacing the established selection interaction. Orthographic projection
   in `3d/2` removes height-dependent screen-space displacement from its exact
   top-down comparison view.
6. **System family:** the dark/light neutral field, sparse corner marks,
   selected-cell contrast, and compact Leva panel remain shared with 2D.
7. **Removal test:** vertical separation, occlusion, lighting, body volume, tail
   articulation, and full-orbit camera inspection justify the 3D renderer.
   Labels, scenery, bubbles, and water decoration are absent because they do not
   clarify the interaction.

## Implemented rendering boundary

`/goldfishes/3d/1` uses Three.js `WebGLRenderer` with a perspective camera. Its
initial and reset view is exactly top-down; full-orbit camera input begins from
that overhead position. `/goldfishes/3d/2` uses `OrthographicCamera` with a
viewport-sized frustum. Its exact top-down view therefore preserves model-plane
positions and sizes regardless of each fish's rendered height.
The grid and selected cells are drawn into a canvas texture on a horizontal
plane. Pointer positions are ray-cast back onto that plane before entering the
shared field model. Fish move in the model's existing two axes while their
rendered height varies independently. Both 3D routes compute the original
perimeter targets and arrival steering. Only `3d/1` skips the 2D evacuation and
protected-cell collision routines, allowing fish to cross above a textured
block. `3d/2` runs those routines like `2d/1`.

Each numbered 3D variant owns its own route entry, screen implementation,
renderer, and stylesheet. `3d/2` does not import implementation code from
`3d/1`; changes to one version cannot alter the other's renderer or controls.
Both may import the family-level pure field model and media-atlas loader because
those are explicit cross-variant contracts used to compare swarm behavior, not
implementation owned by either numbered version.

Camera input changes only the active camera transform. It does not add fish
instances, geometries, simulation work, or draw calls. Its incremental
cost should therefore be small relative to simulation and fish rendering, but
this is an architectural expectation rather than a measured frame-rate claim.
Alt-drag or right-drag wraps both azimuth and elevation through complete
circles. The camera uses a continuously derived up vector so crossing either
vertical pole does not introduce a `lookAt` orientation flip.
The wheel range permits close inspection down to 28% of the fitted camera
distance and a wide overview up to 300%; the bounds prevent the camera from
crossing the field or drifting indefinitely.

Body, peduncle, tail, dorsal fin, paired side fins, and paired eyes are shared
`InstancedMesh` groups. The model is constructed locally from Three.js
geometries; no external 3D asset or asset licence is involved. Agent positions
and target behavior still come from the shared CPU model.

This structure is supported by the Three.js definition of `InstancedMesh`: many
objects sharing geometry and material can use different transforms while
reducing draw calls. It does not by itself prove a frame rate on the final
machine.

### Media attention surfaces

The one-line `Field > blocks` Leva selector switches selected cells between
`WHITE`, `CAT`, `KISS`, and `POLITICIAN`. White remains the default. The three
media modes use the corresponding local sets already maintained for `/grid/2`:
20 Cat images, 62 KISS images, and 60 Politician images. A surface change affects
only the selected blocks; the shared attraction, open-perimeter movement, fish
rendering, camera, and selection interaction are unchanged.

`/grid/2` uses 80 DOM images and changes each `src` independently. At its
default speed of 24 changes per second, that design can request up to 1,920 DOM
source changes per second. The 3D field therefore does not reuse that rendering
path. Each selected media set is decoded at most four images at a time and
composited once into its own 1024×1024, 8×8 texture atlas. Cat, KISS, and
Politician source directories occupy roughly 0.6 MB, 1.9 MB, and 2.6 MB
respectively. Loading is deferred until that mode and at least one selected cell
both exist. Each RGBA atlas occupies about 4 MiB before mipmaps and about
5.33 MiB with the full mipmap chain. If all three modes have been used, the
cached GPU atlases therefore occupy about 16 MiB.

All selected media cells share one `InstancedMesh`, so any media mode adds one
draw call regardless of selected-cell count. Per cell, the shader receives only
the current tile index. Attribute uploads happen only on a hard-cut transition
and are restricted to the active instance range. Playback state and valid
image-index ranges are isolated per surface. `Field > image speed` adjusts immediate
hard-cut playback from 0 to 40 changes per second; `0` freezes each cell on its
current random tile, and there is no interpolation
between images. White mode hides the mesh and skips all playback updates. Used
atlases stay cached so switching among previously
opened modes does not repeat decode and GPU upload work, while the temporary
source canvas can be garbage-collected after its GPU texture is created. A
late-loading previous mode cannot overwrite the currently selected surface.

In 3D media modes, the field texture no longer retains the White block beneath
the image plane. The plane extends one CSS pixel beyond each cell edge so
perspective antialiasing cannot reveal a white seam. White blocks remain
unchanged when `WHITE` is selected.

The browser A/B check used HTTPS at 1470×695, collision prevention off, two
selected cells, and three consecutive two-second windows after warm-up. The
test browser ran both modes at a fixed 30 FPS cadence:

| Agents | Surface | FPS | Mean frame CPU | Draw calls |
| ---: | --- | ---: | ---: | ---: |
| 200 | White | 30.0 | 2.377 ms | 13 |
| 200 | KISS | 30.0 | 2.310 ms | 14 |
| 500 | White | 30.0 | 5.091 ms | 13 |
| 500 | KISS | 30.0 | 4.364 ms | 14 |

The CPU differences are within run-to-run noise and do not show that KISS is
faster. They show no measurable regression in this run: cadence and maximum
frame interval stayed equal while the expected single draw call was added. Cat
and Politician use the same shader, atlas dimensions, instance attributes, and
draw-call count; their one-time source decode cost differs with file size.
Development builds expose the same two-second metrics on the interaction canvas
data attributes for future checks. These measurements are not a guarantee for
other hardware.

### Isolated model measurement

This is a historical benchmark recorded on Node 22.3.0; local development now
uses Node.js 26.5.1 and Vercel builds use Node 24.x. These figures have not been
remeasured under either current runtime. The shared CPU model was measured at
1920×1080 with one selected cell after a warm-up. The figures are mean time per
simulation step on the development machine; they exclude React, Three.js
rendering, Leva, media decoding, and browser scheduling.

| Agents | Collision prevention off | Collision prevention on |
| ---: | ---: | ---: |
| 200 | 0.122 ms | 0.495 ms |
| 500 | 0.420 ms | 1.289 ms |
| 1000 | 1.149 ms | 2.488 ms |

This measurement supports retaining the existing CPU model for the current
prototype. It is not an FPS estimate for the complete browser experience.

After the open-perimeter boundary was added, an isolated A/B run at 1536×900 with
one selected cell, collision prevention off, 80 warm-up steps, and 300 measured
steps produced the following mean model times on the same development machine:

| Agents | Protected perimeter | Open perimeter |
| ---: | ---: | ---: |
| 200 | 0.139 ms | 0.119 ms |
| 500 | 0.464 ms | 0.447 ms |

The same check asserted two separate invariants: away from a block, protected
and open modes produced identical position and velocity after one step; inside
a block, open mode preserved position and velocity while protected mode changed
them. These are isolated model results, not browser FPS or a guarantee for other
hardware.

## Consulting record

The decision is deliberately narrow:

- 2D remains the fastest path for the media-channel interfaces already built
  with React, DOM, and Canvas in `components/dashboard/stock/4` and
  `components/standalone/bastille-day`.
- 3D is used only for the central fish field, where perspective, height, body
  volume, and tail motion add visible value.
- The existing CPU spatial hash is retained for 50–500 fish because the current
  model already uses local neighbour lookup and the new renderer does not
  require a new motion model.
- Unreal is not introduced because it would add a
  separate runtime and integration boundary without being required by the
  present interaction.
- WebGPU is not a requirement. Three.js currently describes its
  `WebGPURenderer` as experimental, while `WebGLRenderer` remains the maintained
  production path for WebGL 2 applications.

The following are not established facts and must not be documented as such:

- that 500 fish will meet a specific frame rate on the final computer;
- that GPU simulation, workers, LOD, texture atlases, or external models are
  required;
- that 3D is visually superior before it is reviewed on the target display;
- that media decoding will be the dominant bottleneck in the final combined
  installation.

Those questions require measurement after the media layer and target hardware
are known. The current implementation provides count controls for that later
measurement but does not claim the result.

LUMA's public `Living Landscape` page describes an interactive installation in
which audience presence and choices affect the work, but it does not disclose
the rendering engine or software architecture. It is therefore a reference for
the installation relation, not evidence for choosing a particular engine.

Official references:

- LUMA, `Living Landscape`:
  https://luma.org/en/arles/whats-on/drift-living-landscape
- Three.js `InstancedMesh`: https://threejs.org/docs/pages/InstancedMesh.html
- Three.js `WebGPURenderer`: https://threejs.org/manual/en/webgpurenderer
- Three.js `MeshPhysicalMaterial` cost note:
  https://threejs.org/docs/pages/MeshPhysicalMaterial.html

## Failures not to repeat

A previous deleted variant changed locomotion while presenting itself as only a
visual fish variant. Presentation changes must not silently create new speed
limits, steering rules, boundary behavior, avoidance forces, or collision
behavior. The 3D open-perimeter mode is an explicit boundary change requested
for this route; it remains isolated behind the shared model's
`AttentionZoneBehavior` option so the 2D routes preserve their contract and the
shared attraction logic remains identical.

Earlier goldfish glyph attempts also failed in opposite directions: extra
anatomical and decorative detail weakened the minimal field, while aggressive
geometric reduction removed the high back, rounded body, compact head, narrow
peduncle, and broad concave tail that make a small mark read as a goldfish.
Future visual changes must retain those recognition features without adding
scenery, breed imitation, ornamental anatomy, or explanatory names.

The first 3D implementation also failed because it used an orthographic camera,
kept every fish parallel to the screen, rendered the field as a separate flat
backdrop, and varied camera-axis depth by only a few pixels. Although it used
3D geometry, those decisions suppressed the visual evidence of 3D and made the
result functionally indistinguishable from the 2D field. Do not treat the use
of Three.js or extruded geometry as sufficient. A 3D variant must expose
spatial relationships through the actual view and interaction mapping.

The first attention adaptation failed by retaining the 2D protected-cell
constraint in 3D. Fish were still projected to the nearest cell edge with a
reversed velocity, creating visible head-butting and bounce behavior. The next
adaptation overcorrected: it replaced perimeter attraction with distributed
interior points, lateral-only steering, and release after passage, which removed
the visible gathering and intertwining that attention was meant to produce.
The correct scope is narrower: preserve the entire attraction calculation and
disable only hard boundary projection and velocity reflection.
