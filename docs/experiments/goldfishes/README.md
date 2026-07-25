# Goldfishes

Code family: `components/goldfishes`

Routes:

- `/goldfishes/2d/1`: the former `/swarm/4`, with 200 agents by default and
  adjustable count and collision prevention.
- `/goldfishes/2d/2`: the former `/swarm/5`, with 1000 agents and the smaller
  baseline scale.
- `/goldfishes/3d/1`: the same field behavior rendered as 3D goldfish, with
  200 agents by default.

The family is top-level because it is being developed as a larger experience,
not as another standalone swarm variant. The 2D variants were moved rather than
copied; `/swarm` now contains variants 1–3 only.

## Preserved interaction and model contract

All three routes use `components/goldfishes/model/index.ts`. Click or
press-drag adds persistent grid cells, stable agent IDs distribute agents across
all selected cells, and selected cells remain physically excluded. Enter or
Space selects the central cell and Escape clears all cells. The 3D route does
not introduce a different movement profile.

The 2D routes retain their previous Leva controls and renderers. The 3D route
retains count, collision prevention, scale, corner mark, colour, and theme
controls, and adds only three directly visible rendering controls: depth, tail
motion, and fin opacity. Its default count is 200; the count control remains
50–1000 in steps of 50 so density can be evaluated without editing code.

Leva remains an authoring and parameter-adjustment surface, not the artwork's
visual wrapper. It stays collapsed, flat, monochrome, non-draggable, and limited
to one corner. Participant-facing controls must be designed separately if they
are later required.

## 3D interface premise

1. **Participant situation:** one person observes and redirects a full-screen
   goldfish field.
2. **Primary parameter:** the persistent set of selected cells that attracts
   the fish while remaining empty.
3. **Perceptual job:** see the same grouping and exclusion behavior as the 2D
   field while clearly reading perspective, height, body volume, heading, and
   tail movement.
4. **Interaction job:** preserve click, drag, and keyboard selection exactly;
   rendering depth must not alter targeting or collision behavior.
5. **Wrapper justification:** a fixed oblique perspective turns the field into
   a spatial plane without replacing the established interaction with a
   free-camera aquarium.
6. **System family:** the dark/light neutral field, sparse corner marks,
   selected-cell contrast, and compact Leva panel remain shared with 2D.
7. **Removal test:** perspective foreshortening, vertical separation, occlusion,
   lighting, body volume, and tail articulation justify the 3D renderer.
   Labels, scenery, bubbles, water decoration, and camera controls are absent
   because they do not clarify the interaction.

## Implemented rendering boundary

`/goldfishes/3d/1` uses Three.js `WebGLRenderer` with a perspective camera.
The grid and selected cells are drawn into a canvas texture on a horizontal
plane. Pointer positions are ray-cast back onto that plane before entering the
shared field model. Fish move in the model's existing two axes while their
rendered height varies independently, so cell targeting remains comparable
with 2D while the result visibly occupies 3D space.

Body, peduncle, tail, dorsal fin, paired side fins, and paired eyes are shared
`InstancedMesh` groups. The model is constructed locally from Three.js
geometries; no external 3D asset or asset licence is involved. Agent positions
and target behavior still come from the shared CPU model.

This structure is supported by the Three.js definition of `InstancedMesh`: many
objects sharing geometry and material can use different transforms while
reducing draw calls. It does not by itself prove a frame rate on the final
machine.

### Isolated model measurement

On Node 22.3.0, the shared CPU model was measured at 1920×1080 with one selected
cell after a warm-up. The figures are mean time per simulation step on the
development machine; they exclude React, Three.js rendering, Leva, media
decoding, and browser scheduling.

| Agents | Collision prevention off | Collision prevention on |
| ---: | ---: | ---: |
| 200 | 0.122 ms | 0.495 ms |
| 500 | 0.420 ms | 1.289 ms |
| 1000 | 1.149 ms | 2.488 ms |

This measurement supports retaining the existing CPU model for the current
prototype. It is not an FPS estimate for the complete browser experience.

## Consulting record

The decision is deliberately narrow:

- 2D remains the fastest path for the media-channel interfaces already built
  with React, DOM, and Canvas in `components/dashboard/stock/4` and
  `components/standalone/bastille-day`.
- 3D is used only for the central fish field, where perspective, height, body
  volume, and tail motion add visible value.
- The existing CPU spatial hash is retained for 50–500 fish because the current
  model already uses local neighbour lookup and the new renderer does not
  require a new motion model.
- Unreal is not introduced because it would add a
  separate runtime and integration boundary without being required by the
  present interaction.
- WebGPU is not a requirement. Three.js currently describes its
  `WebGPURenderer` as experimental, while `WebGLRenderer` remains the maintained
  production path for WebGL 2 applications.

The following are not established facts and must not be documented as such:

- that 500 fish will meet a specific frame rate on the final computer;
- that GPU simulation, workers, LOD, texture atlases, or external models are
  required;
- that 3D is visually superior before it is reviewed on the target display;
- that media decoding will be the dominant bottleneck in the final combined
  installation.

Those questions require measurement after the media layer and target hardware
are known. The current implementation provides count controls for that later
measurement but does not claim the result.

LUMA's public `Living Landscape` page describes an interactive installation in
which audience presence and choices affect the work, but it does not disclose
the rendering engine or software architecture. It is therefore a reference for
the installation relation, not evidence for choosing a particular engine.

Official references:

- LUMA, `Living Landscape`:
  https://luma.org/en/arles/whats-on/drift-living-landscape
- Three.js `InstancedMesh`: https://threejs.org/docs/pages/InstancedMesh.html
- Three.js `WebGPURenderer`: https://threejs.org/manual/en/webgpurenderer
- Three.js `MeshPhysicalMaterial` cost note:
  https://threejs.org/docs/pages/MeshPhysicalMaterial.html

## Failures not to repeat

A previous deleted variant changed locomotion while presenting itself as a
visual fish variant. Presentation changes must not create new speed limits,
steering rules, boundary behavior, avoidance forces, or collision behavior.
The shared model is the authority for the 2D and 3D comparison.

Earlier goldfish glyph attempts also failed in opposite directions: extra
anatomical and decorative detail weakened the minimal field, while aggressive
geometric reduction removed the high back, rounded body, compact head, narrow
peduncle, and broad concave tail that make a small mark read as a goldfish.
Future visual changes must retain those recognition features without adding
scenery, breed imitation, ornamental anatomy, or explanatory names.

The first 3D implementation also failed because it used an orthographic camera,
kept every fish parallel to the screen, rendered the field as a separate flat
backdrop, and varied camera-axis depth by only a few pixels. Although it used
3D geometry, those decisions suppressed the visual evidence of 3D and made the
result functionally indistinguishable from the 2D field. Do not treat the use
of Three.js or extruded geometry as sufficient. A 3D variant must expose
spatial relationships through the actual view and interaction mapping.
