# Normal-distribution particle field

Active routes: `/statistical-modelling`, `/normal-distribution`, and
`/normal-distribution/1`–`/normal-distribution/2`.

## normal-distribution/1

1. **Participant situation:** one person approaches a particle surface,
   rotates it directly, and adjusts a small set of distribution parameters.
2. **Primary parameter:** a bivariate normal field's mean `μ`, shared standard
   deviation `σ`, and correlation `ρ`.
3. **Perceptual job:** see the field widen and lower, or shear into an
   elliptical peak without reducing the distribution to a flat chart.
4. **Interaction job:** direct orbit changes only the view. The lower controls
   recompute the static density surface; `reset` restores its default state.
5. **Wrapper justification:** the unboxed viewport gives the sampled surface
   enough depth to be inspected from all sides. The bare lower controls are
   the only permanent text because they state the relation being changed.
6. **Removal test:** removing particles, the three parameters, or direct orbit
   removes the experiment. A legend, axes, grid, dashboard, or fake live state
   would not make the parameter-to-density relation clearer.

The surface evaluates a bivariate normal kernel directly at each particle's
fixed `(x, z)` location. It has no frame loop and no observation stream. This
is the durable baseline: shape, controls, camera, and rendering stay intact
when a process-oriented trial is rejected or needs to be compared.

## normal-distribution/2

1. **Participant situation:** one person watches a finite sample form once,
   then inspects its resulting volume by orbiting it.
2. **Primary parameter:** the same `μ`, `σ`, and `ρ`, now applied to finite
   bounded increments rather than a direct Gaussian draw.
3. **Perceptual job:** see independent small displacements combine into a
   cloud, then reveal a continuous empirical density envelope whose aggregate
   is bell shaped.
4. **Interaction job:** `draw sample` runs a fresh finite trial. Changing a
   parameter or `reset` begins a fresh trial with the selected generator.
5. **Wrapper justification:** no legend narrates the result. The lower action
   is only the real action available: draw another sample. Once settled, the
   field is as inspectable as the baseline.
6. **Removal test:** remove the finite paths or local empirical density and
   this is merely the static baseline; add continuous rotation, looping, a
   visible grid, or a generic particle drift and the statistical relation
   becomes less legible.

Each particle starts from twelve independent, bounded two-dimensional
increments. Their sum is transformed by the selected mean, spread, and
correlation, and each particle keeps that continuous stochastic `(x, z)`
endpoint. A local kernel-density estimate over those final endpoints gives
each particle its height and colour, with a small vertical measurement jitter.
The bell is therefore not a Gaussian random-number animation or a formula
being revealed: it is the central-limit result of many finite additions in an
ungridded empirical field. The motion runs once and stops.

### Rendering record

question:    Can the static density baseline and a finite-sample explanation
             coexist without confusing a formula with observed frequencies?

source:      [Three.js WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)
             and [PointsMaterial](https://threejs.org/docs/pages/PointsMaterial.html),
             accessed 2026-09-02.

transfer:    Use WebGPURenderer's ordinary backend selection and perspective
             point attenuation. A static field needs no compute loop;
             the finite trial updates only particle positions during its one
             accumulation pass.

adaptation:  `/1` is a deterministic CPU-built `BufferGeometry` of the
             density formula and uses demand rendering. `/2` is a separate,
             deterministic geometry: 26,000 particles each add twelve bounded
             increments, retain their continuous endpoints, and rise through a
             smoothed local empirical density field. Its frame loop stops when
             the trial settles.

invariants:  direct orbit, one full viewport, no axes or grid, and the
             restrained lower control grammar derived from `face-voronoi`.

evidence:    `/1` model tests assert a center peak, a lower wide-distribution
             peak, and a stable particle count. `/2` tests assert seeded
             reproducibility, finite trajectories, finite geometry, and
             non-empty local empirical densities. Browser observation remains pending
             explicit browser-test authorization.

rejected:    rolling kernel-density animation, decorative rotation, morphing
             between unrelated distributions, Gaussian random-number theatre,
             fake data points, bloom, grid, legend, or dashboard shell.

next:        compare whether twelve increments make the central-limit relation
             immediately perceptible, or whether the trial needs fewer points
             rather than more explanatory chrome.
