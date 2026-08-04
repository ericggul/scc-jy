# Goldfishes 0804/html

Date: 2026-08-04

Route: `/goldfishes/0804/html`

Short description: **Live HTML forms as bidirectional attraction targets.**

## Experiment contract

- **Question:** can an HTML element become an operational part of the swarm
  rather than an image placed on an existing attention rectangle?
- **Baseline:** `default`, copied as a complete standalone experiment.
- **Mutation:** every selected cell becomes a native HTML fieldset. Its checkbox
  determines whether the cell participates, its range input changes attraction
  strength and target share, and its meter reports nearby fish.
- **Invariants:** the model, fish anatomy and motion, grid scale, selected-cell
  footprint, protected perimeter, exact-top orthographic composition, orbit,
  zoom, theme, palette, keyboard selection, and collapsed authoring surface.
- **Evidence:** changing a form must release, restore, or redistribute fish, and
  the form's output must respond to the resulting local population while the
  HTML element remains aligned through camera orbit and resize.

## Interface premise

1. **Participant situation:** one person creates targets in a full-screen
   goldfish field, then directly operates the targets that were created.
2. **Primary parameter:** each fieldset's native checkbox and range state.
3. **Perceptual job:** notice both the swarm responding to the form and the live
   population meter responding to the swarm.
4. **Interaction job:** unchecking `gather` removes the cell from the model;
   changing `pull` changes its force and its share of assigned fish.
5. **Wrapper justification:** HTML is not shown as source code or a webpage
   screenshot. Native form state is used because the same values are consumed
   by the swarm model and rewritten by observation of the resulting swarm.
6. **System family:** the target occupies the baseline cell footprint and keeps
   the default field, fish, camera, and sparse visual grammar.
7. **Removal test:** removing the form removes both participant control and the
   local population feedback. No title, caption, browser mockup, media
   feed, decorative code, or explanatory panel is added.

## Implementation boundary and uncertainty

The HTML targets are native DOM fieldsets placed in a Three.js `CSS3DRenderer`
scene that shares the WebGL scene's orthographic camera. The WebGL fish remain
instanced; HTML is not rasterized into the media atlas. Target identity follows
the current grid-cell coordinate, so ordinary redraws and theme changes retain
state; a resize that remaps an anchor to a different grid coordinate creates a
new target identity.

This establishes an operational coupling, but whether the result is compelling
as performance remains an artistic judgment that has not been verified through
a browser encounter. The current trial deliberately uses one elementary HTML
form. This is more structurally complex than a single button because checkbox,
range, output, and meter values form a two-way causal loop. A miniature webpage,
iframe, video, or changing feed would add content and rendering cost without
becoming more performative unless its own state also entered that loop.

## Verification record

On 2026-08-04, TypeScript and ESLint passed, and the running local HTTPS route
returned `200` with the HTML experiment and CSS3D renderer chunks present.
Chrome interaction testing did not proceed beyond its privacy screen because
that browser profile did not trust the local `SCC-Dev-Root-CA`. No certificate
warning was bypassed. Visual alignment, live form interaction, population
feedback, and dense-target frame cost therefore remain unmeasured.
