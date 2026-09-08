# Visual rendering research

Read for a new rendering technique, supplied visual source, or a version-specific
renderer decision. Routine copy, layout, asset, or parameter edits do not require
reference research. The public `/reference` shelf is a discovery aid, not a style system.

## Work from a concrete gap

Inspect the target's relevant model/renderer/styles and preserved baseline.
Name the perceptual question, requested mutation, and invariants. For API or
compatibility questions, inspect installed versions and current official
Three.js docs/examples/releases first. Add one or two authored references only
when they answer the gap.

Transfer the operative rule with its local adaptation. Preserve camera, model,
controls, composition, and framework unless changing them is requested. Do not
add R3F, GPU compute, renderer replacements, or post-processing merely because a
reference uses them. For an explicit source clone, preserve its runtime path
subject to [GPU safety and source-clone rules](webgpu-tsl-particles.md).

Record only what affected the trial: question, source URL/date, transferred
rule, adaptation, invariants, measured/observed result, and rejection or open
question. Unperformed browser checks remain unverified.

## Sources

- API truth: [TSL](https://threejs.org/docs/TSL.html),
  [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html),
  [examples](https://threejs.org/examples/?q=webgpu),
  [releases](https://github.com/mrdoob/three.js/releases).
- Authored approaches: [Maxime Heckel](https://blog.maximeheckel.com/) for
  materials/temporal images; [Codrops](https://tympanus.net/codrops/hub/all/)
  for discovery traced to authors/source; [Adam Naili](https://blog.anaili.fr/)
  for depth, geometry, and production tradeoffs.

Check version-specific capabilities rather than trusting old snippets:
WebGL2 fallback does not guarantee equivalent visuals/performance; TSL's
cross-backend path does not make raw GLSL portable. Stable imperative Three.js
and independently preserved Goldfishes renderers remain valid constraints.
Keep GPU model state abstract and visual mappings client-owned.
