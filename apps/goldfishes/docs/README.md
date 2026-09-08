# Goldfishes archive

Code: `apps/goldfishes/components`; registry: `components/experiments.ts`. The registry is authoritative for routable experiments and archive navigation. `default` is the promoted baseline; dated routes are archival and must not be repurposed.

For a route change, read its document, the specific modules being changed, and the registry. Read [onboarding](./agent-onboarding.md) when creating or substantially changing a Goldfishes experiment; consult [history](./research-and-rendering-history.md) only for a relevant rendering, measurement, or historical-decision question.

| Route | Date | Proposition |
| --- | --- | --- |
| `/default` | current | Orthographic 3D attention field. [doc](./default.md) |
| `/2d/1` | retained | Glyph swarm and media cells. [doc](./2d/1.md) |
| `/0804/tube` | 2026-08-04 | Stations are fixed attraction targets. [doc](./0804/tube.md) |
| `/0804/html` | 2026-08-04 | Live HTML forms enter the attention loop. [doc](./0804/html.md) |
| `/0804/node-edge` | 2026-08-04 | A revealed 3D topology is the field. [doc](./0804/node-edge.md) |
| `/0804/pillars` | 2026-08-04 | Selected cells become symmetric pillars. [doc](./0804/pillars.md) |
| `/0806/side-view` | 2026-08-06 | Pillars begin side-on. [doc](./0806/side-view.md) |
| `/0806/compositional-grid` | 2026-08-06 | Selections seed local 2×2 media structures. [doc](./0806/compositional-grid.md) |
| `/0806/duration` | 2026-08-06 | Clicks accumulate downward duration. [doc](./0806/duration.md) |
| `/0806/temporal-decay` | 2026-08-06 | Traces freeze after a lifetime. [doc](./0806/temporal-decay.md) |

Each experiment is a complete local copy: no cross-experiment implementation or ledger imports. Existing public images may be addressed by URL; only immutable company logos are a shared collection (`public/assets/goldfishes/assets/company-logos`). Asset URLs must exist inside this independently deployed app; after changing a collection, run `pnpm audit:goldfishes-assets`.

To add a trial, copy the nearest complete directory into `components/MMDD/short-name`, mutate only that copy, register its ISO date and concise proposition, and add a document recording question, mutation, invariants, result, and uncertainty. Re-open the registry and this index immediately before a surgical patch: parallel work is expected.

Legacy redirects remain: `/3d/1` → `/default`; `/3d/2`, `/0804/1` → `/0804/tube`; `/3d/3`, `/0804/2` → `/0804/pillars`. Goldfishes has no client Socket.IO protocol; add one only for a concrete experiment under `socket/experiments/<experiment>/` with its own prefix and room.
