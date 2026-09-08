# Attractor sequence

Direct orbit changes the view only. These are bounded numerical observations, not a proof of chaos or a global Lyapunov estimate.

| Route | Observation | Numerical boundary |
| --- | --- | --- |
| `/attractor/1` | 1–20 RK4 states and short trails against a 12,000-sample post-transient trace | Shared six fixed systems; 8m backing-pixel cap. |
| `/attractor/2` | Reference/companion separation | Analytic Jacobian + tangent RK4; local finite-time `λT`. |
| `/attractor/3` | Density of 30,000 GPU-resident states | Forward Euler only; no trails, reference orbit, or CPU fallback. |

## Fixed systems

| System | Regime / initial state | Used by |
| --- | --- | --- |
| Finance | `ẋ=z+(y-.9)x`, `ẏ=1-.2y-x²`, `ż=-x-1.2z`; `(1,3,2)` | 1, 2 |
| Dadras | `(1,1,1)` | 1, 2, 3 (`dt=.003`) |
| Bouali | `(1,.1,.1)` | 1, 2 |
| Aizawa | `(a,b,c,d,e,f)=(.95,.7,.6,3.5,.25,.1)`; `(.1,0,0)` | 1, 2, 3 (`dt=.003`) |
| Nosé–Hoover | `(.2,0,0)` | 1, 2 |
| Thomas | `b=.208186`; `(1.1,1.1,-.01)` | 1, 2 |
| Qi four-wing | `14(y-x)+4yz`, `-x+16y-xz`, `-43z+xy`; `(.001,.001,.001)` | 2 only |
| Particle fields | Thomas `b=.19,dt=.015`; Lorenz `10,28,8/3,.005`; Halvorsen `a=1.4,.004` | 3 only |

`/3` Thomas seeds begin within radius 2. Qi needs a long warmup that is not legible in the bounded Euler field; finance, Bouali, and Nosé–Hoover remain trace studies because their validation does not establish stable 30,000-particle fields.

## Working limits and evidence

For `/2`, tangent magnitude begins at `.002R`, renormalizes every `.36s`, and re-releases at 12s or `.12R`; proximity lines cap at 3,120 for 40 pairs. `/3` initializes its buffers once per selected field and advances that same GPU state each rendered frame. Keep the full viewport and essential selector; omit grids, dashboards, metric counters, and decorative post-processing.

Model tests cover finite deterministic state, Jacobians/tangent normalization, and field configuration. A 2026-09-02 Chrome observation rendered Thomas, Halvorsen, and Dadras at 2794×1488 without fresh renderer/shader errors; one `THREE.Clock` deprecation was non-fatal. This is historical evidence, not a required browser check.

Sources: [finance](https://www.samos.aegean.gr/math/karan/Finance_Chaotic_System.pdf), [Dadras/Bouali](https://chaos1.la.asu.edu/~ylai1/papers/PNAS_2025_ZGHHL.pdf), [Aizawa](https://www.mdpi.com/2227-7390/12/12/1835), [Thomas](https://arxiv.org/abs/2211.00336), [Qi](https://www.sciencedirect.com/science/article/pii/S0960077907000239), and the official [Three.js compute example](https://threejs.org/examples/webgpu_tsl_compute_attractors_particles.html).

## Route history

On 2026-09-02, the Canvas projection was retired in favour of `/1`; the raw-WebGL tangent renderer was retained numerically in `/2`; `/attractor/4` redirects to `/2`. The former tangent `/3` has no redirect because the route now owns the independent GPU particle experiment; retired source remains in version control.
