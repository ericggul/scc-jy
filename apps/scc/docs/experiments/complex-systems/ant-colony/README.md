# Ant colony experiment

Route: `/ant-colony/1`, registered through the ant-colony experiment registry
and owned by the filesystem-only `complex-systems` group.

Date: 2026-08-13.

## Interface premise

1. **Participant situation:** one person encounters a sparse colony in an open field and can introduce a local nutrient source by pressing the field.
2. **Primary parameter:** the changing population that results from each agent's local energy balance, inherited traits, and immediate environmental readings.
3. **Perceptual job:** see individual movement settle into shared traces, local nutrition become density, and divisions appear as short-lived blue-grey bodies before they enter the charcoal colony.
4. **Interaction job:** place nutrition rather than direct the colony, then observe whether the added resource sustains a route, a local expansion, or a temporary bloom.
5. **Wrapper justification:** one uninterrupted, low-resolution material field renders the actual quantities agents sense—food and pheromone—without a second explanatory map. It makes the agents' shared environment visible while keeping individual bodies legible.
6. **System family:** the complex-systems mineral ground, charcoal bodies, blue-grey formation, serif title, monospaced state, direct field intervention, and a single full viewport are retained.
7. **Removal test:** bodies, the food-and-trace field, local nourishment, division/loss readouts, pause, and reset remain. A nest illustration, species iconography, path legend, charts, global steering, and simulated status chrome are omitted.

## Bounded trial

- **Baseline:** the local-agent full-viewport field used by `/living-topology/2`, with its shared visual grammar only.
- **Changed variable:** graph relations become stigmergic traces. Every agent samples three nearby directions for food and pheromone, consumes only its current cell, deposits a trace, ages, and may divide. A child inherits appetite, food sensing, trace sensing, turning response, metabolic cost, division threshold, and lifespan with bounded mutation.
- **Retained invariants:** a client-local model, model-layer stable IDs, one direct spatial intervention, no socket dependency, no centralized behavior selector, and no presentation state in the simulation model.
- **Observable result:** unobserved in a browser during this implementation pass. The model's population is bounded at 380 agents; its field values remain bounded between 0 and 1; and pressing within 46px of an existing source strengthens it rather than adding another source.
- **Unresolved question:** should a later fork make food sources mobile or exhaustible, while retaining the same local sensing and inheritance rules?
