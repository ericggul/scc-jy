# Aerodynamics

`/aerodynamics/1`, revised 2026-09-08: a 3D Arnold–Beltrami–Childress (ABC)
flow, replacing the rejected pipe-shaped kinematic animation. The field uses
the exact incompressible Euler velocity
`(A sin z + C cos y, B sin x + A cos z, C sin y + B cos x)` in a periodic
fundamental cell. It has zero divergence and its curl equals the velocity;
all-three-nonzero coefficient regimes can exhibit chaotic streamlines. This is
an analytic, steady, inviscid flow model, not a no-slip body or a CFD prediction
of a particular aircraft.

4,096 instanced arrows advect through the field by fourth-order Runge–Kutta;
their orientation, scale and cool-to-warm colour come from the instantaneous
velocity. Fifteen merged tube streamlines disclose the field topology. Drag
orbits, scroll zooms, the three controls select actual `A/B/C` coefficient
sets, and pause stops advection. The reference is `attractor/3`'s dark field,
orbit behaviour and limited control grammar; it is not a literal clone.

One instanced-arrow draw plus one merged-streamline draw; no particle sprites,
shadows, postprocessing, per-frame allocation or re-created geometry. DPR 1 and
24 Hz are the unverified-device safety budget. The first frame is static;
reduced motion, pause and hidden tabs stop simulation work. Device/rendered
appearance has not been browser-verified. Scoped lint and TypeScript checks
validate the implementation; numerical checks sample periodic containment,
finite RK4 trajectories, analytic zero divergence and the Beltrami identity.

The camera has no distance fog: its former 7–15 range erased the field at the
permitted zoom-out distance.

Sources: Dombre et al., [Chaotic streamlines in the ABC flows](https://doi.org/10.1017/S0022112086002859), and
Katsanoulis, Kogelbauer & Haller, [Approximate streamsurfaces for flow visualization](https://doi.org/10.1017/jfm.2022.992).

`/aerodynamics/2` is an independent copy of the field with 300 instances of a
real raised-middle-finger hand in place of arrows. The supplied source model is
preserved in `public/3d/scene.gltf` and `scene.bin`; its web derivative,
`middle-finger.optimized.glb`, merges the source parts into one mesh and reduces
the render cost from 894,414 to 37,044 processed vertices per source instance.
It is Meshopt-compressed (124 KB on disk) and rendered through one dynamic
`InstancedMesh` at DPR 1 and 24 Hz. Its clear-coated physical material supplies
the inflated finish without changing the source silhouette. Its ABC model and
controls are copied rather than imported from variant 1.

Hand model credit: [“Middle finger hand” by FreddyAnimator64](https://sketchfab.com/3d-models/middle-finger-hand-efa2d616f50d488c8ce64daf38b5a65f), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
