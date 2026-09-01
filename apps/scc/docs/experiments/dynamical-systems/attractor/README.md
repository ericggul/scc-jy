# Attractor sequence experiment

Routes: `/attractor/1`, `/attractor/2`, and `/attractor/3`, owned by the
filesystem-only `dynamical-systems` group.

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
  visual baseline to reproduce. Its relocation into `dynamical-systems` changes
  ownership and catalogue membership only; `/attractor/1` retains its route,
  model, interaction, and visual contract.
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

## attractor/2

Date: 2026-09-01.

1. **Participant situation:** a person encounters one selected trajectory in a
   full field. Direct OrbitControls camera manipulation rotates the actual
   WebGL phase volume, while the lower navigator and particle-count control retain the actions of
   `/attractor/1`.
2. **Primary parameter:** the same finite, normalized three-dimensional ODE
   path and its separately integrated phase states from `/attractor/1`.
3. **Perceptual job:** test whether physically shaded, depth-occluding sphere
   states make the local position of each independent trajectory easier to
   perceive than the flat endpoint discs in `/attractor/1`, while leaving the
   underlying orbit and interaction legible as the same experiment.
4. **Interaction job:** drag directly orbits the camera around the fixed phase
   volume; wheel or pinch performs a bounded zoom, and panning is disabled so
   the phase-space centre remains stable. Previous/next, named selection, and
   the one-through-twenty slider retain their original system-selection and
   state-revelation roles. No control changes the ODE.
5. **Wrapper justification:** Three.js gives the existing full phase-space
   field a perspective camera, depth test, and directional light needed for a
   small object to read as a sphere. The pale reference orbit and muted
   identity-coloured trails remain trajectory encodings rather than interface
   ornament.
6. **System family:** this is a renderer fork, not a new system. It preserves
   the charcoal field, sparse lower control, responsive canvas limit,
   reduced-motion static view, and absence of charts, equations, badges, or
   scene decoration.
7. **Removal test:** removing the sphere geometry would erase the only changed
   relation. Lights exist only to disclose sphere curvature; labels, grids,
   legends, shadows, and extra controls remain unnecessary.

### Bounded trial

- **Baseline:** `/attractor/1`, copied into `components/dynamical-systems/attractor/2/`
  so this renderer can be adjusted or rejected without changing the baseline.
- **Changed variable:** the Canvas 2D projected reference/trails/endpoints are
  replaced with Three.js WebGL geometry. The 12,000-sample reference and each
  short trail are `Line` geometry; current particle states are actual lit
  `SphereGeometry` meshes. Camera rotation replaces the prior manual
  projection math, but reads the same phase points.
- **Retained invariants:** all six fixed definitions, warm-up and RK4 method,
  deterministic particle seeds, one-through-twenty particle limit, stable
   identifiers, responsive full viewport, navigation, keyboard operation, and
   reduced-motion behavior. Each state keeps one stable elementary palette
   colour shared by its trail and lit sphere. Rendering cannot feed back into
   the ODE.
- **Verification target:** the copied pure model tests continue to check the
  numerical contract. Type checking must resolve the route selector and the
  raw Three.js renderer without introducing React Three Fiber.
- **Unresolved question:** browser observation should compare whether the
  sphere radius remains locally readable at one particle and twenty particles
  before considering camera or material changes.

## attractor/3

Date: 2026-09-01.

1. **Participant situation:** a person rotates one phase volume directly and
   watches matched nearby trajectories repeatedly separate from each other.
   The lower selector chooses one fixed ODE; the `pairs` control reveals one
   through forty independently released local samples of that same ODE.
2. **Primary parameter:** each pair's finite-time tangent divergence
   `λ_T = L / T`, where `L` accumulates logarithmic tangent growth after
   periodic normalization. It is a local finite-time observation, not a
   claimed converged largest Lyapunov exponent.
3. **Perceptual job:** distinguish contraction, near-neutral evolution, and
   local divergence as actual nearby trajectories leave a common orbit. A
   large sphere is the reference state, a smaller same-colour sphere is its
   separately integrated companion, and their connecting segment is their
   current nonlinear separation.
4. **Interaction job:** drag orbits the camera; wheel or pinch performs a
   bounded zoom. The system selector and pair count alter which fixed field or
   how many independently seeded observations are visible; neither changes an
   equation, a coefficient, or a hidden random seed.
5. **Wrapper justification:** one uncarded phase field lets the separation
   between two states remain a spatial event. Indigo means a negative finite-time
   tangent divergence, sand approaches zero, and coral means a positive value;
   every pair's two spheres and segment share that computed colour. Thin links
   connect beads from different pairs only when their current phase-space
   distance is below `0.7R`; their endpoint colours retain the two computed
   pair states. Colour is therefore a state encoding, not a category palette.
6. **System family:** this fork retains `/2`'s charcoal WebGL field,
   OrbitControls, sparse lower navigation, responsive canvas cap, and
   reduced-motion static view. It removes decorative particle trails because
   the relevant relation is pair separation, not a second accumulated trace.
7. **Removal test:** removing the companion, its segment, or the divergence
   colour would remove the experiment's observable. A legend, chart, faux
   precision counter, automatic camera motion, or extra control would not make
   the tangent relation more legible.

### Model card — attractor/3

- **System boundary:** the six ODEs and their coefficients remain exactly those
  of `/attractor/1`. This is still a mathematical dynamical-systems study, not
  a calibrated finance model or a multi-agent complex system. The fork does not
  assert that every displayed fixed regime has a positive asymptotic largest
  Lyapunov exponent.
- **Pair state and update:** every released sample holds reference state `x`,
  independently integrated companion state `x'`, tangent vector `δx`, elapsed
  model time `T`, and accumulated logarithmic growth `L`. Reference and
  companion use the existing RK4 integrator. In parallel, the tangent uses
  `δẋ = J_f(x)δx`, with an analytic Jacobian `J_f` specified for each ODE and
  integrated by coupled RK4 stages.
- **Normalization and uncertainty boundary:** each pair begins with
  `|δx| = 0.002R`, where `R` is that attractor's normalization radius. Every
  `0.36` simulated seconds, its tangent is normalized back to that magnitude
  and `L` receives `log(|δx| / ε)`. The separately integrated companion stays
  visible until it reaches `0.12R` from the reference or has evolved for `12`
  simulated seconds; it is then released again from the normalized tangent
  direction. This is deterministic epistemic initial-condition uncertainty,
  not stochastic forcing or random visual jitter.
- **Visible relation:** the matched-pair line endpoint is the actual companion
  state during the current release interval; it is not a renderer-scaled tangent
  arrow. Separate thin segments connect every bead belonging to different pairs
  when the actual phase-space distance is at most `0.7R`; the same-pair line is
  retained as the distinct perturbation relation. The colour is a continuous
  indigo–sand–coral mapping of accumulated finite-time tangent divergence. It
  should be read as an observation of local stretching, not as a binary chaos
  verdict.

### Bounded trial

- **Baseline:** `/attractor/2`, copied into
  `components/dynamical-systems/attractor/3/` so its WebGL renderer remains a
  preserved spatial baseline.
- **Changed variable:** independent endpoint particles become deterministic
  nearby nonlinear companion pairs, while a second tangent integration computes
  their finite-time local divergence. The changed indigo–sand–coral palette is
  derived from that result. A proximity relation additionally draws a segment
  between every two beads from distinct pairs at or below `0.7R`.
- **Retained invariants:** fixed equation definitions, numerical warm-up,
  RK4 reference integration, stable IDs, full phase-space field, direct camera
  orbit, lower sequential selector, a forty-pair (eighty-bead) ceiling, and no
  presentation-to-model feedback.
- **Verification target:** pure tests assert the finance Jacobian, finite
  reference/companion/tangent states for every ODE, exact post-normalization
  tangent magnitude, and finite divergence values. A later numerical audit must
  compare step sizes, normalization intervals, and epsilon scales before any
  regime is described as having a converged Lyapunov exponent.
- **Observed result:** Node 26.5.1 completed a deliberately worst-case model
  pass of six systems × 600 frames × 32 RK4 steps × 40 pairs (4,608,000 pair
  updates) in 1,422.83 ms with finite states. Forty pairs yield at most 80
  visible beads and 3,120 inter-pair proximity segments; those segments are
  submitted through one dynamic `LineSegments` geometry. This is a numerical
  and allocation check, not a browser-frame-rate claim.
- **Unresolved question:** do repeated local release intervals make sensitivity
  perceptible without a numeric readout, or does a later dedicated return-map
  or parameter-sweep variant supply the necessary second observation?
