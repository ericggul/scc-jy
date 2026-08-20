# page-rank

Route: `/page-rank/1`. Date: 2026-08-20.

## page-rank/1

1. **Participant situation:** a participant encounters the directed graph itself, can let it iterate continuously or one step at a time, and can watch coloured random surfers cross its links while dragging pages only changes spatial arrangement.
2. **Primary parameter:** page rank. Each page is the NetLogo circle whose size follows `0.2 + 4 * sqrt(rank / total-rank)`; the optional adjacent label uses the source model's three-decimal rank value.
3. **Perceptual job:** make the rank distribution's settling visible while preserving link direction, dangling pages, and the supplied example-page colours. In random-surfer mode, coloured triangle surfers immediately move to their selected next page while a travelled directed link takes the last traversing surfer's colour for that tick, following the supplied NetLogo `move-to current-page` and `watch-surfers?` branches.
4. **Interaction job:** the lower overlay switches calculation method and graph preset, exposes damping and step rate, and conditionally exposes surfer count or preferential-attachment parameters. The default is `Preferential Attachment 100 2` in random-surfer mode with surfer watching enabled. Dragging changes only browser-side layout coordinates.
5. **Wrapper justification:** PageRank's graph is the whole visual field. The control overlay follows the existing `face-voronoi/4` field-control grammar: one lower readout and direct parameters/actions, with no title, panel, legend, or permanent explanatory chrome.
6. **System family:** this route intentionally does not inherit another `complex-systems` visual grammar. Its white patch field, coloured circle pages, black rank labels, and curved grey directed links preserve the supplied NetLogo representation rather than assigning it a new visual identity.
7. **Removal test:** removing page size hides rank; removing rank labels removes the numerical reading; removing a curved arrow removes a directed graph relation; every remaining bottom-bar item changes or reports an actual model variable.

## Bounded trial

- **Baseline:** the supplied NetLogo PageRank model, including its two directed examples, preferential graph generator, damping factor, dangling-page handling, synchronous diffusion update, visit-based random-surfer alternative, `circle` page shape, three-decimal labels, curved links, and 300 spring-layout repetitions.
- **Changed variable:** the runnable browser field retains the source model's graph representation while exposing its parameters through `face-voronoi/4`'s minimal lower control grammar. The graph's initial 300-step browser spring layout is seeded so the same construction parameters reproduce its spatial result.
- **Invariants:** diffusion distributes every dangling page's rank uniformly before applying teleportation; diffusion rank remains normalized; the surfer method increments a current-page visit before choosing a link-or-teleport move; each surfer retains its identity and colour across updates; every directed link remains a `G(V, E)` relation independent of screen position.
- **Verification target:** unit tests cover normalized diffusion with dangling pages, reproducible normalized surfer estimates, seeded preferential generation without self-links or duplicated directed edges, and bounded deterministic spring layout. Type checking covers the route and interaction layer.
- **Unresolved question:** a later route can isolate personalized teleport vectors or compare convergence error against an analytic stationary distribution while preserving this route as the graph-first baseline.
