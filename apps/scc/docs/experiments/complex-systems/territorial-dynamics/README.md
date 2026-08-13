# Territorial dynamics experiment

Route: `/territorial-dynamics/1`, owned by the filesystem-only
`complex-systems` group.

Date: 2026-08-13.

## Interface premise

1. **Participant situation:** one person watches a fictional atlas settle into
   political geography; they can pause it or draw a new atlas.
2. **Primary parameter:** each land cell's territorial owner, and the relation
   at every contested frontier.
3. **Perceptual job:** see expansion turn neutral land into adjacent national
   territory, and see shared borders make pacts, war, truces, and betrayal
   legible as different marks on that same map.
4. **Interaction job:** pause the current history to inspect it, or regenerate
   the geography and watch an independent history begin.
5. **Wrapper justification:** a terrain field is not a dashboard metaphor here:
   it is the substrate on which every political relation occurs. River courses,
   altitude, coast, labels, and borders give the made-up countries geographic
   consequence without claiming to depict a real territory.
6. **System family:** full-viewport mineral paper ground, quiet serif title,
   monospaced field notes, sparse lower ledger, and direct canvas interaction
   derive from the nearby SCC complex-systems and `swarm/2` experiments.
7. **Removal test:** the terrain, ownership layer, relation-coded borders,
   fictional names, current diplomatic event, and pause/regenerate actions are
   necessary. Cards, charts, fake telemetry, and geographic exposition are not.

## Bounded trial

- **Baseline:** SCC's full-viewport canvas field grammar, with `swarm/2` as the
  closest map-and-ledger visual precedent.
- **Changed variable:** local territorial growth is coupled to a mutable
  frontier relation rather than to a fixed spatial or graph rule. Countries
  only interact when their territories share a border.
- **Model:** terrain is a seeded elevation/moisture field. Nations begin around
  separated capitals, annex adjacent unclaimed land, and take enemy frontier
  cells only during war. Border pressure periodically reevaluates neutral,
  allied, and war relations; allied neighbours can later betray one another.
- **Retained invariants:** a single responsive canvas, local browser simulation,
  abstract domain state separated from visual color mapping, and no socket or
  external-geography dependency.
- **Observable result:** not yet browser-observed in this implementation pass.
- **Unresolved question:** should a later branch change only the diplomatic rule
  so that alliances spread through a wider bloc, while terrain and territorial
  growth remain invariant?
