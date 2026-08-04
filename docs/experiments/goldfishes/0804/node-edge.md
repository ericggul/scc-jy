# Goldfishes 0804/node-edge

Date: 2026-08-04

Route: `/goldfishes/0804/node-edge`

Short description: **Entropy-generated 3D topology as a persistent attraction field.**

## Interface premise

1. **Participant situation:** one person encounters a full-viewport spatial
   network occupied by the existing Goldfishes school.
2. **Primary parameter:** the randomly regenerated network of node positions,
   connectivity, and elevations.
3. **Perceptual job:** see a school distribute through a connected structure
   whose density, node hierarchy, and large height changes are immediately
   visible from the initial view.
4. **Interaction job:** Alt-drag or right-drag retains the full orbit camera;
   the wheel retains bounded zoom. The initial and reset camera are deliberately
   oblique rather than exact-top because this experiment must expose 3D height
   without requiring discovery of the camera gesture.
5. **Wrapper justification:** every rendered node is also an attraction target.
   Edges expose the neighborhood relation used to perceive the generated field;
   there is no unrelated graph, map, status layer, or explanatory chrome.
6. **System family:** the naturalistic fish geometry, CPU movement model,
   protected-perimeter targeting, media atlas, theme behavior, and collapsed
   authoring panel remain local copies of the Goldfishes 3D family.
7. **Removal test:** labels, legends, flat background grids, metrics, captions,
   and ornamental panels are absent. Removing the node-edge structure would
   remove the experiment itself.

## Random topology contract

The topology is generated on each full page load from `crypto.getRandomValues`,
using the browser's cryptographically secure entropy source rather than a fixed
seed or deterministic pseudo-random sequence. Resizing the same mounted page
reprojects the existing topology instead of replacing it; reloading creates a
new one.

Node count scales from 240 to 520 according to initial viewport area. Rejection
sampling varies local separation and node radius while a perturbed superellipse
keeps the irregular network within roughly 1.2% of the viewport edges. This lets
the structure occupy the full screen rather than presenting a centred diagram
inside a large empty field. A Bowyer-Watson triangulation produces the planar
neighbor graph; its edges are deduplicated before rendering.

Elevation is also regenerated from entropy. Seven random influence centres and
three random-phase wave components create a continuous height field, with small
local perturbations and normalization to the full positive/negative range. The
continuity prevents unrelated adjacent nodes from producing a wall of vertical
spikes while retaining clearly different peaks, valleys, and slopes.

## Rendering and simulation coupling

Three.js renders every edge as one instance of a low-sided cylinder and every
node as one instance of an icosahedron. The complete network therefore adds two
draw calls rather than one mesh or material per edge. Standard materials and the
existing scene lights provide depth through restrained surface response; there
is no glow or flat canvas duplicate. The invisible mathematical floor remains
available for established pointer ray-casting but does not create a visible
rectangular plane beneath the topology.

The same projected node list creates the CPU model's persistent attention cells.
Fish retain the existing XZ movement, steering, collision option, scale, anatomy,
and tail motion. Each fish's rendered height follows the elevation of its stable
node assignment with a small per-fish offset and slow oscillation. Optional media
planes are likewise placed at their corresponding node elevations.

The experiment directory owns its model, renderer, screen, styles, atlas code,
and media-source ledgers. It imports no implementation from another Goldfishes
experiment.

## Verification record

On 2026-08-04 the HTTPS browser check used a 1470×863 viewport. Consecutive full
reloads produced visibly different topology, height field, node hierarchy, and
fish distribution. The network reached all four viewport edges in the initial
oblique view. Alt-drag exposed the spatial separation without console errors.
The same pass confirmed three full-viewport canvases, TypeScript success, and a
clean ESLint run. These observations describe that development run and are not
a frame-rate guarantee for other hardware.
