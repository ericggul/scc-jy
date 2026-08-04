# Goldfishes 0804/html

Date: 2026-08-04

Route: `/goldfishes/0804/html`

Short description: **Live HTML controls as reversible attraction targets.**

## Experiment contract

- **Question:** can an HTML element become an operational part of the swarm
  rather than an image placed on an existing attention rectangle?
- **Baseline:** `default`, copied as a complete standalone experiment.
- **Mutation:** every selected cell becomes a native HTML button. Its pressed
  state determines whether that cell is included in the fish attraction model.
- **Invariants:** the model, fish anatomy and motion, grid scale, selected-cell
  footprint, protected perimeter, exact-top orthographic composition, orbit,
  zoom, theme, palette, keyboard selection, and collapsed authoring surface.
- **Evidence:** toggling a button must visibly release or restore the fish that
  gather around its corresponding cell while the HTML element remains aligned
  with the field through camera orbit and resize.

## Interface premise

1. **Participant situation:** one person creates targets in a full-screen
   goldfish field, then directly operates the targets that were created.
2. **Primary parameter:** each HTML button's native pressed state.
3. **Perceptual job:** notice that fish gathering changes when the visible HTML
   control changes between `release` and `attract`.
4. **Interaction job:** selection creates an active control; pressing it removes
   that cell from the attraction model, and pressing it again restores it.
5. **Wrapper justification:** HTML is not shown as source code or a webpage
   screenshot. A native button is used because its semantic and interactive
   state performs the same on/off relation consumed by the swarm model.
6. **System family:** the target occupies the baseline cell footprint and keeps
   the default field, fish, camera, and sparse visual grammar.
7. **Removal test:** removing the button removes both the participant action and
   the state that governs attraction. No title, caption, browser mockup, media
   feed, decorative code, or explanatory panel is added.

## Implementation boundary and uncertainty

The HTML targets are native DOM buttons placed in a Three.js `CSS3DRenderer`
scene that shares the WebGL scene's orthographic camera. The WebGL fish remain
instanced; HTML is not rasterized into the media atlas. Target identity follows
the current grid-cell coordinate, so ordinary redraws and theme changes retain
state; a resize that remaps an anchor to a different grid coordinate creates a
new target identity.

This establishes an operational coupling, but whether the result is compelling
as performance remains an artistic judgment that has not been verified through
a browser encounter. The current trial deliberately uses one elementary HTML
verb. A miniature webpage, iframe, video, or changing feed would add content and
rendering cost without becoming more performative unless its own state also
entered the swarm relation.
