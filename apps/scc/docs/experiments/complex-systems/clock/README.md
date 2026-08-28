# Recursive clock experiment

Route: `/clock/1`, owned by the filesystem-only `complex-systems` group.

Date: 2026-08-28.

## Interface premise

1. **Participant situation:** one person encounters an uninterrupted field of
   analogue clocks, each held at the tip of an earlier clock hand.
2. **Primary parameters:** child-clock radius ratio, initially `0.50`, and
   descendant depth, initially `4`.
3. **Perceptual job:** follow how the three distinct hour, minute, and second
   rotations branch into increasingly small, overlapping clock paths.
4. **Interaction job:** open the lower control bar, adjust scale or depth, and
   anticipate whether the recursive field opens or contracts. Trace may be
   enabled to record the actual moving centers of descendant clocks.
5. **Wrapper justification:** a clock face, its hands, and the attachment point
   are the model's literal geometry. The field has no title, legend, dashboard,
   timer, or artificial presentation motion.
6. **System family:** no prior complex-systems visual grammar is inherited. The
   warm hand colours are functional: gold identifies hour hands, ivory minute
   hands, and rust second hands—the three possible holding relations.
7. **Removal test:** clock rims, hand colours, centers, the compact expandable
   control bar, and trace remain. Numerals, metadata, pause/reset controls, charts,
   and decorative backgrounds do not improve the recursive relation.

## Model card — clock/1

- **System object and boundary:** a deliberately synthetic, deterministic
  kinematic tree of analogue clocks. This is a composition of rotations that
  references the visual accumulation of a pendulum chain; it makes no claim to
  be a double-pendulum or mechanical clock simulation. There are no masses,
  joints, torques, gravity, energy transfer, or chaos calculation.
- **Entity state and local action:** every clock stores a stable lineage ID,
  depth, center, radius, local phase, and rate. It exposes an hour, minute, and
  second hand at conventional clockwise periods. Each hand places one child
  clock exactly at its own tip. A child inherits a fixed phase increment and a
  modest rate multiplier from the hand holding it (`0.86`, `1.00`, or `1.14`),
  preventing the tree from collapsing into three synchronized copies while
  preserving the internal hour/minute/second relation of each clock.
- **Shared state:** the tree is a pure geometric derivation of elapsed time,
  child-radius ratio, and recursion depth. It has no hidden random state. The
  optional trace is a renderer-side record of the derived clock centers, never
  an input to the clock geometry.
- **Macro observable:** the outer envelope and the density of crossings emerge
  from repeated hand-tip attachment; they can change only when the defined
  rotations and radius relation are changed.
- **Participant intervention and contrast:** the expandable control bar changes
  the actual radius multiplier, clamped to `0.42–0.62`, and the descendant
  depth from `1` through `6`. The default remains four descendant generations
  beneath the root (121 clocks total); higher depths are explicit rather than
  silently added. The root begins at the browser's current local clock time.
- **Causal checks:** pure-model tests assert the complete three-way tree count,
  exact child-to-parent hand-tip attachment, conventional hand orientation, and
  a root-clock diameter equal to `0.8 × min(viewport width, viewport height)`.
  Descendant clocks may intentionally extend past the viewport at that scale.

## Bounded trial

- **Baseline:** a new field-first recursive-rotation study; no previous SCC
  visual route is treated as its design baseline.
- **Changed variables:** child-radius ratio and explicit descendant depth; trace
  records, but does not alter, the same geometric state.
- **Retained invariants:** every clock has all three hands, every hand carries a
  child until the selected depth, the root is centered with a diameter of
  `0.8 × min(viewport width, viewport height)`, and child centers equal their
  parent hand tips.
- **Observed result:** pending an explicit browser-verification request.
- **Unresolved question:** should a later, separate route vary the branching
  rule itself (for example, only minute-hand inheritance) while preserving this
  four-generation baseline?
