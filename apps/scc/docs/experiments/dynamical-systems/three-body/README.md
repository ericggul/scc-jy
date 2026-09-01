# Pythagorean three-body problem

Route: `/three-body/1`, owned by the filesystem-only `dynamical-systems`
group.

Date: 2026-09-01.

## Interface premise

1. **Participant situation:** one person encounters an evolving initial-value
   problem, not a pre-drawn orbital emblem. The field begins with three bodies
   at rest and exposes the result of their mutual attraction as it develops.
2. **Primary parameter:** the current configuration
   `(r₁(t), r₂(t), r₃(t))` of three unequal point masses. Their masses are
   3, 4, and 5, so radius is a direct mass encoding rather than decoration.
3. **Perceptual job:** compare one computed state through four coupled
   projections: the configuration plane and its accumulated paths, the three
   velocity coordinates in a phase-plane projection, pair separations through
   time, and kinetic/potential/total energy through time. A participant can
   locate a close approach in the configuration plane and see its velocity,
   distance, force, and energy consequences without a written interpretation.
4. **Interaction job:** observation only. This baseline fixes one documented
   initial condition so a later variant can change a real mass, position,
   velocity, numerical method, or camera rule without silently altering this
   reference.
5. **Wrapper justification:** the black configuration plane carries only
   current bodies, their growing histories, and the three current pairwise
   connections. Each connection’s opacity and width derive from the
   instantaneous magnitude `Gmᵢmⱼ / |rⱼ − rᵢ|²`; it is neither a
   social-network edge nor a decorative triangle. Below, the three parallel
   canvases are independent projections of the same state history, and the
   numerical register presents only current quantities used by the integrator
   or Newtonian model. There is no pre-painted figure, star field, title,
   equation overlay, reset button, or simulated status chrome.
6. **System family:** the visual system is specific to an initial-value
   integration: direct point positions, mass-proportional circles, trajectory
   persistence, and current forces. It intentionally does not reuse the warm
   paper field, serif headers, corner readouts, or lower controls of older SCC
   experiments.
7. **Removal test:** removing a body removes a mass state; removing a trace
   removes its temporal path; removing a pairwise line removes current force
   relation; removing a lower view removes a distinct observable projection
   or conservation check. Nothing else is permanently visible.

## Model card — three-body/1

- **System object and boundary:** Burrau’s Pythagorean planar Newtonian
  three-body initial-value problem. It contains three point masses, `G = 1`,
  no external field, no collision softening, no damping, and no renderer
  feedback. It is a numerical demonstrator, not a solar-system model and not
  an analytic solution to the general three-body problem.
- **Initial state:** the masses `m₁ = 3`, `m₂ = 4`, and `m₃ = 5` begin at
  rest at `(1, 3)`, `(-2, -1)`, and `(1, -1)`. Each lies opposite the side of
  the corresponding length in a 3–4–5 triangle. The centre of mass and total
  linear momentum are both zero at `t = 0`.
- **Equation of motion:** at every integration state, each body uses
  `r̈ᵢ = G Σⱼ≠ᵢ mⱼ(rⱼ − rᵢ) / |rⱼ − rᵢ|³`. This is the actual source of all
  subsequent position and trace changes.
- **Numerical method:** an embedded Dormand–Prince 5(4) ODE step computes both
  fifth- and fourth-order estimates. Their normalized component error is
  evaluated against `atol = 1e−11` and `rtol = 1e−10`; an attempted step is
  rejected and reduced before model time changes when that error exceeds one.
  The initial proposal is `h = 0.002`, with accepted steps choosing their next
  proposal from the same error estimate. A browser frame may accept several
  steps and records every fourth accepted state to the visible trail. This
  controls local integration error through the close encounter; it does not
  make an adaptive Runge–Kutta method symplectic, exactly energy-conserving, or
  a regularized collision treatment.
- **Visible mapping:** bodies are mass-scaled circles with stable color
  identity. A single persistent canvas records position-to-position segments
  after every accepted physics step. A second canvas redraws only the current
  three positions and force-weighted pair relations. Three lower canvases draw
  (1) the velocity components `(vₓ, vᵧ)` for every body, (2) the three pair
  distances, and (3) kinetic `T`, potential `U`, and total `E` energy from the
  same accepted-state history. The current register exposes model time,
  accepted step proposal, embedded error estimate, closest present pair,
  greatest present pair force, energy difference, momentum magnitude, and
  each pair’s `r` and `|F|`. Rendering never supplies a path, force, or value
  the model has not computed.
- **Causal checks:** model tests assert the exact 3–4–5 mass/geometry setup,
  zero centre of mass and linear momentum to numerical tolerance, cancellation
  of all internal pair forces, the analytical initial accelerations from the
  inverse-cube field, finite integrated state through model time `t = 100`, a
  close approach below `0.01`, and absolute energy drift below `1e−4`. They do
  not claim exact collision handling or accuracy beyond this stated numerical
  bound.

## Research ledger

- Szebehely and Peters describe the Pythagorean system as masses 3, 4, and 5
  placed at the triangle vertices with initial velocities zero:
  [*General Problem of Three Bodies*](https://adsabs.harvard.edu/pdf/1967AJ.....72..876S).
- Montgomery’s account identifies the Pythagorean 3–4–5 setup as a benchmark
  initial-value problem and distinguishes its free-fall, scattering behavior
  from periodic choreographies: [*Four Open Questions for the N-Body
  Problem*](https://assets.cambridge.org/97810092/00585/excerpt/9781009200585_excerpt.pdf).
- The governing Newtonian pair-force equation is stated in a mathematical
  three-body overview: [*Three body problem*](https://www.scholarpedia.org/article/Three_body_problem).

## Bounded trial

- **Baseline:** new three-body implementation. The retained SCC infrastructure
  is only the thin route, registry, pure model, canvas resize discipline,
  reduced-motion behavior, and experiment record.
- **Changed variable:** the physical object is now an unequal-mass
  initial-value integration. A path appears only after that body has traversed
  it; no closed orbit is supplied in advance. This pass additionally exposes
  state-derived parallel projections and the current calculation rather than
  inserting prose beneath the field.
- **Retained invariants:** full viewport, no external runtime, no simulated
  metadata, direct state-to-render mapping, stable model IDs, and client-local
  calculation.
- **Observed result:** the pure model reaches a near pass of approximately
  `4.14e−4` separation and remains finite through `t = 100`; the measured
  absolute energy change at that horizon is approximately `3.98e−6` under the
  stated tolerances. Browser observation remains pending an explicit browser
  test request.
- **Unresolved question:** should `/three-body/2` preserve this visual mapping
  and integrate a clearly specified perturbation to one initial coordinate, so
  sensitivity can be compared without disguising a different algorithm as a
  design revision?
