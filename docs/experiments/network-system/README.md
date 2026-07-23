# Network System experiments

The family uses one controller route and one or more screen routes per
registered experiment:

- `/network-system/[experiment]/controller`
- `/network-system/[experiment]/screen/[screen]`

`components/network-system/experiments.ts` is the route and screen registry.
Each experiment owns an isolated socket room and event prefix under
`socket/experiments/network-system/`.

## Variants

- [default](./default.md): four-node morphing Markov chain.
- [macro-economy](./macro-economy.md): four-institution signed relational
  instrument.
- [cycle](./cycle/README.md): network macroeconomy with GDP-derived media,
  employment, news, and graph observations.
  - [model research](./cycle/research.md)
  - [source ledger](./cycle/source-ledger.csv)
- [population](./population.md): age-structured population stock/flow system.
- [competitive-firms](./competitive-firms.md): firm-level controls and
  customer-movement network.

Shared route selection belongs in `components/network-system/experiments.ts`.
Model, presenter, transport, controller, and screen behavior remain inside the
matching experiment folder.
