# Adaptive coevolving network experiments

Routes: `/adaptive-coevolving-network/2`,
`/adaptive-coevolving-network/3`, and
`/adaptive-coevolving-network/polling-ecology`.

## Open adaptive network

Date: 2026-08-14.

### Scientific basis and boundary

`/2` implements the event structure of Shkarayev, Schwartz, and Shaw's open
adaptive recruitment network: nodes occupy non-susceptible `N`, susceptible
`S`, or recruiter `R` states; a new `N` node enters with two random
relations; every node can leave and takes its incident relations with it; `N`
and `S` switch state; an `S` node becomes `R` at a rate proportional to
its recruiter neighbours; and a recruiter can rewire an `R–N` relation to an
`R–S` relation. The published model explicitly treats an open population and
state-dependent rewiring, so it changes both the vertex set `V` and relation
set `E`.

The browser version is a finite, seeded, individual-based realization of that
mechanism, not a calibrated reconstruction of a real social group or a claim
about recruitment. Each animation frame advances the model with the bounded
continuous-time event probability `1 − exp(−rΔt)`; the sliders scale browser
rates rather than claiming the paper's empirical units. A maximum population is
only a rendering-cost bound. A new node's nearby screen position is an identity
anchor, not a spatial force or an additional interaction rule.

Reference: Maxim S. Shkarayev, Ira B. Schwartz, and Leah B. Shaw,
[*Recruitment dynamics in adaptive social networks*](https://doi.org/10.1088/1751-8113/46/24/245003),
*Journal of Physics A: Mathematical and Theoretical* 46, 245003 (2013);
[open preprint](https://arxiv.org/abs/1111.0964). The broader definition of an
adaptive network as reciprocal node-state/topology feedback is reviewed by
Thilo Gross and Bernd Blasius,
[*Adaptive Coevolutionary Networks – A Review*](https://doi.org/10.1098/rsif.2007.1229).

### Model card

1. **Object and boundary:** a finite open graph `G(t) = (V(t), E(t))` with
   categorical node state. It is a direct event-level realization of an
   academic recruitment model, with an explicitly documented finite browser
   bound.
2. **Micro mechanism:** a node's neighbours determine its recruiter exposure;
   its state determines whether recruiter-held relations can be rewired; entry
   makes a new vertex and two initial relations; departure removes a vertex and
   every relation incident to it. No frame-level planner chooses an aggregate
   network operation.
3. **Macro observable and intervention:** the readout reports `N/S/R`,
   `|V|/|E|`, connected components, and actual entry/exit/recruitment/rewiring
   event totals. Pressing the field turns nearby `N` nodes into `S` nodes:
   an explicit external susceptibility intervention that lets a participant
   test the published feedback loop.
4. **Screen encoding:** filled grey nodes are `N`; outlined blue nodes are
   `S`; filled rust nodes with a second ring are `R`. Rust relations are
   current `R–S` recruitment opportunities. A ring expanding from a node is
   emitted only when that vertex actually entered `V`; animated dashes mark
   an actual changed relation endpoint.
5. **Causal contrast:** pure-model tests prove deterministic replay, valid
   endpoints after every death, actual vertex turnover, and a different edge
   endpoint sequence when state-dependent rewiring is enabled rather than
   locked at zero. These are model invariants, not a claim that the source
   paper's population-level results have been replicated.

### Interface contract

1. **Participant situation:** one person watches a topology whose vertex count,
   membership states, and relations all evolve in one field.
2. **Primary parameter:** the feedback `node state → relation update → future
   node exposure`, extended with entry and death so `V` is also dynamic.
3. **Perceptual job:** distinguish a state transition, a reconfigured
   relation, a newly entered vertex, and a departed vertex by their direct
   visual consequences.
4. **Interaction job:** introduce local `S` availability and adjust
   recruitment, rewiring, entry, and turnover rates to form a falsifiable
   expectation about how the open graph will reorganize.
5. **Wrapper justification:** one direct-manipulation field keeps all three
   coupled layers—state, edges, and vertex turnover—spatially co-present. The
   compact measurements are included because entries and departures are
   otherwise difficult to count reliably in a dense, live graph.
6. **System family:** node form and relation colour encode model state; there
   are no domain-status badges, fabricated data feeds, force-layout motion, or
   decorative background particles.
7. **Removal test:** the graph, node-state forms, vertex-arrival trace,
   reconfigured ties, local susceptibility action, four causal controls,
   pause, reseed, and actual event counts remain. A legend, cards, fake live
   indicators, and secondary charts are omitted.

### Bounded trial

- **Baseline:** the earlier closed exchange trial on this route only changed
  relation strength and endpoints.
- **Changed variable:** `/2` now uses an open `N/S/R` state process with
  entry, per-node death, two entry relations, recruiter exposure, and
  recruiter-to-susceptible rewiring.
- **Retained invariants:** a client-only full-viewport model, stable IDs in the
  model layer, deterministic reseeding, direct local intervention, no socket,
  and no presentation state in the simulation data.
- **Verified result:** pure-model tests pass for deterministic replay, bounded
  valid topology, nonzero entry and exit events, new vertex identities, changed
  edge endpoints under rewiring, and spatially bounded intervention.
- **Unresolved question:** a later trial could implement a true Gillespie event
  queue and compare its event-time statistics with this browser-rate tau-leap
  realization without changing the existing route.

## Lattice adaptive network

Date: 2026-08-14.

This is a separate spatial constraint on the same open adaptive-network event
family. It preserves the N/S/R state process, entry/departure, state-dependent
rewiring, and independent relation formation/decay of the academic recruitment
model cited above. It does not claim that the source publication used a lattice.

Every possible vertex exists as a stable candidate site at the centre of an
N-by-N grid cell. N defaults to 32 and is adjustable from 16 through 50; no
site can drift or be created between grid centres. Only a small seeded subset is
active at first. Entry activates one previously inactive site, departure returns
one active site to inactive, and removes every incident relation. An entrant
gets up to two locally weighted initial relations. Recruiter rewiring and later
tie births select active candidates by grid distance, so the visual lattice is
also a model constraint rather than a placement decoration.

1. **Participant situation:** one person watches the latent 2-D population
   substrate and its changing active graph at once.
2. **Primary parameter:** the difference between the fixed candidate universe
   of N² sites and the changing active vertex set V(t).
3. **Perceptual job:** see a dim unoccupied candidate turn into a coloured
   N/S/R node, acquire local ties, lose those ties on departure, and leave the
   candidate grid available for later reactivation.
4. **Interaction job:** press a candidate site to activate it as susceptible,
   or turn an active N site susceptible; tune N, recruitment, rewiring,
   activation, and turnover.
5. **Screen encoding:** inactive candidates are dim grid dots; active N nodes
   are grey, S nodes are outlined blue, R nodes are rust with a second ring.
   Expansion rings encode only actual state activation/change.
6. **Bounded evidence:** pure-model tests assert exact N² candidate count and
   immutable grid coordinates, deterministic replay, nonzero activation and
   departure, valid relation endpoints, rewiring endpoint change, and direct
   activation of a selected cell.
7. **Unresolved question:** a later trial could use a distance kernel measured
   from a real spatial contact network. That would be a separate calibration
   task, not a reason to present this synthetic grid as empirical data.

## Polling ecology

Route: `/adaptive-coevolving-network/polling-ecology`.

This is a clearly synthetic cellular stance ecology, not a model of an
electorate and not evidence about real polling. Each cell carries faction,
topic, conviction, and age; synchronous neighbourhood rules allow local
reproduction, switching, and attrition. Seeding a patch is a bounded
intervention whose persistence, spread, or disappearance can be observed
directly in the same lattice.

The route is retained because its visible cells and its local update state refer
to the same mechanism. That is a minimum coherence condition, not a claim that
the ecology is a sophisticated model. Future changes must follow the
[complex-systems simulation standard](../rejected-examples.md), especially if
they change the issue cycle or describe the field as a network.
