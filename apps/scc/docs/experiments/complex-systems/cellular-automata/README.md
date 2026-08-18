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
- **R/B variant:** unlike the cyclic palette modes, `r/b` applies Conway's `B3/S23` binary Life rule independently to the colour and letter layers. Red denotes state 0 and blue denotes state 1; no cyclic direction or reactivation is applied.

## Route 5 — nine nested Life layers

Route: `/cellular-automata/5`. Date: 2026-08-16.

- **Baseline:** route 4's r/b branch: independent, synchronous, toroidal `B3/S23` automata.
- **Changed variable:** nine independent binary Life layers render a nested cell: square, circle, 45° square, circle, 90° square, circle, 45° square, circle, and 90° square. Every nested shape receives its own red/blue state; a participant may optionally reveal the cell grid with black borders.
- **Retained invariants:** each layer is an exact Life system; no cyclic, probabilistic, or portrait logic is introduced.
- **Observable result:** one cell can contain nine different red/blue states because the nested forms do not share a cellular state.
- **Palette comparison:** `r/b` retains exact `B3/S23` Life layers; `r/g/b` gives each nested layer its own forward three-state cycle; `rainbow` gives each layer a seven-state cyclic field; `taegeuk` gives each layer a four-state cycle in white, black, red, and blue. Changing palette or depth (`1 / 5 / 9`) reseeds the active nested layers.
- **Rainbow calibration:** the seven-state cycle uses two successor neighbours rather than the RGB field's three-neighbour threshold, and has a shorter update/transition cadence. This keeps seven-colour fronts active without globally synchronizing at the denser 40-column scale.
- **Reactivation:** if either independent layer remains below 5% changing cells for 80 generations, a deterministic 3×3 spark is placed in that layer alone. This is a bounded intervention against absorption, not continuous noise.

## Route 6 — nested hexagonal cellular layers

Route: `/cellular-automata/6`. Date: 2026-08-16.

- **Baseline:** route 5's independently evolving nested layers, palette choices, direct painting, optional cell boundaries, and unobtrusive blurred lower control field.
- **Changed variable:** the underlying lattice is flat-top hexagons. The nested sequence is hexagon, circle, hexagon, circle, through nine forms; every form is inscribed in the preceding one and has its own automaton state.
- **R/B rule:** the r/b option uses synchronous `B3/S23` Life independently for every nested layer, calculated across the six immediate hexagonal neighbours. This preserves the Life rule while making the neighbourhood native to the new cell geometry.
- **Palette comparison:** r/g/b, rainbow, and the four-colour white / black / red / blue `taegeuk` palette retain independent successor-cycle fields across the same six-neighbour lattice. The active depth and palette reseed only this route's local model.
- **Depth calibration:** `1 / 5 / 9 / 13` layers are offered. Seventeen layers are deliberately withheld: this route redraws every nested canvas path during each transition, and the near-doubling from 9 to 17 cannot stay reliably responsive on small viewports.
- **Observable result:** the lattice itself, rather than only the interior motif, participates in the contrast between discrete angular enclosure and circular enclosure.
