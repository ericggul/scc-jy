# Driven Duffing oscillator

Route: `/duffing/1`, owned by the filesystem-only `dynamical-systems` group.

Date: 2026-09-01.

## Interface premise

1. **Participant situation:** one person observes a phase-space population
   evolving under a single driven nonlinear system, then changes the system or
   its seed orbit. The visual object is the population, not a line being
   accumulated behind a moving marker.
2. **Primary parameter:** the relation among damping `δ`, linear and cubic
   stiffness `α, β`, drive amplitude `γ`, drive frequency `ω`, and drive phase
   `φ` in `ẍ + δẋ + αx + βx³ = γ cos(ωt+φ)`.
3. **Perceptual job:** see the cloud stretch, contract, cross, and fold as a
   whole. Every point is an independently integrated initial condition. Its
   colour is assigned once from its initial `x` coordinate and then travels
   with that point, so apparent colour flow is a consequence of the state
   evolution, not a time-based recolouring or an afterimage.
4. **Interaction job:** alter a coefficient or a seed orbit with a range and
   exact numeric editor. A change rebuilds the initial phase-space population
   for the edited equation. `restart field` restores that exact population.
5. **Wrapper justification:** the upper field is only the computed material.
   It has no axes, moving endpoint, static trace, ornamental grid, or imported
   attractor image. The lower surface is a parameter editor and current
   numerical register because both serve manipulation of the actual system.
6. **System family:** this is a client-local, field-first dynamical study. It
   shares thin routes, a variant registry, pure model tests, responsive canvas
   behavior, and an experiment record with its family—not a borrowed visual
   language from `complex-systems`.

## Model card — duffing/1

- **Reference equation:** the default is the published coloured-attractor
  setup, `x''=x−x³−.02x'+3sin(t)`. The editor stores its equivalent cosine
  form using `δ=.02`, `α=−1`, `β=1`, `γ=3`, `ω=1`, `φ=−π/2`. No hidden visual
  force, stochastic term, or pre-rendered texture is used.
- **State:** a point is `(x,v)` with `v=ẋ`; the field integrates
  `ẋ=v`, `v̇=γcos(ωt+φ)−δv−αx−βx³`. The static potential is
  `V(x)=αx²/2+βx⁴/4` and the displayed energy register is `Eₘ=v²/2+V(x)`.
  Because this is driven and dissipative, `Eₘ` is diagnostic rather than a
  conserved quantity.
- **Population construction:** a single seed orbit is first integrated through
  120 exact forcing periods. The next 960 Poincaré states at
  `t=n(2π/ω)` seed an adaptive browser population (8k–32k points); tiny,
  deterministic coordinate offsets avoid visual aliasing without introducing
  a random state. This gives all points the same drive phase at the beginning
  of the field while retaining a broad attractor sample. The source GIF uses
  300k points; the count here is bounded to keep direct browser integration
  responsive.
- **Animation:** all field coordinates are advanced by the same classical RK4
  vector field with a population step cap of `.005`; the one-point numerical
  register retains `.0025`. The field is painted at the source animation’s
  30fps cadence into a bounded 720px logical raster, then scaled by the
  browser. The full phase-space population evolves for four forcing periods,
  then resets to the exact prepared state. It is therefore a periodic,
  transforming ensemble—not a persistently painted trace and not a
  prerecorded animation. `t`, force, energy, powers, and `nT` below are
  evaluated from a companion state using the same equation and time.
- **Colour:** teal → indigo → muted rose encodes initial horizontal position
  through a fixed mapping. It never derives from frame number, velocity, or
  a decorative gradient. As the flow folds the initial-coordinate bands into
  each other, their changing topology makes the flow visible.
- **Numerical checks:** pure tests verify the phase-shifted reference force,
  double-well minima and potential depth, bounded conservative RK4 energy
  error through `t=100`, exact period landing, and equality between a
  one-point ensemble update and the single-orbit RK4 update.
- **Performance boundary:** changing a range value updates the local editor
  only; releasing the range (or leaving a numeric input) commits and rebuilds
  the expensive Poincaré population once. WebGL receives a compact position
  buffer and renders the field as GPU points; a packed 2D pixel-buffer fallback
  remains for unavailable WebGL. No per-particle objects, paths, gradients, or
  imported frames are created during animation.

## Research ledger

- The exact visual reference is Timeroot’s [*Duffing oscillator strange
  attractor with color.gif*](https://commons.wikimedia.org/wiki/File:Duffing_oscillator_strange_attractor_with_color.gif):
  it specifies `x''=x−x³−αx'+βsin(t)`, `α=.02`, `β=3`, 300,000 points,
  initial-`x` colouring, and an `8π` (four-period) loop. This experiment
  recreates the mechanism in live browser calculation rather than embedding
  the asset.
- Robert Herman’s [*The Duffing Equation*](https://people.uncw.edu/hermanr/mat463/Duffing.pdf)
  gives the standard forced Duffing form and its first-order reduction.
- Stroboscopic samples at `t_n=n(2π/ω)` form the Poincaré construction used
  to prepare a periodically driven phase-space set; see this
  [Poincaré-map discussion](https://www.intechopen.com/online-first/1251468).

## Bounded trial

- **Baseline:** the immediately prior version rendered one post-transient
  trajectory and accumulated its path.
- **Changed variable:** the visual state is now an advected ensemble with
  source-faithful coefficients, phase, colour attachment, and four-period
  timing.
- **Performance revision:** the initial ensemble implementation coupled a
  display-sized raster, 16k–64k points, `.0025` population steps, and a paint
  on every animation callback. It now bounds the logical raster and population
  size, uses a stated `.005` visual integration cap, paints at 30fps, removes
  per-particle allocations, renders points through WebGL where available, and
  commits editor values only at an interaction boundary.
- **Retained invariants:** local calculation, stated RK4 integrator, no visual
  asset, thin route, parameter editor, and a responsive canvas.
- **Observed result:** type and model-level numerical checks pass. Browser
  observation remains pending an explicit browser-test request.
- **Unresolved question:** whether a later variant should expose a choice
  between the evolving ensemble and a static Poincaré section while preserving
  this equation and source attribution.
