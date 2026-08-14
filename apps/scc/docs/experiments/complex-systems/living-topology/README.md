# Living topology experiment

Routes: `/living-topology/1` through `/living-topology/6`, registered through the
living-topology experiment registry and owned by the filesystem-only
`complex-systems` group.

Date: 2026-08-13.

## Interface premise

1. **Participant situation:** one person observes a graph as an active material field and may intervene in its local structure.
2. **Primary parameter:** the graph topology—the currently living set of nodes and relations—not a value moving through a fixed network.
3. **Perceptual job:** distinguish node budding, node shedding, relation formation, and relation severing while activity continues to travel through the remaining structure.
4. **Interaction job:** select any primitive operation, or press directly in the field to bud a node there, and anticipate the immediate topological consequence. The automatic sequence continues the same four operations.
5. **Wrapper justification:** one uninterrupted spatial field keeps topology, activity, adaptation, and structural change in the same perceptual plane. Counts only confirm what is already visible.
6. **System family:** cool mineral ground, charcoal structure, blue-grey activity and formation, muted rust loss, serif title, and monospaced graph notation and controls.
7. **Removal test:** the graph, travelling activity, four operations, pause action, and brief structural traces are necessary. A dashboard, scientific taxonomy, example gallery, legend, explanatory cards, and simulated live metadata are omitted because they would compete with the topology itself.

## Bounded trial

- **Baseline:** the SCC full-viewport standalone simulation grammar, with `network-system` used only as a structural comparison for a fixed graph.
- **Changed variable:** topology becomes system state. Activity circulates through edges while `+V`, `−V`, `+E`, and `−E` continually rewrite the graph.
- **Retained invariants:** one viewport, direct manipulation, minimal controls, no socket dependency, no decorative chrome, and stable model-layer IDs for every node and edge.
- **Observable result:** formation is shown in blue-grey, loss in muted rust, and every structural event leaves a short-lived spatial trace. Nodes open and close according to stored activity; moving pulses make edge use visible.
- **Unresolved question:** should later trials let topology changes emerge only from measured activity thresholds, removing the explicit four-operation cycle?

The model is a dynamic graph rather than a Markov-chain display: the set of possible positions and relations changes. The current trial remains Markovian in the separate mathematical sense that its next graph is determined from its current graph and next local operation.

## Living topology/2

1. **Participant situation:** one person observes a dense field of locally moving
   graph agents and can provide a temporary local resource by pressing the field.
2. **Primary parameter:** local topology and motion around each vertex.
3. **Perceptual job:** see high-frequency node birth/death and edge
   formation/severing alongside locally generated position changes.
4. **Interaction job:** supply one local region and anticipate increased activity
   there, while every affected node retains its own reproduction and connection
   thresholds.
5. **Wrapper justification:** the uninterrupted field from `/1` is retained, but
   the larger labels and manual primitive controls are removed so hundreds of
   simultaneous agents remain legible.
6. **System family:** mineral ground, charcoal topology, blue-grey activity,
   serif title, monospaced state, and the same full-viewport direct interaction.
7. **Removal test:** degree-scaled vertex circles, local relations and motion,
   activity pulses, a temporary
   local stimulus, counts, and pause remain. Event narration, centralized
   operation buttons, force layout, and global phase scheduling are removed.

### Bounded trial

- **Baseline:** `/living-topology/1`.
- **Changed variable:** nine centrally scheduled moving nodes become 220 initial
  local agents with independent decision periods, energy, metabolism,
  birth/death thresholds, and local neighbourhoods. Every edge independently
  adapts its affinity and decides whether to remain.
- **Retained invariants:** the public route family, palette, one-viewport field,
  graph notation, stable model-layer IDs, local resource interaction, and the
  four observable topological primitives.
- **Local-motion rule:** every vertex updates its own velocity and position from
  incident neighbours, short-range crowding, individual drift, and boundary
  response. There is no system-wide force-layout target or central position
  solver.
- **Decision boundary:** the animation loop advances time and commits simultaneous
  decisions, but it does not select a system-wide operation. Nodes inspect their
  own state, incident signals, local spatial neighbourhood, and nearby stimulus.
  Edges inspect only their own state and endpoints.
- **Observable result:** not yet browser-observed in this implementation pass.
- **Unresolved question:** whether local resource conservation should be made
  stricter so node birth necessarily depletes the same neighbourhood that
  supports its new edges.

## Living topology/3

1. **Participant situation:** one person observes a faster network whose local
   clusters are continually crossed by long-range relations.
2. **Primary parameter:** the changing ratio and spatial reach of local and
   long-range connectivity.
3. **Perceptual job:** perceive global entanglement as part of the same agent-led
   topology rather than as a separate overlay.
4. **Interaction job:** supply a local resource and observe its consequences
   travel through both nearby and distant relations.
5. **Wrapper justification:** cubic paths distinguish the globally woven network
   from `/2` without introducing explanatory chrome. Curvature grows with chord
   length and keeps a stable side per edge identity.
6. **System family:** `/2`'s mineral field, locally moving degree-scaled circles,
   local stimulus, activity pulses, counts, and pause action are retained.
7. **Removal test:** local and remote agent-selected relations, cubic geometry,
   curve-following activity, and faster topology remain. A global planner,
   bundled-edge decoration, and a second overview diagram are omitted.

### Bounded trial

- **Baseline:** `/living-topology/2`.
- **Changed variable:** 260 initial agents decide more frequently, begin with four
  nearby relations plus an independently selected distant relation, and choose
  between local and long-range candidates during later connection decisions.
  Edge decisions also occur more frequently and edge lifetimes are shorter.
- **Retained invariants:** independent node and edge decisions, locally generated
  movement, degree-scaled hollow circles, the public route family, and direct
  local stimulation.
- **Curve rule:** every relation is rendered as a true cubic Bézier. Its two
  control points lie at one-third and two-thirds of the endpoint chord, offset
  along the chord normal. Offset grows with endpoint distance, is capped, and
  takes a stable sign from the edge ID. Activity positions are evaluated with
  the same cubic equation rather than interpolated along the straight chord.
- **Parametric adjustment:** a collapsed panel exposes reproduction, mortality,
  connection, severance, distant-edge share, motion, and curve bend. The first
  six alter agent or edge decisions; curve bend alters the shared cubic geometry.
  Defaults raise initial energy, reduce initial age and mortality, and favor
  reproduction and connection so the trial is not structurally biased toward
  population collapse.
- **Observable result:** not yet browser-observed in this implementation pass.
- **Unresolved question:** whether long-range edges should affect movement less
  than nearby relations so global connectivity does not collapse spatial
  differentiation.

## Living topology/4

1. **Participant situation:** one person observes the `/3` network through the
   changing directional disorder of each node's immediate relations.
2. **Primary parameter:** normalized local structural entropy, `Hᵢ`, and its
   network mean, `H̄`.
3. **Perceptual job:** distinguish directionally concentrated neighbourhoods
   from neighbourhoods whose relations are distributed across many directions.
4. **Interaction job:** supply a local resource and observe whether subsequent
   birth, motion, connection, and severance increase or reduce nearby entropy.
5. **Wrapper justification:** WebGL point sprites can redraw hundreds of
   entropy-scaled translucent rings each frame while the transparent 2D layer
   preserves the established cubic edge grammar and direct interaction.
6. **System family:** `/3`'s decentralized model, mineral field, cubic relations,
   local stimulus, serif title, monospaced readout, and pause action remain.
7. **Removal test:** the entropy calculation, WebGL ring field, cubic relation
   layer, `H̄`, and 2D fallback remain. Heat-map grids, ornamental shader noise,
   gradients unrelated to data, charts, and explanatory panels are omitted.

### Bounded trial

- **Baseline:** `/living-topology/3` with its default network parameters.
- **Changed variable:** vertex appearance and relation opacity encode local
  directional entropy rather than energy or degree alone.
- **Entropy rule:** each node's incident relations are assigned to eight angular
  sectors. With sector probabilities `pₖ`, the displayed value is
  `Hᵢ = −Σ pₖ log(pₖ) / log(8)`. One-direction concentration approaches zero;
  even distribution across all eight sectors approaches one. `H̄` is the mean
  across living nodes. This is a structural Shannon entropy measure, not a claim
  about the network's thermodynamic entropy.
- **WebGL boundary:** WebGL2 draws entropy-bearing point sprites only. Canvas 2D
  draws the cubic topology and participant stimulus. If WebGL2 or shader setup
  is unavailable, Canvas 2D renders entropy-scaled hollow circles instead.
- **Observable result:** not yet browser-observed in this implementation pass.
- **Unresolved question:** whether a later trial should measure temporal entropy
  from transition histories rather than spatial direction at one instant.

## Living topology/5 — wayfinders

1. **Participant situation:** one person tends a living trail ecology by adding
   temporary nourishment to a field of independently acting wayfinders.
2. **Primary parameter:** topology as an accumulated consequence of agent
   movement, route use, exploration, and repair—not local node decisions or a
   global topology operation.
3. **Perceptual job:** see scouts establish outposts, couriers make some trails
   persistent through traffic, masons repair weak paths, and unused trails or
   unfed outposts disappear.
4. **Interaction job:** press the field to introduce temporary nourishment;
   anticipate that scouts will seek new ground toward it while existing agents
   alter their route selection through the local resource signal. Pause and
   reseed remain available as observation tools.
5. **Wrapper justification:** stitched trails, marked outpost bars, and moving
   role-coloured diamonds make the routes read as built material rather than a
   conventional node-link graph. The visible form differentiates agent work
   without requiring a separate role legend or dashboard.
6. **System family:** the single direct-manipulation viewport and compact
   monospaced readout remain shared; the warm fibre ground, marks, and stitched
   lines distinguish this agent ecology from the mineral graph field in `/1`–`/4`.
7. **Removal test:** nutrition traces, stitched trails, outposts, agents, actual
   role counts, topology events, pause, and reseed remain. Circular nodes,
   conventional edge strokes, parameter panels, a role legend, and simulated
   status metadata are omitted.

### Bounded trial

- **Baseline:** `/living-topology/4` establishes a topology whose individual
  vertices decide locally. `/5` deliberately does not inherit that node model.
- **Changed variable:** 36 mobile agents own the structural decisions. Scouts
  can establish an outpost and its first trail, couriers select and reinforce
  used trails, and masons preferentially repair weak routes. Outposts recharge
  and decline, trails decay without use, agents feed, reproduce, age, and die.
- **Decision boundary:** agents act from their role, energy, current outpost,
  incident trails, their destination's resource, and the temporary nutrient
  field. No frame-level planner selects a creation, deletion, or connection
  operation. The update loop only advances individual decisions and commits the
  resulting shared material state.
- **Retained invariants:** a client-only full-viewport simulation, stable IDs in
  the model layer, responsive internal geometry, direct local intervention, no
  socket dependency, and no presentation calculations in the model.
- **Observable result:** the model test runs a nourished ecology for 48 seconds
  of simulated time, verifies valid endpoint/agent references after every step,
  observes new outposts, bounds the population and topology, and confirms that
  temporary nourishment expires. Browser appearance has not been runtime-tested
  in this implementation pass.
- **Unresolved question:** whether agents should carry a limited material token
  between outposts, making a new trail temporarily deprive its origin rather
  than drawing all establishment energy from the scout alone.

## Living topology/6 — plate 94 observed network

Source: L. Oyarte Galvez et al., “A travelling-wave strategy for plant–fungal
trade,” *Nature* 639, 172–180 (2025),
[doi:10.1038/s41586-025-08614-x](https://doi.org/10.1038/s41586-025-08614-x),
and the authors' Figshare replication package,
[doi:10.6084/m9.figshare.27889143](https://doi.org/10.6084/m9.figshare.27889143).

1. **Participant situation:** one person observes the measured plate 94
   *Rhizophagus irregularis* network over 138 laboratory hours.
2. **Primary parameter:** observed time. The network geometry and node events
   are empirical records, not a stochastic graph inferred from a density PDE.
3. **Perceptual job:** see the root-side network expand into persistent runner
   hyphae, dense absorbing branches, branching junctions, and accumulated
   anastomoses, with the 0 h, 36 h, and 72 h states directly selectable.
4. **Interaction job:** play, pause, scrub, or select a measured checkpoint and
   expect the corresponding recorded topology.
5. **Wrapper justification:** the white paper field, thin black skeleton,
   red/orange/green node semantics, physical scale, and root-side baseline are
   taken from Fig. 1b because the task is inspection of the extracted network.
6. **System family:** the route and single-viewport experiment contract remain;
   the generic mineral or transport-dashboard wrapper does not.
7. **Removal test:** the empirical skeleton, event nodes, time, physical scale,
   scrubber, playback, and node legend remain. Invented sources, sinks,
   pressure, conductance, flux, reinforcement, pruning, reseeding, density
   plots, titles, cards, and decorative status text are removed.

### Data boundary

- The edge image sequence is derived from the paper's official Supplementary
  Video 1, cropped to the observed field and thresholded from its time-coloured
  skeleton to a black skeleton on white. Its geometry is not regenerated.
- `plate94-nodes.json` is derived from the replication package directory
  `Analysis_94_20201123_166_Version1/time_hypha_info`. Degree-one records are
  shown as red tips and degree-three-or-higher records as orange branch nodes.
- Green nodes are accumulated from the recorded `timestep_anastomosis` events
  in `global_hypha_info.json`, at their measured event positions.
- The source data contains 166 hourly records. The interface retains the
  continuous 0–138 h interval visible in the official whole-network video.
- BARE remains a continuum explanation of density-wave behaviour and is not
  used here to invent a microscopic node-edge graph.

### Bounded trial

- **Rejected baseline:** the former `/6` used a fixed 12 by 8 transport grid
  with invented sources, sinks, pressure, conductance, and edge activation. It
  did not create spatial nodes or reproduce the fungal network.
- **Changed variable:** the entire displayed topology now comes from plate 94's
  observed edge sequence and node-event ledger.
- **Retained invariants:** client-only playback, one viewport, stable route, no
  socket, responsive physical coordinates, and a small observation control.
- **Programmatic verification:** pure tests check hour/video conversion,
  measured-frame selection, and accumulation of anastomosis events. Typecheck
  is required separately from visual comparison.
- **Visual verification requirement:** 0 h, 36 h, and 72 h browser captures must
  be compared against Fig. 1b before the trial is described as visually
  complete.
