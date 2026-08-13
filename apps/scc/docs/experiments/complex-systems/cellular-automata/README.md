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
