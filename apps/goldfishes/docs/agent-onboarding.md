# Goldfishes agent onboarding

Read this document before starting any Goldfishes experiment. It turns the SCC
tinkering method into the concrete working contract for
`apps/goldfishes/components`.

## Read before touching code

Read these sources in order:

1. repository rules in `AGENTS.md`;
2. [`Tinkering as the SCC working method`](../../../docs/foundations/tinkering.md);
3. [`Common visual design guidelines`](../../../docs/foundations/design-guidelines.md);
4. this family [archive index](./README.md) and
   [research and rendering history](./research-and-rendering-history.md);
5. the document and complete code directory of the closest existing experiment;
6. `apps/goldfishes/components/experiments.ts`, which is the executable source of
   truth for registered routes.

Do not read only a route file or screenshot and reconstruct the experiment from
memory. The model, renderer, media loading, camera, screen, styles, controls, and
failure history together define the baseline.

## What Goldfishes is doing

Goldfishes studies how a moving school gathers around, passes through, and makes
different attention structures perceptible. The persistent question is not
"what decorative environment can contain fish?" It is how a field, target,
topology, height, surface, or media condition changes the spatial and temporal
relation among fish, selected structures, participant input, and view.

The existing branches make that method concrete:

- `2d/1` retains the Canvas origin: glyph identity, swarm motion, selected media
  cells, and protected-cell behavior operate in a planar field.
- `default` promotes a naturalistic instanced 3D school while preserving the
  attention-field interaction. Its exact-top orthographic view is a comparison
  baseline; orbit and bounded zoom expose actual volume and height.
- `0804/tube` substitutes a fixed Tube topology for free selection. The same
  station coordinates both render the network and attract fish, so the map is
  operational rather than scenery.
- `0804/node-edge` makes a generated asymmetric graph the persistent field. Its
  nodes, edges, projected marks, and attraction targets share one coordinate
  construction, while shallow depth becomes visible through orbit.
- `0804/pillars` keeps baseline movement and selection but changes selected-cell
  geometry into independently sampled symmetric vertical extents. The top view
  preserves the comparable footprint; orbit reveals the changed scale and
  distance. Its initial material is Cat.

This is the characteristic Goldfishes move: preserve a recognizable system,
change a material or operational relation precisely, and let direct comparison
show what the change does.

## Standalone means standalone

Every Goldfishes experiment owns a complete implementation under its own
directory. It must not import code, models, data ledgers, renderers, styles, or
media-atlas modules from another Goldfishes experiment.

The only current shared collection is the immutable company-logo asset set under
`apps/goldfishes/public/assets/goldfishes/assets/company-logos`. Other existing public image files may
be addressed by URL, but the ledger choosing those assets remains local to the
experiment.

In a prompt, words such as "shared with," "same as," "based on," or "reuse the
texture from" describe a visual or behavioral contract unless the user
explicitly asks for shared architecture. Reproduce that contract inside the new
standalone copy. Do not satisfy it with a cross-experiment import.

Duplication here is deliberate isolation, not technical debt to remove. A future
change to `default` or `pillars` must not silently alter a dated experiment.

## Translate the request before editing

Write a small preservation contract in the new experiment document or working
notes:

```text
question:   what relation is this trial trying to expose?
baseline:   which complete experiment is the nearest working parent?
mutation:   exactly what geometry, material, mapping, behavior, or input changes?
invariants: what must remain visually and behaviorally identical?
evidence:   what visible or measurable result would answer the question?
```

Treat every unmentioned property as an invariant. A geometry request does not
authorize new locomotion, camera behavior, controls, palette, layout, text, or
media scheduling. A data request does not authorize a themed dashboard. A 3D
request does not authorize scenery.

For example, a request to replace pillars or rectangles with spheres distributed
through the same 3D scale and carrying the same surface treatment should be read
as follows:

- fork the closest complete spatial experiment;
- change the selected structure's geometry, spatial distribution, and the
  texture mapping required by that geometry;
- preserve the fish model and motion, attention behavior, media collections and
  playback contract, camera grammar, authoring controls, palette, route shell,
  and full-screen composition unless separately requested;
- copy the necessary implementation locally rather than importing from
  `pillars`;
- judge whether the spheres truly occupy readable 3D space and whether every
  material reads correctly across their surface.

That paragraph is an interpretation example, not authorization to build that
experiment during an unrelated documentation task.

## Visual quality bar

Goldfishes experiments may be rapid, but they must be visually resolved at the
level of the tested relation.

- The changed structure must be immediately perceptible without a title,
  caption, legend, or explanatory overlay.
- Geometry must possess actual spatial consequence. Do not call a result 3D
  merely because Three.js or extruded primitives are present.
- Coordinate systems must agree. Rendered structures, interaction hit areas,
  fish targets, floor projections, and resize behavior must remain coincident
  when they claim to describe the same field.
- Materials must fit the geometry deliberately: no accidental stretching,
  seams, flipped faces, unreadable cropping, or per-frame identity flicker.
- Motion must keep goldfish anatomy, heading, tail movement, gathering, and
  collision behavior legible at the intended scale.
- Preserve the sparse field grammar. Do not add water scenery, bubbles, labels,
  metrics, fake system states, cards, badges, decorative borders, glow, or
  technical chrome to make the experiment appear substantial.
- Leva is a collapsed authoring surface. Do not treat it as the artwork's
  participant interface or add new controls without a parameter-level need.
- Randomness must serve the experiment and remain stable for as long as its
  identity should persist. Do not let resize, redraw, theme changes, or frames
  resample a structure that is meant to stay attached to a cell or fish.
- Review the relevant comparison views. For the current 3D family this commonly
  means the exact-top composition plus orbit views that reveal depth; a new
  experiment may justify a different view only when the tested relation requires
  it.

Polish means resolving composition, scale, material, motion, and interaction. It
does not mean adding interface elements.

## Rapid experiment workflow

1. Inspect `git status`, the registry, the target date directory, and untracked
   files. Assume concurrent work exists.
2. Choose the closest complete parent and read all of its handwritten code and
   matching documentation. Inspect local data schemas; large generated ledgers
   need not be read row by row when their schema and ownership are established.
3. Create `apps/goldfishes/components/MMDD/short-name` as a complete local copy. Use a
   short concrete name such as `tube`, `node-edge`, or `pillars`, not a sequence
   number and not a speculative concept statement.
4. Add a matching short document under
   `apps/goldfishes/docs/MMDD/short-name.md` before the trial's rationale
   is forgotten.
5. State mutation and invariants, then change the smallest coherent set of files
   that makes the mutation real.
6. Keep assets and data local except for an explicitly allowed public asset
   collection. Do not extract shared Goldfishes helpers while experimenting.
7. Register the route once in `apps/goldfishes/components/experiments.ts` with its ISO
   date and one concrete short phrase. The registry drives routing and archive
   navigation.
8. Re-read the registry and archive indexes immediately before patching them so
   concurrent entries are retained. Add only this experiment's row and link.
9. Verify in proportion to the change without running prohibited server or build
   commands. Record measurements only when actually performed, with conditions
   and limits.
10. Inspect the final diff. Stop when the present experiment is coherent; put
    newly revealed possibilities in the document rather than silently adding
    them.

Every registered experiment gets at least a concise document. Expand it when the
trial develops a distinct interaction contract, research source, measurement,
failure, or unresolved question.

## Naming, routing, and promotion

- Date folders use the work date in `MMDD` form; documents include the full ISO
  date.
- Route names describe the operative material or relation, not chronology:
  `/0804/pillars`, not `/0804/2`.
- The phrase in the registry should let someone scan dozens of experiments and
  know the single changed proposition.
- A registered dated route is archival. Do not repurpose it for a different
  question.
- `default` is a promoted baseline, not the only valid or latest result. When a
  dated experiment is promoted, preserve the dated origin and deliberately copy
  or replace the complete `default` directory.
- An unregistered directory may be active parallel work. Its presence is not
  permission to finish, rename, register, document as complete, or delete it.

## Parallel-agent protocol

Parallel work is expected, including several Goldfishes experiments on the same
date.

- Never assume a dirty worktree was produced by you or is disposable.
- Keep implementation edits inside the experiment assigned to you.
- Avoid touching another experiment for cleanup, consistency, or abstraction.
- Shared files—especially `experiments.ts`, `docs/README.md`, and this archive's
  `README.md`—are merge points. Re-open them just before each surgical patch.
- Do not reorder unrelated registry rows, normalize other documents, or run
  repository-wide formatters during a scoped task.
- If a new folder or entry appears while you work, preserve it and adjust your
  patch around it. Do not include it in your completion claim.
- If two tasks need the same exact lines and their intended composition is not
  unambiguous, pause and ask the user instead of overwriting either one.

## Recording results and failures

A useful experiment document is factual and compact. Record:

- date, route, short description, and parent baseline;
- participant situation and tested relation;
- changed variable and retained invariants;
- implementation facts necessary to preserve the result;
- direct observations or measurements, including their conditions;
- failures and rejected alternatives;
- unresolved questions that may justify another fork.

Do not turn inference into evidence. "Uses instancing" does not prove a frame
rate. "Uses 3D geometry" does not prove depth is perceptible. "Looks novel" does
not prove the artistic relation works. The archive should make later tinkering
less ignorant, not make the present agent sound certain.

## Completion check

Before handing off a Goldfishes experiment, confirm:

- it answers one intelligible question;
- it is standalone;
- its unrequested visual and interaction contracts remain intact;
- its tested relation is visually resolved without explanatory chrome;
- its route, phrase, date, and document agree;
- its result and uncertainty are recorded honestly;
- no concurrent work was overwritten, adopted, or reported as yours.
