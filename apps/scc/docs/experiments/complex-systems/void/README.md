# Void field

Routes: `/void/1`, `/void/2`, and `/void/3`, owned by the filesystem-only `complex-systems` group.

Date: 2026-09-01.

## Interface premise

1. **Participant situation:** one person encounters a dense, moving field on white paper. There is no inserted object at its centre and no directional dart marker. Each element is a compact three-point trace—head, body, tail—whose spacing makes its current Vicsek heading legible before its relations are read.
2. **Primary parameter:** dynamic, reciprocal **attractivity**. It is a state-derived strength of local coherence, not a colour or canvas effect. A pair with greater mutual attractivity exerts more influence in both elements’ next Vicsek heading and receives a darker, thicker live relation.
3. **Perceptual job:** locate regions where mutual influence thickens into coordinated matter and regions where lines thin or disappear. The latter are the route’s voids: temporary absences of local coupling, not a black circular obstacle masquerading as a system rule.
4. **Interaction job:** open the lower adjustment surface and change noise, reach, or attractivity gain. The participant can predict that gain changes both the force of every admitted pair and the line-strength distribution; `advance` commits one synchronous step for reduced-motion inspection.
5. **Wrapper justification:** the field remains almost entirely unframed because the visual task is to perceive changing relation density and weight. There are no titles, counters, colour-coded statuses, grids, gradients, glow, central icon, or decorative trajectories. The on-demand statement `line weight = proximity × mutual attractivity` names the only non-obvious visual encoding.
6. **System family:** this is not styled as an existing complex-systems route. `clock/1` informed only its quality discipline: a device-pixel-ratio-aware canvas, measured motion, small optional controls, and reduced-motion support. It does not supply the palette, layout, typography, or visual language.

## Model card — void/1

- **System object and boundary:** a synthetic, periodic **weighted-attractivity Vicsek variation**. Its base is Vicsek et al.’s discrete-time, off-lattice, constant-speed alignment model: every element includes itself in a metric radius-`r` heading average, all headings update simultaneously, a uniform perturbation in `[-η/2, η/2]` is added, and each element moves at fixed `v = 0.03r`. The responsive rectangular field is periodic via minimum-image distance. There is no excluded central position, focal force, collision geometry, or line-of-sight exception.
- **State:** each stable index owns only position `(x, y)`, heading `θ`, and dynamic attractivity `a ∈ [0.03, 1]`; the simulation owns its deterministic PRNG state, tick, spatial hash, and reusable mutual-edge buffer. Presentation state—opacity, stroke width, dot radius, canvas scaling, and paths—does not enter the simulation.
- **Local action:** for metric neighbours `i, j` with `dᵢⱼ ≤ r`, the simulation derives one reciprocal weight

  `wᵢⱼ = g · (0.14 + 0.86(1 − dᵢⱼ/r)²) · (0.12 + 0.88√(aᵢaⱼ)).`

  It then adds `wᵢⱼ(cos θⱼ, sin θⱼ)` to `i` and the symmetrical term to `j`, alongside each element’s own unit heading. The next attractivity is a smoothed local directional coherence:

  `aᵢ′ = clamp(0.78aᵢ + 0.22‖Σ weighted headings‖ / Σ weights, 0.03, 1).`

  Thus a line’s strength is a direct view of a real pair weight, and changing it changes the following direction calculation. This is an explicit weighted extension, not a claim that the 1995 Vicsek paper used attractivity weights.
- **Visible relation:** one unordered graph edge represents the two reciprocal terms above. Its canvas band comes from `wᵢⱼ`: weak is fine and pale; strong is dark and wider. Every element is rendered as three circular marks aligned to its heading: a dark, large head; smaller body; and quiet tail. Dots grow modestly with their own `a`, so strong relations meet visibly coherent participants. Every graph edge is drawn; strength bands batch strokes only to avoid a browser stroke call per relation.
- **Participant intervention:** `noise` changes `η`; `reach` changes `r` and retains the source speed ratio `v = 0.03r`; `attract.` changes the gain `g` from `0.25` to `2.40`. Defaults are `η = 0.42`, `r = 0.037` of the shorter viewport side, and `g = 1`. Controls affect the model and immediately rebuild its graph; they are not cosmetic intensity controls.
- **Macro observable:** apparent void, dense mutual regions, global polarization, and the live strength distribution arise only from local distance, heading, attractivity, noise, and periodic motion. This finite visual experiment does not claim an empirical flock, a physical vacuum, or a measured critical point.

## Performance boundary

- **Density:** the field starts between 720 and 2,400 elements from the CSS viewport area (for example, a 1440×900 field begins with 2,304): exactly 1.5× the previous field density.
- **Neighbour search:** a retained uniform spatial hash scans only the 3×3 adjacent cells for each agent and adds each candidate pair once. The per-tick model work is `O(N + E)` for active edges rather than an all-pairs `O(N²)` sweep.
- **Memory and stepping:** positions, headings, attractivity, heading sums, cached heading unit vectors, cell links, and relation buffers are typed arrays retained across ticks. The direction cache is initialized once, reused for every active neighbour term, then replaced only when a new heading is calculated; it removes both repeated neighbour and render-path `sin`/`cos` work. No particle objects, maps, or edge objects are allocated in the hot loop. The edge buffer grows only if an unusually dense parameter state requires it.
- **Painting:** updates and repaints run at 24 Hz, with at most one catch-up step; stale time is deliberately discarded rather than causing a main-thread burst. A centred 1.5× camera scale enlarges the field’s points, directional traces, and actual edge widths together without changing model density. On every accepted state, the client scans model arrays once, culls points and relations outside the enlarged camera, reads the cached visible directions, and sorts visible relation indices into four reusable typed buffers. The enlarged camera does not reach a periodic seam, so each visible relation takes the direct one-segment canvas path. Canvas then strokes only visible relations and fills the head, body, and tail marks in three paths. The opaque, desynchronized canvas backing store is capped at 1.25 DPR and 3 million pixels. Resizes are coalesced to one animation frame.
- **Bounded model check:** the pure-model test initializes 2,400 elements and executes 24 spatial-hash steps, checking that every state stays finite. Current Node runs complete it in about 16 ms. That is a model-only measurement, not a browser frame-rate claim; browser interaction verification remains pending an explicit request.

## Causal checks

- Seeded high-density runs replay exactly through 40 synchronous steps.
- Responsive density remains within the stated 720–2,400 bound.
- The spatial graph admits each metric pair only once, including a pair across the periodic seam.
- A high-attractivity pair has more than four times the low pair weight in the tested configuration, and its element turns more strongly toward its neighbour with noise held at zero.
- A single element retains fixed Vicsek travel distance through a periodic seam.
- The maximum-density finite-state check above runs repeated spatial-hash steps without a non-finite position or heading.

## Research ledger

- Vicsek, Czirók, Ben-Jacob, Cohen, and Shochet, [*Novel Type of Phase Transition in a System of Self-Driven Particles*](https://doi.org/10.1103/PhysRevLett.75.1226), *Physical Review Letters* 75, 1226–1229 (1995). The article specifies a fixed absolute velocity, simultaneous neighbour-direction averaging with uniform angular perturbation, an off-lattice periodic square, inclusion of the particle itself in the neighbourhood, and `v = 0.03` when `r = 1`.

## Visual plan and review

- **Palette:** paper `#ffffff`; relation `#121212` through real weight-derived opacity; head `#0d0d0d`, body `#242424`, and tail `#555555`. There is no fixed background object and no semantic colour scheme to learn.
- **Layout:** one uninterrupted white field. The only text is the participant-requested lower-left adjustment surface.
- **Signature:** each individual reads as a three-point moving trace rather than a generic graph node or arrow. The relation is simultaneously a causal model term and its visual trace; its strong state remains fully legible alongside the directed individuals.
- **Self-critique:** density can turn line work into visual fog if reach or gain are pushed high. The bounded radius, canvas batching, and absence of permanent chrome keep the field readable at its default, but high parameter values are deliberately allowed to show saturation rather than silently deleting mutual relations.

## Bounded trial

- **Baseline:** the original void trial treated a central disc as an obstacle and used only 84 elements with a quadratic relation scan.
- **Changed variable:** void now means dynamic absence of active mutual influence. The field is white, central geometry is removed, all elements are dots, density is 720–2,400, and attractivity becomes the model’s reciprocal influence weight.
- **Retained invariants:** a deterministic client-only Vicsek base, synchronous updates, constant speed ratio, one responsive canvas, periodic domain, stable model indices, optional direct controls, no runtime dependency, and no presentation value fed back into the model.
- **Observed result:** the new model makes the requested statement testable: higher attractivity produces both stronger live relations and a greater directional pull in the same synchronous update. The renderer expresses that one causal value through line opacity, line width, and a restrained point-radius change.
- **Unresolved question:** should a subsequent route compare this continuously derived coupling void with a density-only void while holding the Vicsek base and white field constant?

## Model card — void/2

- **Participant situation:** a person encounters one uninterrupted field of three hundred moving sites. The task is to see an extreme influence disparity before reading any text: a small minority keeps a large stack of circles while most sites remain a single ring.
- **Primary parameter:** dynamic site influence `qᵢ ∈ [1, 18]`. The rendered count is exactly `round(qᵢ)`: one unit of influence, one complete circle. No radius, colour, dot size, opacity, or label is used as a second influence encoding.
- **Perceptual job:** recognise exact concentric circles, then see their count rather than their outline determine a site's force. Where a 16- or 18-ring site passes through a field of one-ring sites, the difference must be immediate even without a legend.
- **Interaction job:** this is an observation-only first trial. It deliberately offers no pointer gesture or parameter dock, so the person can learn the changing territory relation before an intervention is introduced.
- **Motion:** sites never return to their starting position. Each one carries an inertial, slowly turning velocity across the full periodic field and passes through an edge to re-enter from the opposite edge. It aligns with its live connected set and curves around high-influence sites instead of collapsing into them. The connection radius spans most of the short screen side, so each site is coupled to many others rather than a small local cluster. High influence makes a site both faster and a stronger turning force; the same `q` yields its circles.
- **Wrapper justification:** selected live relations sit as fine graphite lines behind the unequal circular accumulations. Each site nominates only its four strongest current relations, so the field keeps legible movement rather than returning to `void/1`'s dense graph. It retains `void/1`'s white paper and black marks so the changed proposition is movement and ring-count disparity, not an unrelated palette.
- **System family and removal test:** `void/2` remains a separate, addressable branch from `void/1`; it retains only deterministic client-only canvas motion and no chrome. Removing the centres would make ring ownership ambiguous; making a circle elliptical, varying its thickness, or adding any legend would dilute the one-to-one count-to-influence contract and is excluded.
- **Visual plan:** paper `#ffffff` and graphite `#121212` are retained from `void/1`. The signature is not a special colour for the influential, but the abruptly different amount of exact circular space they occupy.

## Performance boundary — void/2

- The field is fixed at 300 sites. Each 30 Hz model step visits the 44,850 unordered pairs once, then writes both sites' accumulated motion, alignment, exposure, and connection count. It does not repeat the same pair in the opposite order and has no responsive density increase.
- Positions, inertial velocities, phases, baseline influence, current influence, ring counts, live connection counts, cumulative travel distance, and pair accumulators live in retained typed arrays. The hot update allocates no per-site objects.
- Each site retains only four relationship candidates in typed buffers. Duplicate nominations collapse into at most 1,200 canonical visible edges, so the renderer never attempts to paint the 44,850 model pairs.
- The renderer batches those relation edges into three strokes and circles by their 18 possible ring indices, so it makes at most 21 strokes plus one centre path per accepted state. Every ring is a native canvas `arc()` with a single radius, not a sampled or curved contour. It is capped at 1.5 DPR and four million backing-store pixels; resize work is coalesced to one animation frame. Animation frames that do not advance the 30 Hz state do not repaint; reduced-motion preference presents the seeded static field.

## Bounded trial — void/2

- **Baseline:** `void/1` rendered 720–2,400 moving dots and their mutual weighted lines. Its void was a gap in a large relation graph.
- **Changed variable:** `void/2` increases its sparse population from 100 to 300 and gives every site one to eighteen exact concentric circles. The previous Voronoi-like deformation and equal five-ring layer are removed. Ring count alone is the influence display; a bounded set of fine lines restores only the strongest current relations.
- **Retained invariants:** deterministic client-only motion, stable point IDs, a responsive canvas, a full-viewport field, no generic complex-systems chrome, no external dependency, and an accessible static description.
- **Checks:** seeded simulations replay exactly; at least 180 sites begin with one ring and no more than 36 sites have eight or more rings; an eight-second run confirms at least 240 sites travel more than 0.6 of the short-side field unit, each retains at least 150 live connections on average, and the final field occupies at least fourteen cells of a 5×4 screen grid.
- **Unresolved question:** whether a later variation should let a participant subsidise one low-influence site, while preserving the current ring-count-only visual contract.

## Model card — void/3

- **Participant situation:** a person encounters a single close observation of 480 moving directional marks on white paper. The task is to perceive that the bright centre is not a drawn hole: it is where local spacing, alignment, and long-range attraction leave little matter. Moving over a nearby mark temporarily reveals only the relations that are actively determining that one mark's next turn.
- **System object and boundary:** a deterministic, client-only **2D adaptation** of Couzin et al.'s zonal-interaction model. The source model describes a three-dimensional group; this route does not claim a biological reconstruction or a literal 3D torus. There is no wall, periodic seam, focal point, excluded disc, global velocity field, or central force. After each synchronous update, the implementation subtracts the same new centroid from every position. This translation gauge keeps numerical coordinates near zero but leaves every relative position, direction, zone membership, and force unchanged.
- **State:** every stable index owns only position `(x, y)` and a unit heading `(cos θ, sin θ)`; the model owns the seeded PRNG, current tick, retained spatial-hash links, and next-state typed arrays. Canvas scale, visible radius, opacity, relation colour, and pointer selection are presentation state and never enter the update.
- **Local action:** an agent admits neighbours within its 324° perception field and the cumulative radius `rₐ`. The calibrated 2D limits are `rᵣ = 0.040`, `rₒ = 0.045`, and `rₐ = 0.300`; the narrow orientation band is intentional. If any admitted neighbour lies within `rᵣ`, its desired direction is the normalized negative sum of those relative unit vectors—**repulsion has priority**. Otherwise, the normalized sum of neighbour headings in `(rᵣ, rₒ]` and normalized sum of relative unit vectors in `(rₒ, rₐ]` are added and normalized. A uniform angular perturbation of at most `±0.0025` radians is applied to that desired heading. The agent turns no more than `14 rad/s`, then moves at constant `0.020` units/s. All next headings and positions are written before any are committed.
- **Visible relation:** ordinary agents are graphite, forward-weighted ink strokes with a small leading point: heading remains visible even where many elements overlap. The field draws no permanent network. A direct pointer inspection shows the selected agent's three true metric circles and its active subset only: red is priority repulsion, blue is orientation, and ochre is attraction. If repulsion is present, no orientation or attraction relation is shown because the same priority suppresses it in the next turn. These colours are temporary rule labels, not agent categories or visual effects.
- **Interaction job:** hovering or touching within 22 screen pixels of a mark selects it; leaving the field clears the inspection. The participant can compare the white core to the causal local relations without a permanent legend, metric rail, pause button, or generic system chrome. Reduced-motion preference retains a deterministic static first state.

## Performance boundary — void/3

- The population is a deliberate fixed 480, rather than inheriting `void/1`'s high-density graph. This route's primary observable is an individual directional field with a sparse core; increasing count without changing zones would turn its active neighbourhoods into unnecessary pair work and obscure the mark-level reading.
- Each 30 Hz update builds an adaptive uniform spatial hash with cell side `rₐ`, then each agent visits its own 3×3 cell neighbourhood. Position, heading, direction cache, next state, cell links, selected-relation buffers, and cell heads are retained typed arrays. The hot step creates no per-agent or per-neighbour objects and performs no all-pairs scan or persistent-edge allocation.
- Canvas paints only when the 30 Hz state advances, never on the intervening animation frames. Pointer movement is coalesced to one frame and inspects one local neighbourhood; normal painting is two batched mark paths. The opaque, desynchronized canvas is capped at 1.25 DPR and 3 million backing pixels; resize work is coalesced to one frame.
- On the current local Node model-only measurement, 300 settled 480-agent steps take 341.07 ms (about 1.14 ms/step). That is a bounded model measurement, not a browser frame-rate claim.

## Causal checks — void/3

- Two 480-agent fields with the same seed replay exactly for 240 synchronous steps.
- A selected agent with one close, one orientation-band, and one attraction-band neighbour reports only the close neighbour, then starts turning away from it; this checks the source model's repulsion priority rather than merely drawing differently coloured lines.
- With no repulsion neighbour, inspection distinguishes the orientation and attraction bands.
- Starting from the same compact, non-hollow aggregate, the calibrated seed reaches a core fraction of at most 3% inside `r = 0.040` after 600 steps and a mean radius of at least `0.19`. This is a reproducible result of this finite 2D calibration, not evidence that any arbitrary Couzin population or animal group must form a torus.
- The 600-step run also checks all positions and headings remain finite.

## Research ledger — void/3

- Couzin, Krause, James, Ruxton, and Franks, [*Collective Memory and Spatial Sorting in Animal Groups*](https://case.edu/affil/sigmaxi/documents/collectiveMemoryAndSpatialSortingInAnimalGroups_CouzinKrauseJamesRuxtonFranks.pdf), *Journal of Theoretical Biology* 218, 1–11 (2002), [DOI: 10.1006/jtbi.2002.3065](https://doi.org/10.1006/jtbi.2002.3065). The paper specifies the prioritized repulsion zone, orientation and attraction zones, limited perception field, bounded turning response, constant speed, and reports toroidal collective states when orientation is relatively small and attraction is relatively large. `/void/3` retains those local rule relations in two dimensions and records its adaptation explicitly above.

## Visual plan and review — void/3

- **Palette:** paper `#ffffff`; graphite `#101010`; inspection-only repulsion `#ce5544`, orientation `#4e7989`, attraction `#9a7645`. The colour differences do a single job—identify the three local terms—then vanish with the inspection.
- **Layout:** no title, counter, control dock, perimeter labels, central icon, or permanent edge cloud. The model itself is the full viewport.
- **Signature:** directional marks are short, weighted ink strokes rather than `void/1`'s head-body-tail dots or `void/2`'s circle counts. The unusual visual event is a person bringing one agent's true zones into focus while the shared centre stays unclaimed.
- **Self-critique:** a static initial aggregate has a less open core than the settled state, particularly under reduced motion. This is retained honestly rather than pre-drawing a hollow ring; it makes the opening a consequence of the local run rather than a scene prop.

## Bounded trial — void/3

- **Baseline:** `/void/1` is a high-density weighted Vicsek relation graph; `/void/2` treats influence as concentric-circle count. Neither is imported or changed by this trial.
- **Changed variable:** the model is now Couzin's priority-ordered zones with a 2D calibration, unbounded relative space, constant-speed bounded turns, and no persistent network. The visual variable is an agent-directed field with a temporary local causality lens.
- **Retained invariants:** deterministic client-only state, stable indices, synchronous update, one responsive white canvas, no external dependency, no object at the void centre, no presentation value fed into the model, and reduced-motion support.
- **Observed result:** for the recorded seed, sparse orientation plus long attraction opens the low-density core from an initially filled aggregate while an inspected agent exposes exactly the rule that decides its next direction.
- **Unresolved question:** whether a later branch should compare the 2D Couzin core with a Morse-potential vortex while holding this mark-level inspection grammar fixed.
