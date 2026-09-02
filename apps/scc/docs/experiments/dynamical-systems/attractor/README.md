# Attractor sequence experiment

Active routes: `/attractor/1`, `/attractor/2`, and `/attractor/3`, owned by
the filesystem-only `dynamical-systems` group.

## Current sequence

| Route | Observation | Numerical model | Renderer |
| --- | --- | --- | --- |
| `/attractor/1` | One independently integrated phase state and its short trail. | Six fixed ODEs, RK4, 1–20 deterministic states. | Raw Three.js WebGL, OrbitControls, lit spheres. |
| `/attractor/2` | A reference state and genuinely integrated nearby companion repeatedly separate. | `/1`'s six ODEs plus a Qi four-wing field, analytic Jacobians, tangent RK4, periodic normalization, and finite-time local divergence. | Three.js WebGPU/TSL with WebGL fallback; glossy physical terminals. |
| `/attractor/3` | One selected dense phase-space volume, observed as density rather than individual traces. | 30,000 independently seeded states in Thomas, Lorenz, Aizawa, Dadras, or Halvorsen regimes; forward Euler. | React Three Fiber `Canvas`, Three.js WebGPU compute, and a TSL sprite field. |

The sequence moves from the shape of an orbit to a limited visible observation
of local sensitivity, then to a dense field of a single system. It does not
claim a converged global Lyapunov exponent, a calibrated finance model, or a
general proof of chaos.

## Shared phase-space object

Each selected system is a three-variable autonomous ODE. A post-transient RK4
trace contains 12,000 sampled states; a renderer normalizes that trace around
its own center and radius. The first six systems are shared by the first two variants;
Qi four-wing belongs only to `/attractor/2`. Camera, colour, material, terminal
form, and lines cannot modify an ODE or its coefficients. `/attractor/3` is
a separate particle-field regime and therefore does not share the
post-transient trace or the `b = .208186` coefficient used by the first two
variants.

| ID | Fixed regime |
| --- | --- |
| `finance` | `ẋ = z + (y − 0.9)x`, `ẏ = 1 − 0.2y − x²`, `ż = −x − 1.2z`; initial `(1, 3, 2)`. |
| `dadras` | `ẋ = y − 3x + 2.7yz`, `ẏ = 1.7y − xz + z`, `ż = 2xy − 9z`; initial `(1, 1, 1)`. |
| `bouali` | `ẋ = x(4 − y) + 0.3z`, `ẏ = −y(1 − x²)`, `ż = −x(1.5 − z) − 0.05z`; initial `(1, 0.1, 0.1)`. |
| `aizawa` | Standard form with `(a, b, c, d, e, f) = (0.95, 0.7, 0.6, 3.5, 0.25, 0.1)`; initial `(0.1, 0, 0)`. |
| `nose-hoover` | `q̇ = p`, `ṗ = −q + pζ`, `ζ̇ = 1 − p²`, represented as `(x, y, z)`; initial `(0.2, 0, 0)`. |
| `thomas` | `ẋ = sin(y) − bx`, `ẏ = sin(z) − by`, `ż = sin(x) − bz`, with `b = 0.208186`; initial `(1.1, 1.1, −0.01)`. |
| `qi-four-wing` | `/2` only. `ẋ = 14(y − x) + 4yz`, `ẏ = −x + 16y − xz`, `ż = −43z + xy`; initial `(0.001, 0.001, 0.001)`. |
| `thomas-particles` | `/3` only. The same cyclic Thomas form with `b = 0.19`; 30,000 deterministic seeds begin within radius 2 and advance by forward Euler with `dt = 0.015`. |

### Research ledger

- The user-provided source post names Finance, Dadras, Bouali, Aizawa,
  Nosé–Hoover, and Thomas in its attractor selection: [source
  post](https://www.reddit.com/r/Simulated/comments/1q3wbon/i_visualised_12_charming_chaotic_attractors/).
- Yu et al. give the finance system and the selected `(0.9, 0.2, 1.2)` regime:
  [*Dynamic analysis and control of a new hyperchaotic finance
  system*](https://www.samos.aegean.gr/math/karan/Finance_Chaotic_System.pdf).
- Dadras and Bouali equations are cross-checked against [Zhang et al.'s
  supplementary methods](https://chaos1.la.asu.edu/~ylai1/papers/PNAS_2025_ZGHHL.pdf).
- The Nosé and Hoover lineage is linked in [this technical
  account](https://codingbobby.xyz/projects/chaotic-shapes/nos%C3%A9-hoover/);
  its canonical thermostat is not generally ergodic.
- Aizawa's convention is listed in [*Mathematics* 12, 1835
  (2024)](https://www.mdpi.com/2227-7390/12/12/1835), and the Thomas threshold
  in [*Cyclically Symmetric Thomas Oscillators as
  Swarmalators*](https://arxiv.org/abs/2211.00336).
- Qi et al.'s 3D quadratic system is a documented four-wing attractor with a
  compound topological structure. `/2` uses its reported
  `(a, b, c, d, e) = (14, 43, −1, 16, 4)` regime, with a smaller browser RK4
  step selected for finite integration: [*Chaos, Solitons &
  Fractals* 38 (2008), 705–721](https://www.sciencedirect.com/science/article/pii/S0960077907000239).
- Maxime Heckel's [*Field Guide to TSL and
  WebGPU*](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/)
  supplies the particle-field adaptation: storage-backed positions are
  initialized once, updated by compute, then read by a node material. Its
  Thomas example supplies the selected `b = .19` and `dt = .015` regime.
- The official Three.js [compute-attractors particle
  example](https://threejs.org/examples/webgpu_tsl_compute_attractors_particles.html)
  is the API reference for `instancedArray`, compute dispatch, and a
  `SpriteNodeMaterial` applied to an `InstancedMesh`.

## attractor/1 — phase-space body

Promoted on 2026-09-02 from the former `/attractor/2` renderer study.

- **Participant situation:** a person directly rotates one selected phase
  volume; wheel or pinch changes bounded zoom, while pan remains disabled.
- **Primary parameter:** one through twenty independently integrated states of
  the unchanged selected ODE. Each state has a deterministic seed and a short
  accumulated trail.
- **Perceptual job:** distinguish volume, folding, symmetry, and recurrent path
  of the six systems. Lit spheres and depth occlusion replace an approximate
  Canvas projection, but do not introduce another scientific claim.
- **Visible mapping:** ivory is the complete sampled orbit. A muted fixed colour
  belongs to each independent state and its trail; it is identity, not chaos.
- **Interaction invariant:** direct OrbitControls orbit alters the view only;
  lower navigation and particle count select a system or reveal existing
  states. Neither changes numerical coefficients.
- **Removal test:** without the orbit, moving states, direct camera inspection,
  and lower selection, the observation fails. A grid, legend, metrics, or
  parameter dashboard would not improve it.

The model test asserts the six-system set, finance derivative, finite
deterministic traces and states, 1–20 clamping, and positive normalization
radius. Rendering is capped at 8,000,000 backing pixels.

## attractor/2 — local separation field

Promoted on 2026-09-02 from the former `/attractor/4`, which already contained
the full former `/attractor/3` tangent model.

The later Qi addition makes this route's seventh system visually distinct: four
separated folding regions form through the field's actual quadratic cross-terms.
It is not a renderer-generated ornament and its finite-time divergence is still
read under the same local, non-global boundary as the other systems.

- **Pair state:** every observation has reference state `x`, independently
  integrated companion `x'`, tangent `δx`, elapsed `T`, and accumulated
  logarithmic growth `L`. The tangent follows `δẋ = J_f(x)δx` using each
  system's analytic Jacobian and coupled RK4 stages.
- **Finite-time boundary:** `|δx|` starts at `0.002R`; every `0.36` simulated
  seconds it is normalized and contributes `log(|δx| / ε)` to `L`. The shown
  quantity `λ_T = L / T` is a finite-time local observation, not a converged
  global Lyapunov exponent. The nonlinear companion is re-released after 12
  simulated seconds or separation `0.12R`.
- **Visible relation:** two same-colour terminals and their short segment show
  actual nonlinear separation. Indigo encodes contraction, sand near-neutral
  growth, and coral expansion. Inter-pair lines exist only when distinct beads
  are within `0.7R`; this relation permits at most 3,120 segments for 40 pairs.
- **Terminal form:** `sphere` is default. `ddong` replaces only terminal
  geometry using GPU instances at the same states; it cannot affect tangent
  state, separation, or proximity tests.
- **Renderer trial:** `WebGPURenderer` initializes asynchronously, retains its
  WebGL fallback, and renders through a TSL `RenderPipeline` with restrained
  bloom and vignette. `MeshPhysicalNodeMaterial` uses a clearcoat, moderate
  roughness, restrained iridescence, and a TSL view-angle edge. It deliberately
  omits transmission, static room reflection, custom scene captures, geometry
  displacement, and an art-directed refractive pass so the terminals remain
  materially consistent with `/attractor/1`'s opaque spheres.
- **Removal test:** removing the companion, true separation segment, or
  divergence colour removes the observed sensitivity relation. Backend labels,
  shader controls, charts, and numerical counters remain excluded.

The model test asserts the Qi field and analytic Jacobian as well as finite
reference/companion/tangent states for every system, the finance Jacobian, exact
post-normalization tangent magnitude, and finite divergence values. Browser
comparison of the WebGPU and fallback output remains an explicit future
observation rather than a claimed result.

## attractor/3 — GPU particle fields

1. **Participant situation:** one person directly moves the camera around one
   selected phase-space volume, then selects another equation from the bare
   lower row.
2. **Primary parameter:** the active vector field driving 30,000 independently
   seeded states.
3. **Perceptual job:** distinguish cyclic braid, two-lobed switching, axial
   fold, Dadras's asymmetric recurving volume, and Halvorsen's cyclic
   threefold recurrence as spatial density, not as a named catalogue.
4. **Interaction job:** camera controls change only the view. Selecting a
   system replaces the seed and offset buffers, so it starts that system's own
   field; it does not alter coefficients or particle count.
5. **Wrapper justification:** the full viewport preserves density and overlap;
   the sole control row is needed to make the changed equation legible. The
   blue-to-warm tint remains phase-space distance, not a category colour.
6. **Removal test:** without direct orbit, density, phase update, or system
   selection, the comparison fails. Labels beyond the necessary system names,
   sliders, metrics, grids, and post-processing remain absent.

| System | Selected GPU regime | Reason for inclusion |
| --- | --- | --- |
| Thomas | `b = .19`, `dt = .015`; cyclic sine coupling. | The supplied source's threefold, braided baseline. |
| Lorenz | `σ = 10`, `ρ = 28`, `β = 8/3`, `dt = .005`. | Canonical two-lobed switching; the equations and conventional parameters are listed by [Wikipedia](https://en.wikipedia.org/wiki/Lorenz_system). |
| Aizawa | `/1`'s fixed coefficients, `dt = .003`. | An axial fold unlike the two-lobed systems. |
| Dadras | `/1`'s fixed coefficients, `dt = .003`. | The nonlinear `yz`, `xz`, and `xy` cross-terms create a large asymmetric recurving volume. |
| Halvorsen | Cyclic quadratic coupling with `a = 1.4`, `dt = .004`. | A threefold recurrent volume whose coupled quadratic terms stay legible in the same dense-field observation. [PhasePortrait's Halvorsen reference](https://phaseportrait.github.io/reference/legacy/trajectory3d/) gives the equation. |

- **Model boundary:** each selected system has a fixed local seed centre,
  seed radius, Euler step, display centre, and display scale. Lorenz and
  Halvorsen are new field equations; Aizawa and Dadras reuse SCC's existing
  equations but not `/1`'s RK4 trace pipeline. Qi four-wing stays in `/2`:
  its documented reference needs a long warmup from `(0.001, 0.001, 0.001)`,
  and it did not create a legible dense field inside this route's bounded
  real-time Euler regime. Finance, Bouali, and Nosé–Hoover remain in `/1`
  because their fixed-trace validation does not establish stable
  30,000-particle Euler clouds.
- **Rendering boundary:** `Canvas` creates and awaits `WebGPURenderer`.
  `sprite count={30000}` owns the draw; seed and offset `instancedArray`
  buffers initialize once per selected field with `computeAsync`, then the
  selected derivative advances offsets once per rendered frame. The material
  reads that same GPU state. No CPU fallback or CPU particle simulation is in
  this route.
- **Evidence:** the system-configuration test, SCC TypeScript check, and
  route-file lint pass. On 2026-09-02, Chrome on the reported Mac rendered
  Thomas, Halvorsen, and Dadras at the 2794 × 1488 backing canvas; the
  inspected Halvorsen and Dadras fields formed large folded volumes after
  22 seconds, with no fresh runtime, shader, or WebGPU console errors.
  `THREE.Clock` emits one non-fatal deprecation warning.

### Why `/attractor/1` and `/attractor/3` differ

`/attractor/1` is an orbit-and-particle instrument: six systems are integrated
with CPU RK4, warmed up and sampled into a 12,000-point reference trajectory,
then one to twenty CPU particles and their short trails move against that
reference. Its question is how a particular orbit folds and how a few states
travel through it.

`/attractor/3` is a density-field instrument: one of five selected equations
advances 30,000 GPU-resident states by forward Euler and renders only their
instantaneous sprite density. It has no reference orbit and no per-particle
trail. Its question is the collective volume, recurrence, and symmetry made by
many states at once. The GPU scale makes that observation possible; its Euler
integrator makes it a different numerical experiment, not a faster or more
accurate version of `/1`.

## Consolidation record

Date: 2026-09-02.

- **Retired Canvas projection baseline:** the former public `/attractor/1`
  manually projected the same 20-state model to Canvas 2D. Its only distinct
  variable was approximate pointer-driven projection; the promoted WebGL body
  now supplies the clearer default observation. The old URL cannot redirect
  because `/attractor/1` is the new canonical route.
- **Retired WebGL tangent baseline:** the former `/attractor/3` introduced
  tangent dynamics, true companions, divergence colour, proximity lines, and
  the optional ddong geometry. Its full numerical model is retained in the
  promoted `/attractor/2`; its raw WebGL material/rendering baseline is not a
  separate active experiment. The new `/attractor/3` is an independent
  Thomas-particle trial, not a restoration of that tangent renderer.
- **Redirects:** former `/attractor/4` permanently redirects to
  `/attractor/2`. The former tangent `/attractor/3` remains recoverable in
  version control but cannot redirect because the route now owns this separate
  particle experiment. The former `/attractor/2` is deliberately replaced by
  the new tangent route, so it has no compatible redirect target.
- **Retained evidence:** this record names the removed variables, baseline,
  current successor, and route collision rather than presenting the two-route
  sequence as if it had always been linear. The prior source remains recoverable
  from version control; no retired renderer code remains in the active family.
