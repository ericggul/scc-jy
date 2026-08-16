# Cellular automata experiment

Route: `/cellular-automata/1`, owned by the filesystem-only `complex-systems` group.

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

Route: `/cellular-automata/2`. Date: 2026-08-16.

- **Baseline:** `/cellular-automata/1`'s full-viewport editable lattice, synchronous Moore-neighbour updates, and direct brush interaction.
- **Changed variable:** binary Life is replaced by three cyclic states: red changes to green, green to blue, and blue to red when at least three of the eight neighbours have the successor state.
- **Retained invariants:** fixed cell positions, toroidal boundaries, direct painting, pause/step/seed actions, and no wrapper beyond the field and necessary readout.
- **Observable result:** color fronts can chase and displace one another; color is a state transition rather than a visual decoration. Browser observation remains pending.
- **Unresolved question:** how does changing the successor threshold alter the persistence and scale of RGB fronts?

## Route 3 — probabilistic rainbow transmission

Route: `/cellular-automata/3`. Date: 2026-08-16.

- **Baseline:** `/cellular-automata/2`'s full-viewport editable lattice and synchronous updates.
- **Changed variable:** seven rainbow states—red, orange, yellow, green, blue, indigo, violet—replace the three-state cycle. Any differently coloured neighbour can transmit its state; the chance of changing grows with the proportion of foreign neighbours. The incoming colour is sampled in proportion to its local presence. A 0.4% mutation chance preserves diversity after local domains form.
- **Mode comparison:** the participant can switch the existing field between bidirectional probability and the contrasting one-directional seven-colour cycle. Switching does not reseed the field, so the divergent rule can be observed from the same state.
- **Retained invariants:** toroidal boundaries, direct painting, pause/step/seed actions, and the field-first interface.
- **Observable result:** expected to produce variable, two-way seven-colour takeover fronts rather than red→green→blue waves. Browser observation remains pending.
- **Unresolved question:** whether contact chance or mutation rate more strongly controls the lifespan of multi-colour boundaries.

## Route 4 — independent colour and word transmission

Route: `/cellular-automata/4`. Date: 2026-08-16.

- **Baseline:** the directly editable field and independent stochastic transmission developed in route 3.
- **Changed variable:** a second automaton independently cycles the three word states `R`, `G`, and `B`, while the first cycles the RGB cell backgrounds. The background advances `R → G → B`; the white Futura-like text advances in reverse `R → B → G`, so visual colour and written colour can disagree.
- **Retained invariants:** toroidal local neighborhoods, synchronous updates, direct painting, and a field-first full viewport composition.
- **Reference operation:** Sol LeWitt's *Red Square, White Letters* (1962) supplies the problem of language and visual field, not a layout to copy. Here that relation is made unstable through independent propagation.
- **Observable result:** the mismatch readout makes the number of cells whose word and background no longer name the same state available without resolving the contradiction for the participant.
- **Motion treatment:** fast state steps are rendered as overlapping colour replacement and word departure/arrival, so the two independent reverse cycles visibly perform their different transmissions instead of cutting between static grids.
- **Palette comparison:** the `rgb / rainbow` toggle reseeds the same grid structure as either a three-state or seven-state system. In both cases background stays forward and letter stays reverse; only the number of states changes.
- **Rainbow calibration:** the seven-state cycle uses two successor neighbours rather than the RGB field's three-neighbour threshold, and has a shorter update/transition cadence. This keeps seven-colour fronts active without globally synchronizing at the denser 40-column scale.
- **Reactivation:** if either independent layer remains below 5% changing cells for 80 generations, a deterministic 3×3 spark is placed in that layer alone. This is a bounded intervention against absorption, not continuous noise.
