# Visual rendering research

This is SCC's shared protocol for using current visual and rendering references.
Its purpose is both technical and artistic: a source may disclose a material,
motion, spatial relation, interaction, or compositional possibility that helps
an experiment ask its own question more clearly.

The public [reference shelf](/reference) provides the same initial sources for
participants and researchers. This document governs how agents turn a reference
into a bounded repository change.

## The source shelf

| Source | Use it for |
| --- | --- |
| [Three.js TSL specification](https://threejs.org/docs/TSL.html), [WebGPURenderer documentation](https://threejs.org/docs/pages/WebGPURenderer.html), [official examples](https://threejs.org/examples/?q=webgpu), and [releases](https://github.com/mrdoob/three.js/releases) | Current API truth, compatibility, migration boundaries, renderer fallback, and source patterns. Consult the exact API documentation and matching examples before relying on a secondary explanation. |
| [Maxime Heckel](https://blog.maximeheckel.com/) | Deep visual essays that connect materials, temporal images, atmosphere, light, and screen-space operations to legible artistic effects. |
| [Codrops Creative Hub](https://tympanus.net/codrops/hub/all/) | A current field of source-backed creative experiments. Use it to discover possibilities, then trace a relevant effect to its implementation and author. |
| [Adam Naili](https://blog.anaili.fr/) | Clear technical translation of depth, raymarching, geometry, materials, and production trade-offs for real interactive scenes. |

These sources are not a style system. A scene is not made more resolved by
adding WebGPU, glass, bloom, raymarching, particles, a dark field, or a
post-process that resembles a reference.

## When to consult references

Consult this shelf only when at least one of these conditions applies:

1. the user explicitly requests current visual references, inspiration, or a
   particular technique;
2. the intended perceptual relation calls for an unfamiliar material, motion,
   GPU-scale simulation, temporal buffer, screen-space pass, or other rendering
   capability;
3. a local renderer or experiment record cannot answer a concrete visual
   question without a new technique; or
4. a Three.js, renderer, material, or browser-support decision depends on
   current version-specific information.

Do not consult it as a reflex for a routine layout, asset, copy, parameter, or
model change. Do not browse in search of ornament after the experiment's visual
question is already answerable with the local implementation.

## Research sequence

1. **Read local evidence first.** Inspect the target experiment's complete
   model, renderer, screen, stylesheet, document, and nearest preserved parent.
   State its participant situation, perceptual job, requested mutation, and
   unrequested invariants before opening an external source.
2. **Name the gap.** Formulate one concrete question such as: "Can a decayed
   motion field make a fish school's accumulation history perceptible?" The
   question must name the local relation, not merely an effect.
3. **Use a source hierarchy.** For an API or compatibility question, begin with
   current official Three.js documentation, examples, release notes, and source.
   For an artistic or technical approach, add one or two authored references
   from the shelf. A discovery source is not proof of production compatibility.
4. **Translate; do not imitate.** Write the rule being transferred, the source
   version or access date when material, the required local adaptation, and the
   specific visible consequence. Do not copy a reference's wrapper, palette,
   subject, assets, or full effect unless the user explicitly asks for that
   object and its licence permits it.
5. **Make a bounded trial.** Fork the closest complete experiment where the
   archive contract requires it. Change the smallest coherent rendering or
   interaction relation; do not use a research result to rewrite the model,
   controls, camera, composition, or system family without authorization.
6. **Record the result.** In the owning experiment document, add the source
   link, why it was consulted, what was actually adapted, retained invariants,
   direct observation or measurement, and the unresolved question or rejection.

## Rendering-specific limits

- Inspect the installed `three` package and relevant migration material before
  using an API that may have changed. Current official sources take precedence
  over remembered snippets and older blog code.
- `WebGPURenderer` can choose a WebGL2 fallback, but that does not prove each
  material or effect will read or perform identically. Keep a compatibility
  decision explicit and verify it only when browser testing is authorized.
- TSL can target WebGPU and WebGL, whereas raw GLSL materials remain a WebGL
  boundary. This is a migration consideration, not a reason to rewrite a stable
  GLSL scene.
- Do not add React Three Fiber, a renderer replacement, GPU compute, a new
  dependency, or a general post-processing stack merely because a source uses
  one. SCC's imperative Three.js renderers and Goldfishes' independent,
  preserved renderers are valid local constraints.
- A GPU simulation must retain the repository's model/presentation separation:
  server or model state does not contain colours, geometry, opacity, layout, or
  animation phase merely to make the render convenient.

## Reference note template

Use this compact structure in an experiment document when reference research
affects a change:

```text
question:    the local perceptual question
source:      title, URL, and access date
transfer:    the operative rule, not the copied appearance
adaptation:  exact local rendering or interaction change
invariants:  what remains unchanged
evidence:    directly observed or measured result, with conditions
rejected:    what was not transferred and why
next:        unresolved question, if any
```

The reference exists to make SCC's next experiment more specific, not to make
all SCC experiments resemble one current visual culture.
