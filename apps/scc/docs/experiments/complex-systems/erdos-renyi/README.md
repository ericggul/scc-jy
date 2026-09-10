# Erdős–Rényi random graph / 1

Route: `/erdos-renyi/1`. Experimental mathematical demonstrator, added 2026-09-10.

## Model card

- **Object and boundary:** a simple undirected `G(n,p)` graph, not a model of a named communication, social, or biological network. The model owns only stable vertex IDs, independent edge draws, `n`, `p`, and deterministic random state.
- **Local event:** for every unordered pair of distinct vertices, one independent uniform draw retains the edge exactly when it is less than `p`. No degree, age, location, prior edge, or component state affects that draw.
- **Macro observable:** increasing `p` changes the sampled edge budget, isolates, and size of the largest connected component. Deep blue marks the current largest component, pale blue other components, and rust isolated vertices.
- **Participant intervention:** set `n` or `p`, both of which create a new seeded model realization, or sample again at the current settings. The canvas reveals that already-sampled edge set once; speed and pause affect only this visual reveal, never the independent `G(n,p)` draws.

The disk coordinate field and one-off edge reveal belong to the renderer only. Coordinates are deterministic uniform placement, deliberately independent of the graph, so spatial proximity does not pretend to cause a connection. The request-animation-frame loop stops as soon as every sampled edge has been shown.

## Record

- **Baseline:** no prior ER route.
- **Retained invariant:** each possible simple edge receives exactly one independent probability draw.
- **Changed relation:** `p` directly changes the edge inclusion probability; `n` changes the number of possible pairs.
- **Verification:** co-located model checks cover deterministic replay, unique undirected pairs, `p = 0` and `p = 1` limits, and the density/component contrast caused by `p`.
- **Open question:** a later `G(n,M)` route could make the finite edge budget itself the participant’s controlled variable; it should remain distinct from this independent-draw route.

Sources: [Erdős & Rényi, “On random graphs. I” (1959)](https://www.cse.cuhk.edu.hk/~cslui/CMSC5734/erdos-1959-11.pdf); [Erdős & Rényi, “On the Evolution of Random Graphs” (1960)](https://real.mtak.hu/200959/). The implementation uses the independent-edge `G(n,p)` formulation and makes no real-world network claim.
