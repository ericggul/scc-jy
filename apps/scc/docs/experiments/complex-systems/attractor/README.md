# Attractor sequence experiment

Route: `/attractor/1`, owned by the filesystem-only `complex-systems` group.

Date: 2026-08-28.

## Interface premise

1. **Participant situation:** a person encounters one trajectory at a time,
   without a comparison grid competing with its structure. Moving the pointer
   changes the viewpoint; the lower navigation advances through the six systems
   or selects one by name.
2. **Primary parameter:** the phase-space trajectory produced by each selected
   system of three coupled autonomous differential equations after its transient
   has been discarded.
3. **Perceptual job:** distinguish the six forms through their occupied volume,
   symmetry, folding, and recurrent path, without turning the systems into a
   fake scientific dashboard.
4. **Interaction job:** alter the viewpoint to test whether an apparent loop,
   wing, or crossing is a projection effect, then use the lower previous/next
   sequence or named selector to move to another system. The lower `particles`
   slider reveals one through twenty independent states of the selected equation.
   It never alters an equation while claiming to expose a physical parameter.
5. **Wrapper justification:** one full field gives a phase-space form enough
   room to be seen as a body rather than a thumbnail. The visible name and lower
   navigation identify the current equation; they do not divide the field into
   cards. Ivory is the complete sampled orbit, while individually muted coloured
   trails and points identify separate phase states rather than model category.
   The charcoal field and concise lower control
   adopt the quiet, trace-oriented tone requested from `clock/1`
   without borrowing its recursive-clock geometry or its visual system as an
   archive-wide default.
6. **System family:** the experiment is a dark phase-space field with no title,
   legend, metrics, equations, status labels, cards, or background ornament.
   In reduced-motion mode it becomes a static phase-space view, while pointer
   orbit remains available for depth inspection.
7. **Removal test:** the sampled trajectory, its moving phase states, the
   necessary name, pointer orbit, and sequential lower navigation remain. A
   glossary, numerical readout, parameter controls, pause/reset actions,
   viewport grid, and explanatory panels do not sharpen the observation.

## Model card — attractor/1

- **System object and boundary:** a mathematical demonstrator of six separate
  three-dimensional continuous-time ODE systems. It is neither an empirical
  finance model nor a molecular-dynamics implementation. The `finance` label
  identifies the published model’s variables, not live market data. The browser
  does not compute Lyapunov exponents, basin boundaries, invariant measures, or
  a proof that every selected initial condition is chaotic.
- **Entity state and local action:** each system has one phase point
  `(x, y, z)`. Its local derivative is determined solely by its own current
  point and fixed documented coefficients. A classical fourth-order Runge–Kutta
  step advances that state; no random number, camera position, or renderer
  output feeds back into the ODE.
- **Shared state:** there is none between the six systems. Each trace receives
  its own initial condition, transient warm-up, sample history, bounding volume,
  and stable model identifier. The twenty available particle states are seeded
  from deterministically spaced, post-transient points on that system’s sampled
  orbit, then evolve as independent RK4 integrations. The slider merely reveals
  the first one through twenty of those states; it does not regenerate or alter
  an equation. Muted hues identify particle identity only. The shared orbit is
  only a viewer transform.
- **Macro observable:** the occupied phase-space path is the accumulated
  consequence of the local ODE. The warm-up removes the selected numerical
  transient; the full pale trace records the finite sampled orbit and each
  coloured short trail records a current, separately integrated phase state.
- **Participant intervention and contrast:** lower navigation changes which
  fixed system is visible; pointer motion alters only that system’s 3-D
  projection; particle count reveals independent trajectories of that unchanged
  system. The exact numerical system remains fixed, so a participant can
  distinguish a genuine projection change or divergent path from a changed
  equation.

### Implemented equations and regimes

The model source holds coefficients as code rather than rendering equations on
the canvas. Each browser trace discards its configured transient, then retains
12,000 evenly sampled RK4 states.

| ID | Differential system and selected fixed regime |
| --- | --- |
| `finance` | `ẋ = z + (y − 0.9)x`, `ẏ = 1 − 0.2y − x²`, `ż = −x − 1.2z`; initial `(1, 3, 2)`. |
| `dadras` | `ẋ = y − 3x + 2.7yz`, `ẏ = 1.7y − xz + z`, `ż = 2xy − 9z`; initial `(1, 1, 1)`. |
| `bouali` | `ẋ = x(4 − y) + 0.3z`, `ẏ = −y(1 − x²)`, `ż = −x(1.5 − z) − 0.05z`; initial `(1, 0.1, 0.1)`. |
| `aizawa` | Standard six-coefficient form with `(a, b, c, d, e, f) = (0.95, 0.7, 0.6, 3.5, 0.25, 0.1)`; initial `(0.1, 0, 0)`. |
| `nose-hoover` | `q̇ = p`, `ṗ = −q + pζ`, `ζ̇ = 1 − p²`, rendered as `(x, y, z)`; initial `(0.2, 0, 0)`. This is the sign-transformed thermostat form of the usual `−ζp`, `p² − T` presentation at `T = 1`. |
| `thomas` | `ẋ = sin(y) − bx`, `ẏ = sin(z) − by`, `ż = sin(x) − bz`, with `b = 0.208186`; initial `(1.1, 1.1, −0.01)`. |

### Research ledger

- The user-provided video’s source post names its twelve featured systems,
  including Finance, Dadras, Bouali, Aizawa, Nosé–Hoover, and Thomas, and links
  to its implementation reference: [source post](https://www.reddit.com/r/Simulated/comments/1q3wbon/i_visualised_12_charming_chaotic_attractors/).
- Yu et al. state the three-variable finance system, its variables, initial
  point `(1, 3, 2)`, and the selected `a = 0.9`, `b = 0.2`, `c = 1.2` chaotic
  regime: [*Dynamic analysis and control of a new hyperchaotic finance
  system*](https://www.samos.aegean.gr/math/karan/Finance_Chaotic_System.pdf).
- The exact Dadras and Bouali equations and the selected conventional
  coefficients are cross-checked in the synthetic-system table of
  [Zhang et al.’s supplementary methods](https://chaos1.la.asu.edu/~ylai1/papers/PNAS_2025_ZGHHL.pdf).
  Dadras and Momeni’s original multi-scroll work establishes the related family
  and its parameter-dependent one- through four-scroll behaviour:
  [*Chinese Physics B* 19, 060506 (2010)](https://cpb.iphy.ac.cn/EN/10.1088/1674-1056/19/6/060506).
- The Nosé formulation and Hoover simplification are linked from the original
  articles in this concise technical account:
  [Nosé–Hoover equations and references](https://codingbobby.xyz/projects/chaotic-shapes/nos%C3%A9-hoover/).
  The canonical three-variable thermostat is non-ergodic in general; this
  visual sample is not a claim of thermostat validity.
- The Aizawa convention and coefficients are independently listed in a recent
  methods paper: [*Mathematics* 12, 1835 (2024)](https://www.mdpi.com/2227-7390/12/12/1835).
  The conventional label’s historical attribution is not asserted here.
- Thomas’s cyclic equations and the `b ≈ 0.208186` chaotic threshold are
  described by the accessible primary-adjacent reference
  [*Cyclically Symmetric Thomas Oscillators as Swarmalators*](https://arxiv.org/abs/2211.00336).

## Bounded trial

- **Baseline:** a new, field-first phase-space study. `clock/1` is a requested
  tonal reference for restraint, full-viewport canvas rendering, dynamic pixel
  ratio sizing, reduced-motion support, and an expandable lower control—not a
  visual baseline to reproduce.
- **Changed variable:** a simultaneous six-up comparison becomes a one-at-a-time
  encounter. The lower sequential selector makes model order explicit without
  shrinking or dividing the current trajectory. The added one-through-twenty
  slider exposes deterministic initial-condition variation through coloured,
  bounded trails. Each selected system retains twenty actual RK4 states and at
  most 360 recent points for each state, so particle memory does not scale with
  the full 12,000-point reference trace.
- **Retained invariants:** one client-only canvas field, direct phase-space
  observation, no external runtime dependency, responsive bounded content,
  stable model identifiers, and all presentation mapping outside the model.
- **Verification target:** pure tests assert the exact system set, the finance
  derivative at its documented initial point, finite deterministic RK4 samples,
  twenty finite deterministic particle states, particle-count clamping to
  one-through-twenty, and positive normalization radius. Type checking covers
  the App Router selector and canvas interaction layer.
- **Observed result:** Node 26.5.1 completed a deliberately worst-case model
  pass (six systems × 600 frames × 32 RK4 steps × 20 particles = 2,304,000
  particle steps) in 188.56 ms with finite states. Canvas work is bounded to
  roughly 4,000 reference samples plus at most 7,200 particle-trail samples per
  frame; the backing canvas is capped at 8,000,000 pixels. This is a numerical
  and allocation check, not a browser-frame-rate claim; browser verification
  remains pending an explicit request.
- **Unresolved question:** a later variant could compare fixed orthographic
  projections against participant-controlled orbit while keeping this sequential
  six-system navigator and its numerical coefficient set intact.
