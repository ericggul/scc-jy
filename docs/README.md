# SCC documentation index

The documentation tree follows the same ownership boundaries as `app/` and
`components/`.

- `harness/` contains repository-wide engineering conventions.
- `foundations/` contains shared design and artwork theory.
- `experiments/` mirrors the runtime/component families: `dashboard`,
  `realtime`, `standalone`, and the complex top-level experiment families.

When a new experiment is registered, add its durable notes beside the matching
family below. A group-level `README.md` may cover several small variants;
variants with their own design contract, research ledger, or failure history
get a dedicated document.

## Harness and foundations

- [Harness overview](./harness/overview.md)
- [Experiment and component structure](./harness/experiments.md)
- [Next.js notes](./harness/nextjs.md)
- [HTTPS and sockets](./harness/https-and-sockets.md)
- [Common visual design guidelines](./foundations/design-guidelines.md)
- [Multi-Device Web Artwork](./foundations/mdwa.md)
- [Parametric détournement research](./foundations/parametric-detournement.md)

## Experiment map

| Code family | Registered variants | Documentation |
| --- | --- | --- |
| `components/dashboard/palantir` | `1` | [palantir/1](./experiments/dashboard/palantir/1.md) |
| `components/dashboard/stock` | `default`, `1`, `2`, `3`, `4` | [stock index](./experiments/dashboard/stock/README.md) |
| `components/realtime/calendar` | `default`, `1` | [calendar](./experiments/realtime/calendar/README.md) |
| `components/standalone/bastille-day` | `1`, `2` | [bastille-day](./experiments/standalone/bastille-day/README.md) |
| `components/standalone/cv` | `1`, `2`, `3` | [cv](./experiments/standalone/cv/README.md) |
| `components/standalone/macos` | `1` | [macos](./experiments/standalone/macos/README.md) |
| `components/standalone/moma` | `1`, `2` | [moma](./experiments/standalone/moma/README.md) |
| `components/standalone/swarm` | `1`–`6` | [swarm](./experiments/standalone/swarm/README.md) |
| `components/standalone/table` | `1`, `2` | [table](./experiments/standalone/table/README.md) |
| `components/standalone/translate` | `1` | [translate](./experiments/standalone/translate/README.md) |
| `components/dj` | `1` | [dj](./experiments/dj/README.md) |
| `components/finger-skating` | `1`, `2` | [finger-skating](./experiments/finger-skating/README.md) |
| `components/network-system` | `default`, `macro-economy`, `cycle`, `population`, `competitive-firms` | [network-system index](./experiments/network-system/README.md) |
| `components/sns` | `feed/1`, `navigation/default`, `navigation/1`, `youtube/1`, `youtube/2`, `linkedin/1` | [sns index](./experiments/sns/README.md) |

The registries under `components/**/experiments.ts` remain the source of truth
for executable variants. This index describes them; it does not replace those
registries.
