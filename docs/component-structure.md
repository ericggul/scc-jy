# Component family structure

This repository organises experiment code by the responsibility it owns, not by
whether it happens to be TypeScript, React, data, or styling. It keeps a
feature's domain logic, transport, presentation mapping, and device interface
legible without changing its public route.

## Standard shape

```
components/[group]/[experiment]/
  model/       abstract domain state, types, deterministic state helpers
  transport/   browser socket or device-input boundary
  controller/  interaction UI and its graph/layout helpers
  screen/      screen route composition
  mobile/      mobile route composition, when applicable
  [feature]/   a named capability such as news/, media/, or timeline/
```

- Each role folder has an `index.ts` or `index.tsx` public entry point.
- Internal files use names that state their responsibility: `presenter`,
  `headlines`, `config`, `grid`, `order`, or `graph`.
- Pure tests sit beside the pure module they verify.
- The route layer only selects a role and passes validated parameters. It does
  not own domain calculations or media configuration.
- Socket code owns only abstract state. Screen-specific presentation belongs in
  a presenter within the component family.

## Applying the convention

Do not rewrite unrelated experiments solely to make the tree uniform. When an
experiment is created or materially edited, put new work in this shape and
migrate the touched flat files with it. Preserve every existing route, UI, and
socket contract while moving code.

## Cycle example

```
components/network-system/cycle/
  controller/  directed graph and controller interaction
  media/       video segment config, grid renderer, grid presenter
  model/       Cycle snapshot and node/edge domain definitions
  news/        headline library, economic presenter, feed screen
  screen/      left/right/whole/news screen composition
  transport/   Cycle socket hook
```
