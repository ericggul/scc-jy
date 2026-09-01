# Hopf to homoclinic bifurcation

Route: `/hopf/1`, owned by the filesystem-only `dynamical-systems` group.

Date: 2026-09-01.

## Interface premise

1. **Participant situation:** one person has a phase plane in front of them and
   changes a single coefficient while released states leave the origin as a
   cycle, then expand toward the second equilibrium.
2. **Primary parameter:** the real bifurcation parameter `μ` in the
   quadratic vector field in the cited Hopf example.
3. **Perceptual job:** make the threshold at `μ = 0` legible as a spatial
   change: a cycle emerges at the origin, then lengthens toward the documented
   homoclinic bifurcation near `μ = 0.06605695`. The filled origin and unfilled
   second equilibrium are both calculated fixed points; trajectories are the
   only depiction of the periodic orbit.
4. **Interaction job:** the range and arrow keys move `μ` in steps, restarting
   the deterministic released population so a newly selected regime can be
   seen from the same family of offsets. Clicking the plane replaces the first
   released state with the clicked phase-space coordinate. `R` and `release`
   restore the standard population. The range stops at the cited homoclinic
   value, where the bounded periodic orbit is the observation.
5. **Wrapper justification:** the phase plane fills the viewport, so the
   origin-centred release, curved trajectories, and growing global loop remain
   the encounter rather than a prelude to a control section. A single compact
   `μ` range and reset action sit at its lower edge, following the family’s
   field-first direct-control grammar. Its two restrained axes establish the
   only needed coordinates. Mineral ground, ink trails, and endpoint dots
   distinguish individual calculated states without assigning categories or
   implying an instrument panel.
6. **System family:** this preserves the family’s thin App Router dispatcher,
   local browser calculation, pure model tests, responsive canvas, and bounded
   variant record. It takes no palette, control grammar, or presentation state
   from `complex-systems`.
7. **Removal test:** a vector-field grid, separate time graph, equation card,
   status indicator, parameter table, and numerical dashboard do not make the
   Hopf transition more legible and are absent.

## Model card — hopf/1

- **System object and boundary:** this is the two-dimensional, autonomous
  quadratic example from the cited Hopf-bifurcation page—not a claim about a
  physical, biological, or social oscillator. It integrates
  `ẋ = μx + y − x²` and `ẏ = −x + μy + 2x²`. There is no noise, hidden
  forcing, recorded trajectory, or visual feedback into the equations.
- **Bifurcation relation:** the origin is an equilibrium for every `μ`; its
  Jacobian there is `[[μ, 1], [−1, μ]]`, so at `μ = 0` its eigenvalues are
  `±i`. The second equilibrium is calculated as
  `x = (1 + μ²)/(2 + μ)`, `y = x² − μx` and is drawn as the unfilled point.
  The cited source states that a stable limit cycle emerges from the origin as
  `μ` increases through zero and reaches a homoclinic bifurcation around
  `μ = 0.06605695`; this app uses that number as a reference value, not as a
  browser-side proof of the global connection.
- **Numerical method:** every released point uses the same classical RK4
  implementation, with a maximum model step of `.0025`. Browser animation
  advances no more than `.06` wall-clock seconds per callback and records a
  maximum of 210 sampled states per trajectory. It is a finite visual history,
  not a persistent afterimage.
- **Presentation mapping:** the axes locate the origin; the filled origin and
  unfilled second equilibrium are directly calculated from the active `μ`.
  Trail colour is a stable individual identity. Line, dot, and trail history
  derive only from each state’s calculated position and prior calculated
  positions. Reduced motion draws an already integrated finite trajectory field
  rather than requesting animation.
- **Numerical checks:** pure tests establish the fixed origin, the displayed
  quadratic derivative, the `μ = 0` Hopf linearization, the second equilibrium,
  and finite integration in the interactive regime.

## Research ledger

- Wikipedia’s [Hopf bifurcation example](https://en.wikipedia.org/wiki/Hopf_bifurcation)
  specifies this quadratic system, the Hopf point at `μ = 0`, and the stated
  approximate homoclinic value. It is the source of the system selection and
  threshold reference, not an independent numerical proof.
- John Guckenheimer and Philip Holmes, *Nonlinear Oscillations, Dynamical
  Systems, and Bifurcations of Vector Fields* (Springer, 1983), supplies the
  broader local Hopf-bifurcation framework used to distinguish the origin’s
  linear crossing from the stated global homoclinic event.

## Bounded trial

- **Baseline:** a new, field-first quadratic-bifurcation study within the
  dynamical systems family.
- **Changed variable:** only `μ` changes. It moves the quadratic field through
  the Hopf point and toward the cited homoclinic value while initial-state
  family, integrator, trail length, and colour identity remain fixed.
- **Retained invariants:** a local deterministic ODE, direct interaction,
  responsive canvas, one routeable numbered experiment, pure checks, and no
  simulated instrumentation.
- **Observed result:** source-level model tests and type checking are the
  verification target. Browser observation is intentionally pending an
  explicit browser-test request.
- **Unresolved question:** whether a later preserved variant should isolate the
  homoclinic neighbourhood with a tighter field window without losing the
  origin-to-saddle relation present here.
