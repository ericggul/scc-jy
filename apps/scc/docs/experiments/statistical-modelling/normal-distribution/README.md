# Normal-distribution particle field

Active routes: `/statistical-modelling`, `/normal-distribution`, and
`/normal-distribution/1`–`/normal-distribution/5`.

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

## normal-distribution/3

1. **Participant situation:** one person starts a finite collection of
   random walks, watches the same sample accumulate through all three spatial
   coordinates, and then orbits the resulting endpoint cloud.
2. **Primary parameter:** `μ`, `σ`, and `ρ` define the mean vector
   `(μ, μ, μ)`, shared marginal standard deviation, and actual `x`–`y`
   correlation of a trivariate random walk. The `z` coordinate remains
   independent.
3. **Perceptual job:** see individual three-dimensional displacement histories
   before their actual endpoints constitute the empirical volume. A sparse
   subset of the actual sample retains its 3D paths, so the cloud is visibly
   produced by finite sums rather than positioned into a density sculpture.
4. **Interaction job:** `draw walk` runs a fresh seeded finite trial. Changing
   a parameter or `reset` starts a new trial with the selected generator.
5. **Wrapper justification:** the uninterrupted 3D viewport makes the paths,
   their shared origin, and their actual endpoint volume cohabit one
   inspectable space. The lower controls state only the parameters and actions
   a person can genuinely change.
6. **Removal test:** removing the traces loses the finite-sum mechanism;
   replacing the cloud's real `y` coordinate with a density-derived height
   would no longer be a three-dimensional sample; adding axes, a legend, a
   time chart, or decorative effects would describe the process instead of
   letting the field show it.

All 16,000 walkers begin at the translated mean. On every one of 24 steps,
independent `U`, `V`, and `W` are drawn from `Uniform[-1, 1]`. With
`s = sqrt(3 / 24)`, the implemented increment is
`σs(U, ρU + sqrt(1 - ρ²)V, W)`. Because each source variable has variance
`1/3`, the completed sum has covariance
`σ²[[1, ρ, 0], [ρ, 1, 0], [0, 0, 1]]`. Thus every displayed coordinate is a
coordinate of the stochastic sample. At finite step count the endpoint cloud
is bounded and only approximates the corresponding trivariate normal law via
the central limit theorem; it is not represented as an exact Gaussian or a
KDE-derived surface. The selected 320 trails are sampled from the exact same
endpoint population. Motion stops after the finite walk completes.

### Rendering record

question:    Can a genuinely three-dimensional central-limit sample remain
             readable without turning density into a fake vertical coordinate?

source:      [Albert & Carl Friedrich — Random Walks & Diffusion](https://www.complexity-explorables.org/explorables/albert-and-carl-friedrich/),
             Dirk Brockmann, accessed 2026-09-03; and
             [Three.js PointsMaterial](https://threejs.org/docs/pages/PointsMaterial.html)
             and [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html),
             accessed 2026-09-03.

transfer:    Make the sum of independent displacements and a deliberately
             retained subset of actual paths visible before treating the
             endpoint cloud as an aggregate. The source explicitly notes that
             the random-walk argument is not limited to two dimensions. Use
             perspective-attenuated point primitives while retaining the
             existing WebGPU/WebGL2 backend selection.

adaptation:  `/3` uses twenty-four scaled, bounded 3D increments, not a copied
             walk taxonomy or an explorable's interface. Every one of 16,000
             points moves along its stored `(x, y, z)` history; 320 of those
             histories remain as 3D line segments; the final point cloud is
             their actual 3D endpoint sample.

invariants:  one unboxed viewport, direct orbit, no axes or grid, fixed
             background, `μ`/`σ`/`ρ` controls, and no density-derived spatial
             coordinate; the finite run stops once the endpoint cloud forms.

evidence:    Model tests assert deterministic 3D histories, a shared
             translated origin, finite values, the observed `x`–`y` endpoint
             correlation while `z` remains independent. Browser observation
             remains pending explicit browser-test authorization.

rejected:    any density-to-height lift, a KDE-derived surface, copied visual
             styling or walk-type controls, a continuous procedural drift, a
             formula mesh, per-path explanatory labels, glow, a grid, a legend,
             or a dashboard shell.

next:        compare whether the retained 320 paths make the common origin and
             finite summation legible at the default camera distance, or whether
             their count should be reduced without altering the sample model.

## normal-distribution/4

`/4` extends `/1`'s smooth normal-density surface into a 20×20 terrain mesh:
four hundred normal summits join through their low-density tails in one
continuous surface. It retains `/1`'s blue-to-orange density colour, dark field,
and direct orbit. There is no autonomous score, fake motion, or control chrome.

The terrain owns 130,321 vertices and 259,200 triangles in one indexed mesh.
Each vertex takes its height and colour from a fourth-power smooth union of the
nearest 3×3 bivariate normal densities: the omitted distant tails fall below
the visible contribution while this preserves distinct normal summits and their
continuous joins. The material is genuinely double-sided, so direct orbit can
inspect the underside with correctly reversed lighting normals. It demand-renders
at DPR 1. There is no storage buffer, GPU compute dispatch, interval, or
per-frame geometry update.

### Rendering record

question:    Can `/1`'s smooth normal-density surface become 400 joined normal
             summits without turning into isolated piles?

source:      `/normal-distribution/1`; [Field Guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/),
             [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html),
             [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html),
             and the official [WebGPU compute-particles example](https://threejs.org/examples/webgpu_compute_particles.html),
             accessed 2026-09-04.

transfer:    A continuous density function should be represented by a continuous
             surface when its continuity—not individual particle identity—is the
             perceptual job. Stateful compute remains unnecessary because this
             terrain has no previous-frame relation.

adaptation:  One static 361×361 indexed mesh samples a fourth-power union of
             the nearest 3×3 normal densities at each vertex, rather than
             testing all 400 summits. Vertex colours carry the `/1` density
             palette; computed normals, a double-sided standard material, and
             two directional relations make the continuous form legible without
             post-processing.

invariants:  400 normal-density summits, 130,321 vertices, 259,200 triangles,
             DPR 1, demand rendering, direct orbit, and no visible grid, ground
             plane, text chrome, compute, timer, or per-frame geometry update.

evidence:    The model yields 400 addressed summits, finite vertices, and valid
             indexed triangles. In the project Node 26.5.1 runtime, generation
             of the full terrain took 26 ms. HTTPS route observation remains
             the required final performance gate.

next:        Keep this one-draw static mesh; any cost increase requires a new
             budget and HTTPS observation.

## normal-distribution/5

1. **Participant situation:** one person orbits a circular surface with no
   labels, controls, or background apparatus competing with its form.
2. **Primary parameter:** a continuous radial scale field sets every local
   normal's standard deviation and its required separation from neighbours.
3. **Perceptual job:** read the tall central normal first, then find its surface
   resolve continuously into smaller, denser outer normal mountains.
4. **Interaction job:** direct orbit changes only the view and permits both the
   large envelope and individual summits to be inspected.
5. **Wrapper justification:** `/4`'s bare, directly orbitable field remains
   appropriate because the nested scale relation is the entire proposition.
6. **Removal test:** without variable-radius packing this becomes a uniform
   point field; without the Gaussian envelope it loses its global normal
   falloff; labels, a grid, or performance display would not clarify either
   relation.

`/5` is a bounded fork of `/4`. It does not prescribe a mountain count or hard
levels. A seeded variable-radius Poisson packing accepts a peak only when its
distance from every accepted neighbour is proportional to the mean of their
standard deviations. The standard-deviation field decreases continuously with
radius, so the centre is naturally sparse and large while the periphery becomes
small and dense without rings. On the current deterministic seed this produces
332 peaks. Their Gaussian kernels combine through a smooth p-norm union; a
global Gaussian envelope preserves one legible normal-distribution silhouette.

### Rendering record

question:    Can a global normal distribution stay immediately legible while
             revealing smaller normal distributions at a closer scale?

source:      `/normal-distribution/4`, accessed 2026-09-04.

transfer:    Retain one static, two-sided indexed mesh and demand rendering;
             change the spatial sampling relation rather than adding particles,
             a simulation loop, or post-processing.

adaptation:  A 256×768 polar mesh uses the same palette, lighting, DPR 1,
             and `DoubleSide` material as `/4`. A seeded variable-radius
             Poisson packing places local Gaussian kernels; nearby kernels use
             a smooth p-norm union. The resulting detail field modulates a
             bivariate Gaussian envelope, retaining connected valleys without
             hard rings, cuts, or a prescribed peak count.

invariants:  one static mesh, 196,609 vertices, 392,448 triangles, DPR 1,
             direct orbit, demand rendering, two-sided material, and no
             particles, GPU compute, timer, grid, text chrome, or frame loop.

evidence:    The deterministic packing yielded 332 peaks; its centre scale was
             8.5 and outer accepted scale approximately 0.89. Project Node
             26.5.1 generated the surface in 31 ms with finite geometry;
             `/5`-related type errors were absent. On 2026-09-04, the HTTPS
             route rendered the connected hierarchy as one canvas.

next:        Retain continuous scale variation and organic valleys if the seed
             or envelope is varied further.
