# Goldfishes 0804/node-edge

Date: 2026-08-04

Route: `/0804/node-edge`

Short description: **Entropy-generated 3D topology as a persistent attraction field.**

## Interface premise

1. **Participant situation:** one person encounters a full-viewport spatial
   network occupied by the existing Goldfishes school.
2. **Primary parameter:** the randomly regenerated network of node positions,
   connectivity, and elevations.
3. **Perceptual job:** begin with the school alone, then see a connected
   structure become perceptible as the participant reveals its latent nodes.
4. **Interaction job:** click or left-drag reveals nearby nodes and the edges
   whose endpoints have both been revealed. Alt-drag or right-drag retains the
   full orbit camera; the wheel retains bounded zoom. The initial and reset
   camera remain deliberately oblique so revealed 3D height is immediately
   legible.
5. **Wrapper justification:** every rendered node is also an attraction target.
   Edges expose the neighborhood relation used to perceive the generated field;
   there is no unrelated graph, map, status layer, or explanatory chrome.
6. **System family:** the naturalistic fish geometry, movement constants,
   protected-target behavior, media atlas, theme behavior, and collapsed
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

## Three-dimensional swarm contract

The node-edge experiment now owns a genuine three-axis CPU swarm. Each fish
stores `x`, `y`, and `z` position and `vx`, `vy`, and `vz` velocity. The field's
existing `x/y` projection continues to map to world `X/Z`, while model `z` maps
to world elevation. This preserves pointer, topology, resize, and camera
contracts without treating elevation as a renderer-only effect.

Alignment, cohesion, and separation use full 3D distance and accumulate all
three velocity or position components. Neighbor lookup uses a three-dimensional
spatial hash and inspects the 27 adjacent buckets. Enabling `avoid overlap`
likewise resolves pair penetration and impulse along the actual 3D contact
normal rather than separating projected silhouettes in a plane.

Each rendered topology node supplies the same `x`, `y`, elevation, and radius to
the movement model. A fish retains stable node assignment, but approaches a
slowly moving point on a spherical shell around that node. The shell changes
azimuth and vertical direction, so arrival steering, deceleration, circulation,
and subsequent departure all use 3D distance and velocity. The existing
`Motion > depth` parameter now changes the target's vertical spread inside the
model rather than adding a visual-only height offset after simulation.

Protected-target behavior is spherical. When a fish enters a node core, the
model moves it to the nearest 3D surface point and reflects only the inward
component of velocity along the surface normal. This replaces the inherited 2D
rectangle-edge projection and horizontal/vertical bounce. Vertical boundary
forces and clamping are derived from the topology's minimum and maximum
elevations with responsive padding.

The renderer no longer assigns height from fish ID or eases toward a separate
target-height array. It places each fish at the model's `z` and aligns the
fish's local forward axis to the complete 3D velocity vector. Climbing and
diving therefore change body pitch as a consequence of movement rather than as
an unrelated animation.

The following remain invariant: node generation and edge geometry, fish count
and speed limits, naturalistic anatomy, tail motion, scale controls, attraction
assignment, camera and pointer grammar, atlas loading and playback, palette,
full-viewport composition, and the experiment's standalone ownership boundary.

## Rendering and simulation coupling

Three.js renders every edge as one instance of a low-sided cylinder and every
node as one instance of an icosahedron. The complete network therefore adds two
draw calls rather than one mesh or material per edge. Standard materials and the
existing scene lights provide depth through restrained surface response; there
is no glow or flat canvas duplicate. The invisible mathematical floor remains
available for established pointer ray-casting but does not create a visible
rectangular plane beneath the topology.

The same projected node list creates the CPU model's persistent spatial targets.
Node elevation and radius are no longer discarded at the model boundary.
Optional media planes remain at their corresponding node elevations.

## Progressive reveal contract

The generated topology is latent on first load: no network node, network edge,
media plane, or topology attention target is active. The Goldfishes school keeps
the current three-dimensional swarm behavior with an empty target list.

A click or left-drag projects every latent 3D node through the current camera and
activates nodes within a responsive screen-space brush radius. This keeps reveal
aligned with the cursor after orbiting and across large elevation differences;
activation is cumulative.
Nodes ease from zero to full scale. An edge becomes eligible only after both of
its endpoint nodes are active, then grows from its first endpoint toward the
second while its thickness resolves. This reveal animation changes only instance
matrices; it does not alter node generation, edge connectivity, or swarm math.

Only active nodes are passed to the existing model as `SelectedCell` targets, so
the visual diagram and attention field remain the same object. `Escape` clears
the manually revealed set. `Field > show all` temporarily activates every node,
edge, and attention target; switching it off restores the accumulated manual
reveal rather than discarding it. Reduced-motion preference resolves visibility
immediately instead of animating it.

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

The 3D swarm conversion was implemented on 2026-08-04 and statically checked at
the node-edge ownership boundary. A model-only run compiled the local model and
advanced 36 fish for 480 frames at 60 steps per second against one protected 3D
node with `avoid overlap` enabled. All positions and velocities remained finite;
the final fish elevation span was `72.14`, 30 of 36 fish had `|vz| > 1`, the
nearest fish-to-node-centre distance was `51.51` against a protected radius of
`21`, and the nearest fish-pair distance was `36`, equal to the configured 3D
collision distance. These are deterministic model invariants for that isolated
run, not a frame-rate measurement or a visual-quality judgment.

The same static pass confirms that the local model, screen, topology projection,
and renderer agree on the new 3D state shape. It does not claim that the new
motion has been visually reviewed in a browser. The previous browser
observations above describe the topology and rendering setup before this
movement-model conversion.

The progressive-reveal adaptation was statically verified after that conversion.
It preserves the current model file and changes only topology selection, renderer
instance visibility, and the screen's interpretation of the existing pointer
gesture. Browser visual verification of this later interaction is not claimed in
this record.
