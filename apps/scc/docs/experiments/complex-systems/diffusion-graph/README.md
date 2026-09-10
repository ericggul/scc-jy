# Diffusion graph / 1

Route: `/diffusion-graph/1`. This is a deliberately bounded mathematical
demonstrator, adapted from NetLogo’s *Diffusion on a Directed Network* model
(Stonedahl and Wilensky, 2008), rather than a claim about a particular physical
or social network.

## Interface premise

**Perceptual job:** follow how directed access and repeated rewiring concentrate
or release a conserved value. Node area shows the held value, while arrow
brightness shows the share that actually travelled over an active link.

## Model card

- **Boundary:** an odd `3`–`19` square lattice. Each node begins with value `1`;
  every directed cardinal-neighbour link belongs to either the active or
  invisible/inactive link set.
- **Local update:** during a tick, a node with active outgoing neighbours keeps
  `value × (1 − diffusion-rate / 100)` and shares the remainder equally along
  those links. A node without active outgoing neighbours keeps all of its
  value. Node values then update together. An active link records the share
  that traversed it that tick.
- **Rewiring:** `rewire-a-link` first deactivates a uniformly selected active
  link, then activates a uniformly selected inactive link. The just-deactivated
  link remains in the second choice pool, so a rewire may leave topology
  unchanged; active-link count is invariant. `keep rewiring` is `true` by
  default and applies that same operation once immediately before each SCC
  diffusion tick.
- **Macro observable and intervention:** blue node area encodes value and arrow
  brightness encodes current link flow. Changing diffusion rate or persistent
  rewiring lets a participant observe whether value pools or redistributes,
  without inventing a domain story.

## Implementation and evidence

The model keeps fixed lattice/link arrays and reuses typed-array value buffers;
it has no force layout, particles, or per-frame graph construction. Rendering
is capped at 30 fps and device pixel ratio at `2`; the largest permitted lattice
is 361 nodes with at most 1,368 directed links.

The co-located model test checks the directed lattice cardinality, the exact
retention/distribution rule, dangling-node retention, mass conservation across
120 diffusion-and-rewire ticks, and active-link-count invariance. Browser
interaction observation is not recorded here because it has not been requested.

Source model: F. Stonedahl and U. Wilensky, *Diffusion on a Directed Network*
(2008), Center for Connected Learning and Computer-Based Modeling, Northwestern
University. The supplied NetLogo model states a
[CC BY-NC-SA 3.0 license](https://creativecommons.org/licenses/by-nc-sa/3.0/).
This SCC adaptation retains attribution and should be used consistently with
that licence’s non-commercial and share-alike conditions.
