# Barabási–Albert network growth / 1

Route: `/barabasi-albert/1`. Experimental mathematical demonstrator, added 2026-09-10.

## Model card

- **Object and boundary:** an undirected Barabási–Albert graph, not a model of a named social, biological, or technical network. The state is its stable vertex IDs, birth generation, simple edges, degrees, and seeded random state.
- **Initial condition:** the default permitted seed is the sample’s complete five-vertex graph (`m₀ = 5`), so every initial vertex has positive degree. This is a choice of seed, not a claim that BA requires complete initial graphs.
- **Local event:** every newcomer attaches to `m` different existing vertices. Each draw is proportional to an eligible vertex’s degree, `P(i) = degree(i) / Σ degree(j)`; a selected target is removed from the event’s candidate set before the next draw, preventing duplicate edges.
- **Macro observable:** hubs arise as accumulated degree inequality. Vertex area encodes degree; all vertices and relations share the same blue network material, while a newly centre-born vertex and its incident edges briefly use the darker blue state.
- **Participant intervention:** choose `m` from one to four, set growth speed, pause, advance one event, or restart the fixed seed. Speed changes only the interval between real growth events; changing `m` restarts a graph with a different actual edge budget and mean degree.

The original model combines continuous growth with linear degree-proportional attachment. Its asymptotic `P(k) ∝ k⁻³` result is not estimated or claimed from one visual run: a single finite graph is not an exponent estimate.

## Implementation and record

The model remains pure and deterministic. It performs exact weighted sampling without replacement; IDs never derive from labels or layout. Every newcomer begins at the centre, after which the canvas renderer alone relaxes the composition. The renderer uses local repulsion, link springs, and a birth-order radial target so old hubs stay dense at the centre while later vertices spread outward. That movement cannot change attachment probabilities or topology.

- **Baseline:** no prior Barabási–Albert route.
- **Retained invariant:** a simple graph with one newcomer per event and `m` distinct older endpoints selected by current degree.
- **Observed result:** the initial five-vertex seed remains central; every later vertex begins at the centre before its model-derived presentation force moves it outward. There is no automatic vertex-count stop.
- **Open question:** a future non-visual generator for much larger ensembles should use a tested dynamic weighted-sampling structure and compare ensembles, rather than using a single canvas frame as an exponent measurement.

Sources: [Barabási & Albert, “Emergence of Scaling in Random Networks” (1999)](https://arxiv.org/abs/cond-mat/9910332); [Barabási, *Network Science*, §5.2](https://barabasi.com/f/622.pdf). The route follows their growth rule; it does not use the model to substantiate a real-world domain claim.
