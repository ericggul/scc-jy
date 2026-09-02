# WebGPU/TSL particle source-clone protocol

Use this for a supplied React Three Fiber (R3F), Three.js TSL, or WebGPU
particle source that must be reproduced in SCC. A source clone is a runtime
contract, not visual inspiration.

## Incident record: `attractor/3`, 2026-09-02

- **Request:** copy the supplied R3F Thomas-attractor particle source.
- **Failure:** a prior implementation replaced it with an imperative renderer,
  a different draw object, and a CPU/WebGL fallback without installing R3F or
  Drei. It was not a clone.
- **Cause of the reported Mac crash:** unconfirmed. The previous route was not
  observed with a browser console or GPU error trace before replacement; do not
  turn that missing evidence into a claimed driver or shader cause.
- **Resolution:** install the source dependencies, retain its `Canvas` → async
  `WebGPURenderer` → `sprite` → compute lifecycle, then test the actual HTTPS
  route. On the reported Mac, `/attractor/3` rendered for 30 seconds with no
  WebGPU, shader, or runtime errors. A `THREE.Clock` deprecation warning was
  non-fatal.

## Required procedure

1. **Classify the request.** If the user asks to clone supplied code, preserve
   its renderer, framework, draw primitive, compute schedule, dependencies,
   camera, and controls. Do not substitute an imperative renderer, custom mesh,
   CPU fallback, particle cap, or visual redesign unless requested.
2. **Preflight dependencies.** Read the owning app's `package.json` before
   coding. Install every imported runtime package first; for an R3F source this
   normally includes `@react-three/fiber`, `@react-three/drei`, and any source
   import such as `uuid`. A missing import means it is not cloned.
3. **Preserve the GPU data path.** For the source pattern, retain one
   `instancedArray` for seeds, one for evolving offsets, `computeAsync` once for
   initialization, and one `compute` dispatch per frame. The material must read
   those same buffers. Do not move simulation state to CPU just to satisfy a
   local typing discomfort.
4. **Treat typing as typing.** R3F currently types its renderer as WebGL while
   an async `Canvas` factory can return `WebGPURenderer`; `three/webgpu` also
   exposes constructors beyond R3F's default JSX catalogue. After checking the
   installed versions, add only narrow type assertions and JSX augmentation.
   They must not change runtime construction or the compute path.
5. **Verify in order.** Run the owning app's typecheck and lint the changed
   file. If the user authorizes browser testing and an HTTPS server already
   exists, open the exact route in Chrome, inspect console errors, and leave it
   running for at least 30 seconds. Record canvas visibility and GPU/shader or
   runtime errors separately from harmless warnings.

## Failure discipline

- Never claim a clone while a source import or its package is absent.
- Never diagnose a GPU crash as a browser/driver/shader fault without the old
  route's observed error or device-loss evidence.
- Never promise that WebGPU can never crash; report the tested browser, route,
  duration, canvas state, and console result instead.
- If the exact source runs, stop. Do not continue with speculative fallbacks or
  performance rewrites.

Reference: [Field Guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/); [Three.js WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html).
