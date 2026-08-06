# Goldfishes experiment archive

Code family: `components/goldfishes`

Goldfishes uses a date-first archive. `default` is the currently promoted
baseline, `2d` is a retained format branch, and dated folders contain the
experiments made on that day.

Agents must read the [Goldfishes agent onboarding](./agent-onboarding.md) before
starting a trial. It defines this family's artistic method, visual quality bar,
standalone-copy rule, archive workflow, and parallel-work protocol.

| Route | Date | Short description | Notes |
| --- | --- | --- | --- |
| `/goldfishes/default` | current | Orthographic 3D goldfish attraction field | [default](./default.md) |
| `/goldfishes/2d/1` | retained branch | Glyph swarm and media attention cells | [2d/1](./2d/1.md) |
| `/goldfishes/0804/tube` | 2026-08-04 | Tube stations as persistent attraction targets | [0804/tube](./0804/tube.md) |
| `/goldfishes/0804/html` | 2026-08-04 | Live HTML forms as bidirectional attraction targets | [0804/html](./0804/html.md) |
| `/goldfishes/0804/node-edge` | 2026-08-04 | Entropy-generated 3D topology as a persistent attraction field | [0804/node-edge](./0804/node-edge.md) |
| `/goldfishes/0804/pillars` | 2026-08-04 | Randomized vertical attention pillars | [0804/pillars](./0804/pillars.md) |
| `/goldfishes/0806/side-view` | 2026-08-06 | Pillars fork with a side-on initial view | [0806/side-view](./0806/side-view.md) |
| `/goldfishes/0806/compositional-grid` | 2026-08-06 | Locally reconfiguring composite media grid | [0806/compositional-grid](./0806/compositional-grid.md) |
| `/goldfishes/0806/duration` | 2026-08-06 | Temporal pillars accumulating beneath a fixed present | [0806/duration](./0806/duration.md) |
| `/goldfishes/0806/temporal-decay` | 2026-08-06 | Short-lived active strata leaving frozen pillars | [0806/temporal-decay](./0806/temporal-decay.md) |

The executable registry at `components/goldfishes/experiments.ts` is the source
of truth for route validation, navigation metadata, descriptions, dates, and
component selection. The `/goldfishes` index and date indexes such as
`/goldfishes/0804` are derived from that registry.

## Standalone experiment contract

Every experiment directory is a complete implementation. It owns its model,
renderer, screen, styles, media-atlas implementation, and local media-source
ledgers. An experiment must not import implementation or data from another
Goldfishes experiment or from another component family.

Static collections may be shared only outside `components/`. The current
company-logo exception lives at
`public/goldfishes/assets/company-logos`. Experiments may also address existing
public image files by URL, but the source lists that select those files remain
local to each experiment.

To add a rapid experiment:

1. Copy the closest complete experiment into
   `components/goldfishes/MMDD/short-name`.
2. Make changes only inside the new directory.
3. Add one entry with an ISO date and short phrase to `experiments.ts`.
4. Add a matching concise experiment document. Expand it when the trial develops
   a distinct contract, research record, measurement, or failure history.

Previous paths remain permanent redirects:

- `/goldfishes/3d/1` → `/goldfishes/default`
- `/goldfishes/3d/2` → `/goldfishes/0804/tube`
- `/goldfishes/3d/3` → `/goldfishes/0804/pillars`
- `/goldfishes/0804/1` → `/goldfishes/0804/tube`
- `/goldfishes/0804/2` → `/goldfishes/0804/pillars`

The complete pre-archive rationale, rendering measurements, source discussion,
and failure record is retained in
[research and rendering history](./research-and-rendering-history.md).
