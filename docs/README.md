# SCC documentation index

The documentation tree follows the ownership boundaries of `apps/scc`,
`apps/c-val`, `apps/ddong-meong`, and `apps/goldfishes`.

Local development uses Node.js `26.5.1` with npm `11.17.0`; package operations
use pnpm. Vercel builds use Node `24.x`, and Node type definitions target major
24. `package.json#engines.node` allows `24.x || 26.x` so both environments
satisfy the repository without a local engine warning.

- `harness/` contains repository-wide engineering conventions.
- `foundations/` contains shared design and artwork theory.
- Root `docs/` contains only cross-app harness and foundation material.
- Each `apps/<app>/docs/` tree documents that app's experiments and operations.

When a new experiment is registered, add its durable notes beside the matching
family below. A group-level `README.md` may cover several small variants;
variants with their own design contract, research ledger, or failure history
get a dedicated document.

## Harness and foundations

- [Harness overview](./harness/overview.md)
- [Monorepo apps and Vercel setup](./harness/monorepo.md)
- [Experiment and component structure](./harness/experiments.md)
- [Next.js notes](./harness/nextjs.md)
- [HTTPS and sockets](./harness/https-and-sockets.md)
- [Local image collections](./harness/local-image-collections.md)
- [Tinkering as the SCC working method](./foundations/tinkering.md)
- [Common visual design guidelines](./foundations/design-guidelines.md)
- [Multi-Device Web Artwork](./foundations/mdwa.md)
- [Parametric détournement research](./foundations/parametric-detournement.md)

## Experiment map

| Code family | Registered variants | Documentation |
| --- | --- | --- |
| `apps/ddong-meong/components` | `1`, `2`, `3`, `4` | [ddong-meong](../apps/ddong-meong/docs/README.md) · [3 baseline](../apps/ddong-meong/docs/3.md) · [4 콘텐츠 확장 매뉴얼](../apps/ddong-meong/docs/4-content-manual.md) |
| `apps/scc/components/dashboard/palantir` | `1` | [palantir/1](../apps/scc/docs/experiments/dashboard/palantir/1.md) |
| `apps/scc/components/dashboard/stock` | `default`, `1`, `2`, `3`, `4` | [stock index](../apps/scc/docs/experiments/dashboard/stock/README.md) |
| `apps/scc/components/realtime/calendar` | `default`, `1` | [calendar](../apps/scc/docs/experiments/realtime/calendar/README.md) |
| `apps/scc/components/complex-systems/living-topology` | `1`–`5` | [living topology](../apps/scc/docs/experiments/complex-systems/living-topology/README.md) |
| `apps/scc/components/complex-systems/mycorrhizal-wave` | `1`, `2` | [mycorrhizal wave](../apps/scc/docs/experiments/complex-systems/mycorrhizal-wave/README.md) |
| `apps/scc/components/complex-systems/cellular-automata` | `1` | [cellular automata](../apps/scc/docs/experiments/complex-systems/cellular-automata/README.md) |
| `apps/scc/components/complex-systems/adaptive-coevolving-network` | `polling-ecology` | [polling ecology](../apps/scc/docs/experiments/complex-systems/adaptive-coevolving-network/README.md) |
| `apps/scc/components/complex-systems/temporal-network` | `repair-relay` | [temporal network](../apps/scc/docs/experiments/complex-systems/temporal-network/README.md) |
| Complex-systems acceptance standard | — | [removals and simulation standard](../apps/scc/docs/experiments/complex-systems/rejected-examples.md) |
| `apps/scc/components/complex-systems/terminal` | `1` | [terminal colony](../apps/scc/docs/experiments/complex-systems/terminal/README.md) |
| `apps/scc/components/standalone/bastille-day` | `1`, `2` | [bastille-day](../apps/scc/docs/experiments/standalone/bastille-day/README.md) |
| `apps/scc/components/standalone/cv` | `1`, `2`, `3` | [cv](../apps/scc/docs/experiments/standalone/cv/README.md) |
| `apps/scc/components/standalone/macos` | `1` | [macos](../apps/scc/docs/experiments/standalone/macos/README.md) |
| `apps/scc/components/standalone/moma` | `1`, `2` | [moma](../apps/scc/docs/experiments/standalone/moma/README.md) |
| `apps/scc/components/standalone/swarm` | `1`–`3` | [swarm](../apps/scc/docs/experiments/standalone/swarm/README.md) |
| `apps/scc/components/standalone/table` | `1`, `2` | [table](../apps/scc/docs/experiments/standalone/table/README.md) |
| `apps/scc/components/standalone/translate` | `1` | [translate](../apps/scc/docs/experiments/standalone/translate/README.md) |
| `apps/scc/components/standalone/grid` | `1`, `2`, `3`, `4`, `5` | [grid](../apps/scc/docs/experiments/standalone/grid/README.md) |
| `apps/goldfishes/components` | `default`, `2d/1`, `0804/tube`, `0804/html`, `0804/node-edge`, `0804/pillars`, `0806/side-view`, `0806/compositional-grid`, `0806/duration`, `0806/temporal-decay` | [archive](../apps/goldfishes/docs/README.md), [agent onboarding](../apps/goldfishes/docs/agent-onboarding.md) |
| `apps/scc/components/dj` | `1` | [dj](../apps/scc/docs/experiments/dj/README.md) |
| `apps/scc/components/finger-skating` | `1`, `2` | [finger-skating](../apps/scc/docs/experiments/finger-skating/README.md) |
| `apps/c-val/components` | `1`, `2` | [c-val](../apps/c-val/docs/README.md) |
| `apps/scc/components/network-system` | `default`, `macro-economy`, `cycle`, `population`, `competitive-firms` | [network-system index](../apps/scc/docs/experiments/network-system/README.md) |
| `apps/scc/components/sns` | `feed/1`, `navigation/default`, `navigation/1`, `youtube/1`, `youtube/2`, `linkedin/1` | [sns index](../apps/scc/docs/experiments/sns/README.md) |

The registries under `apps/*/components/**/experiments.ts` remain the source of truth
for executable variants. This index describes them; it does not replace those
registries.
