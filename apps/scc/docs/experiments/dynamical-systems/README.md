# Dynamical-systems experiments

This family holds runnable studies whose primary material is a defined
time-evolving state: an ODE, discrete map, orbit, or related deterministic
system. It is separate from `complex-systems`: a mathematical connection is not
permission to inherit that family’s routes, visual language, or model claims.

## Family contract

- A group owns `components/dynamical-systems/[group]/`, its registry, a thin
  `app/(dynamical-systems)/[group]/[experiment]/page.tsx` dispatcher, and its
  matching documentation folder.
- `components/dynamical-systems/navigation/model/` reads registered valid
  variants from this family so `/dynamical-systems` remains a live index as
  bounded trials are added. A registry remains the executable source of truth.
- A numbered trial is a preserved implementation. Fork a working variant before
  changing a model, numerical method, parameter, or perceptual mapping; do not
  couple a later variation back into an earlier route through a shared mutable
  abstraction.
- A renderer may encode state, trajectory, or an explicitly documented derived
  observation. It must not use arbitrary camera motion, glow, labels, metrics,
  stars, or faux scientific instrumentation to imply dynamics that the model
  does not contain.
- Each variant documents its system boundary, numerical method, participant
  situation, visible parameter, interaction (if any), model invariants, and
  unresolved next question. Pure model tests check the claims that can be
  checked without a browser.

## Current groups

- [attractor](./attractor/README.md): six three-dimensional autonomous ODE
  trajectories, relocated intact from the former complex-systems ownership.
- [three-body](./three-body/README.md): Burrau's unequal-mass Pythagorean
  initial-value problem, integrated as a single field-first orbit study.
- [duffing](./duffing/README.md): a driven, damped nonlinear oscillator with
  an editable coefficient surface and stroboscopic phase observations.
- [hopf](./hopf/README.md): a supercritical normal-form study whose single
  control unfolds an attracting point into a stable cycle.
