# Cellular automata experiment families

Routes: `/cellular-automata/colour/1` through `/cellular-automata/colour/6`
and `/cellular-automata/grid-network/1` through `/cellular-automata/grid-network/3`, owned by the filesystem-only
`complex-systems` group. The former `/cellular-automata/1` through `/6` routes
permanently redirect to their preserved `colour` counterparts.

Date: 2026-08-13.

## Interface premise

1. **Participant situation:** one person encounters a running two-dimensional cellular automaton and may paint living cells into it.
2. **Primary parameter:** the binary state of each cell under the local `B3/S23` rule.
3. **Perceptual job:** see persistent structures, births, deaths, and propagation emerge from simultaneous local updates.
4. **Interaction job:** press or drag to set cells alive, then observe whether that intervention persists, travels, stabilizes, or disappears.
5. **Wrapper justification:** an uninterrupted, exact cell lattice is the system itself rather than a representation of it. New cells appear blue-grey for one generation and cells that just died leave one muted-rust frame.
6. **System family:** the complex-systems mineral ground, charcoal active state, blue-grey formation, muted-rust loss, serif title, and monospaced rule notation.
7. **Removal test:** the lattice, local update loop, paint interaction, rule notation, and pause/step/seed/clear actions remain. Grid decoration, explanatory cards, charts, and simulated metadata are omitted.

## Bounded trial

- **Baseline:** a literal Conway's Game of Life cellular automaton with toroidal boundaries.
- **Changed variable:** none beyond direct participant seeding; this first route establishes the family baseline.
- **Retained invariants:** fixed cell positions, binary cell state, Moore neighbourhood, synchronous generations, and `B3/S23` birth/survival rules.
- **Observable result:** not yet browser-observed in this implementation pass.
- **Unresolved question:** which later route should alter one local rule while preserving the same lattice and interaction?

## Route 2 — three-state cyclic field

Route: `/cellular-automata/colour/2`. Date: 2026-08-16.

- **Baseline:** `/cellular-automata/colour/1`'s full-viewport editable lattice, synchronous Moore-neighbour updates, and direct brush interaction.
- **Changed variable:** binary Life is replaced by three cyclic states: red changes to green, green to blue, and blue to red when at least three of the eight neighbours have the successor state.
- **Retained invariants:** fixed cell positions, toroidal boundaries, direct painting, pause/step/seed actions, and no wrapper beyond the field and necessary readout.
- **Observable result:** color fronts can chase and displace one another; color is a state transition rather than a visual decoration. Browser observation remains pending.
- **Unresolved question:** how does changing the successor threshold alter the persistence and scale of RGB fronts?

## Route 3 — probabilistic rainbow transmission

Route: `/cellular-automata/colour/3`. Date: 2026-08-16.

- **Baseline:** `/cellular-automata/colour/2`'s full-viewport editable lattice and synchronous updates.
- **Changed variable:** seven rainbow states—red, orange, yellow, green, blue, indigo, violet—replace the three-state cycle. Any differently coloured neighbour can transmit its state; the chance of changing grows with the proportion of foreign neighbours. The incoming colour is sampled in proportion to its local presence. A 0.4% mutation chance preserves diversity after local domains form.
- **Mode comparison:** the participant can switch the existing field between bidirectional probability and the contrasting one-directional seven-colour cycle. Switching does not reseed the field, so the divergent rule can be observed from the same state.
- **Retained invariants:** toroidal boundaries, direct painting, pause/step/seed actions, and the field-first interface.
- **Observable result:** expected to produce variable, two-way seven-colour takeover fronts rather than red→green→blue waves. Browser observation remains pending.
- **Unresolved question:** whether contact chance or mutation rate more strongly controls the lifespan of multi-colour boundaries.

## Route 4 — independent colour and word transmission

Route: `/cellular-automata/colour/4`. Date: 2026-08-16.

- **Baseline:** the directly editable field and independent stochastic transmission developed in route 3.
- **Changed variable:** a second automaton independently cycles the three word states `R`, `G`, and `B`, while the first cycles the RGB cell backgrounds. The background advances `R → G → B`; the white Futura-like text advances in reverse `R → B → G`, so visual colour and written colour can disagree.
- **Retained invariants:** toroidal local neighborhoods, synchronous updates, direct painting, and a field-first full viewport composition.
- **Reference operation:** Sol LeWitt's *Red Square, White Letters* (1962) supplies the problem of language and visual field, not a layout to copy. Here that relation is made unstable through independent propagation.
- **Observable result:** the mismatch readout makes the number of cells whose word and background no longer name the same state available without resolving the contradiction for the participant.
- **Motion treatment:** fast state steps are rendered as overlapping colour replacement and word departure/arrival, so the two independent reverse cycles visibly perform their different transmissions instead of cutting between static grids.
- **Palette comparison:** the `rgb / rainbow` toggle reseeds the same grid structure as either a three-state or seven-state system. In both cases background stays forward and letter stays reverse; only the number of states changes.
- **R/B variant:** unlike the cyclic palette modes, `r/b` applies Conway's `B3/S23` binary Life rule independently to the colour and letter layers. Red denotes state 0 and blue denotes state 1; no cyclic direction or reactivation is applied.

## Route 5 — nine nested Life layers

Route: `/cellular-automata/colour/5`. Date: 2026-08-16.

- **Baseline:** route 4's r/b branch: independent, synchronous, toroidal `B3/S23` automata.
- **Changed variable:** nine independent binary Life layers render a nested cell: square, circle, 45° square, circle, 90° square, circle, 45° square, circle, and 90° square. Every nested shape receives its own red/blue state; a participant may optionally reveal the cell grid with black borders.
- **Retained invariants:** each layer is an exact Life system; no cyclic, probabilistic, or portrait logic is introduced.
- **Observable result:** one cell can contain nine different red/blue states because the nested forms do not share a cellular state.
- **Palette comparison:** `r/b` retains exact `B3/S23` Life layers; `r/g/b` gives each nested layer its own forward three-state cycle; `rainbow` gives each layer a seven-state cyclic field; `taegeuk` gives each layer a four-state cycle in white, black, red, and blue. Changing palette or depth (`1 / 5 / 9`) reseeds the active nested layers.
- **Rainbow calibration:** the seven-state cycle uses two successor neighbours rather than the RGB field's three-neighbour threshold, and has a shorter update/transition cadence. This keeps seven-colour fronts active without globally synchronizing at the denser 40-column scale.
- **Reactivation:** if either independent layer remains below 5% changing cells for 80 generations, a deterministic 3×3 spark is placed in that layer alone. This is a bounded intervention against absorption, not continuous noise.

## Route 6 — nested hexagonal cellular layers

Route: `/cellular-automata/colour/6`. Date: 2026-08-16.

- **Baseline:** route 5's independently evolving nested layers, palette choices, direct painting, optional cell boundaries, and unobtrusive blurred lower control field.
- **Changed variable:** the underlying lattice is flat-top hexagons. The nested sequence is hexagon, circle, hexagon, circle, through nine forms; every form is inscribed in the preceding one and has its own automaton state.
- **R/B rule:** the r/b option uses synchronous `B3/S23` Life independently for every nested layer, calculated across the six immediate hexagonal neighbours. This preserves the Life rule while making the neighbourhood native to the new cell geometry.
- **Palette comparison:** r/g/b, rainbow, and the four-colour white / black / red / blue `taegeuk` palette retain independent successor-cycle fields across the same six-neighbour lattice. The active depth and palette reseed only this route's local model.
- **Depth calibration:** `1 / 5 / 9 / 13` layers are offered. Seventeen layers are deliberately withheld: this route redraws every nested canvas path during each transition, and the near-doubling from 9 to 17 cannot stay reliably responsive on small viewports.
- **Observable result:** the lattice itself, rather than only the interior motif, participates in the contrast between discrete angular enclosure and circular enclosure.

## Grid network — route 1

Route: `/cellular-automata/grid-network/1`. Date: 2026-09-04.

1. **Participant situation:** one person encounters an updating field of 576
   rectangles and may paint a local intervention directly into it.
2. **Primary parameters:** each cell has two independent binary states:
   background follows the four cardinal neighbours and its inset border follows
   the four diagonal neighbours.
3. **Perceptual job:** distinguish the two local transition fields. Horizontal
   and vertical links describe the background field; diagonal links describe the
   border field. Their distinct cadences make agreement and disagreement visible.
4. **Interaction job:** press or drag to paint the background state, then watch
   the cardinal field respond while the diagonal border field continues its own
   transition.
5. **Wrapper justification:** the rectangles are the cells and each visible
   line is one actual horizontal, vertical, or diagonal adjacency across
   different states. Binary black and white background colour is the cardinal
   state; a layout-neutral inset black/white box-shadow is the diagonal state.
   No visible text or legend intervenes.
6. **System family:** this is independent from the six `colour` simulations.
   Per the explicit clock reference, it has a bare full-viewport field and no
   title or controls; it does not inherit clock imagery, palette, or interaction.
7. **Removal test:** the 24 by 24 grid, black/white rectangles, and local
   edges remain. Titles, metrics, visible labels, controls, decorative backgrounds,
   and explanatory chrome do not improve the relation.

### Bounded trial

- **Baseline:** a new networked cellular field, not an alteration of the colour
  automata lineage.
- **Changed variable:** the original eight-neighbour field forks into two
  independent synchronous binary `B2/S12` automata. Background uses four
  cardinal neighbours and steps at 76 ms; border uses four diagonal neighbours
  and steps at 113 ms. A layer that changes fewer than three cells for twelve
  consecutive steps receives a deterministic cross-shaped spark, preventing
  silence without adding continuous noise. For each actual state change, an
  edge is dark only when removing its alive adjacent neighbour would change that
  result; otherwise the same edge remains at 50% black. An absent neighbour is
  not rendered as an active cause. A cardinal or diagonal edge renders only
  when the matching states at its two ends differ; equal states are unconnected.
  The default dimensions live in the pure model as `24 × 24` so a later trial
  can change them without rewriting the renderer.
- **Retained invariants:** stable cell IDs, an edge-to-edge responsive field,
  an exact shared gap for both axes, layout-neutral binary border state,
  binary background state, and one unique edge per local pair.
- **Observed result:** pending an explicit browser-verification request.
- **Unresolved question:** should a later branch animate binary state transfer,
  alter the topology, or vary the grid dimensions while preserving this field?

## Grid network — route 2

Route: `/cellular-automata/grid-network/2`. Date: 2026-09-04.

- **Baseline:** route 1's rectangle field, exact local edge geometry,
  direct painting, independent cardinal/diagonal layers,
  state-difference-only connections, and no visible controls or text.
- **Changed variable:** both binary layers become independent R → G → B
  three-state automata. The successor cycle and three-successor threshold are
  carried from `/cellular-automata/colour/2`, but the inherited network
  topologies remain separate: cardinal neighbours for the background and
  diagonal neighbours for the inset border. A direct causal connection is dark;
  a non-causal connection across differing states remains 50% black.
- **Changed rendering variable:** the field expands to 48 by 48 (2,304 stable
  cells and 8,930 unique local edges) and renders into one device-pixel-ratio
  aware canvas rather than cell and edge DOM nodes. Pointer-to-cell mapping
  retains direct background painting. This preserves the simulation's geometry
  while making the fourfold field practical at its two independent cadences.
- **Retained invariants:** full-viewport geometry, equal-state disconnection,
  no visible controls or text, and the `colour/2` local successor rule. When
  fewer than 7.5% of cells change for three consecutive steps, six deterministic
  RGB patches re-enter that layer; this is a bounded anti-absorption intervention
  for the denser field, not a change to its local rule.
- **Interaction:** pressing a cell advances its background R → G → B; dragging
  applies that selected next state across the field without changing the
  diagonal border layer.
- **Observed result:** pending an explicit browser-verification request.
- **Unresolved question:** whether a later branch should vary only the successor
  threshold while preserving the independent cardinal and diagonal fields.
- **Current rendering trial:** all network connection strokes are doubled from
  the initial Canvas stroke width. The 48 by 48 layout and cell anchors remain
  fixed, while every visible cell rectangle is reduced to 50% of its prior
  area, evenly increasing the space around it; inset-border stroke width is
  unchanged.

## Grid network — route 3

Route: `/cellular-automata/grid-network/3`. Date: 2026-09-04.

- **Baseline:** route 1's separate black-and-white background and border CA
  layers, state-difference-only connections, direct state intervention, and
  field-only interface.
- **Participant situation:** an observer rotates a compact volume to judge
  whether locally separated state changes remain legible through depth.
- **Primary parameter / perceptual job:** a cell's binary state is visible as
  its filled cube; the independent border layer and only those connections
  bridging unequal states reveal the two separate propagation fields.
- **Interaction / wrapper:** drag rotates and wheel zooms the volume; clicking
  a cube toggles only its background state. The bare spatial field is retained
  because the participant's task is to inspect connections through depth, not
  operate a dashboard. Text, controls, metrics, and decorative effects remain
  absent.
- **Changed variable:** the planar field becomes an 8 by 8 by 8 volume (512
  cells). The background CA uses the six face-adjacent cells, while the border
  CA uses the 12 cells sharing an edge diagonally; cube-corner-only neighbours
  are excluded. The corresponding cardinal and diagonal connections remain
  visually and causally independent. Whenever a layer's local rule changes
  fewer than 6% of cells in a step, it immediately receives three deterministic
  3 by 3 by 3 binary patches. Each patch force-toggles its centre, so the layer
  cannot remain visually static; this bounded anti-absorption intervention does
  not alter either local rule.
- **Performance implementation:** one `InstancedMesh` carries all 512 filled
  cubes; one fixed line buffer carries all cube outlines; and one fixed line
  buffer per CA layer compacts only currently visible connections. Each state
  step updates typed colour/position buffers rather than creating React nodes
  or Three objects. Rendering is demand-driven between CA steps, device pixel
  ratio is capped by a four-million-pixel canvas budget, and hidden or
  reduced-motion views suspend the automatic steps.
- **Rendering reference:**
  - question: can a 512-cell volume preserve route 1's causal-line distinction
    without per-cell draw calls?
  - source: [Three.js `InstancedMesh` documentation](https://threejs.org/docs/pages/InstancedMesh.html), accessed 2026-09-04; [Three.js `WebGLRenderer` documentation](https://threejs.org/docs/pages/WebGLRenderer.html), accessed 2026-09-04.
  - transfer: share geometry/materials and mark a completed instance or buffer
    update once, after batched mutations.
  - adaptation: no new renderer, dependency, post-process, or GPU simulation;
    only a WebGL2 Three.js scene with instanced cubes and dynamic line buffers.
  - invariants: binary layers, local causal lines, field-only composition, and
    direct background intervention.
  - evidence: the pure model test fixes 512 cells, 1,344 cardinal edges, and
    2,352 diagonal edges. Across 48 paired model generations, every background
    layer step changed at least 32 cells and every border layer step at least
    31; neither layer had a zero-change step. On the local Node model harness,
    8,000 combined layer steps took 276.81ms (0.0346ms per layer step); browser
    observation is pending explicit request.
  - rejected: fog, shadows, bloom, transparency sorting, and a generic 3D
    control panel do not improve the connection-reading task.
- **Unresolved question:** whether the excluded eight corner-neighbour links
  should become a separate future trial, rather than silently expanding either
  existing layer.
