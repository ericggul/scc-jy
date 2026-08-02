# C-VAL experiments

C-VAL is a top-level, versioned multi-device experiment family.

## Public routes

Each version is a complete compatible system:

- `/c-val/[version]/controller`
- `/c-val/[version]/mobile`
- `/c-val/[version]/screen/[screen]`

The former `/network-system/c-val/*` routes have been removed. C-VAL is owned
only by the top-level family.

## Ownership boundary

A version owns its controller, mobile, screens, browser model contract,
transport, server model, calibration, order book, diagnostics, tests, shake
harness, event prefix, socket room, and runtime:

```text
components/c-val/1/*        socket/experiments/c-val/1/*
components/c-val/2/*        socket/experiments/c-val/2/*
```

C-VAL 1 is the stable baseline. C-VAL 2 was created as a physical copy of that
baseline and is the active iteration target. Neither version imports market
behavior, calibration, transport, or socket state from the other. A change to
one version must not change the other version's results.

`components/c-val/experiments.ts` owns route discovery and screen IDs only.
`socket/experiments/index.mjs` registers both versioned socket experiments.
Their identities are `c-val:1` and `c-val:2`, with rooms
`experiment:c-val:1` and `experiment:c-val:2`.

## Version policy

- Change C-VAL 2 for current algorithm experiments.
- Treat C-VAL 1 as frozen unless a V1-specific repair is explicitly requested.
- Do not place market equations in the family registry or a shared helper.
- Extract genuinely version-independent presentation primitives only after
  both versions demonstrate the same stable need.
- Every version change updates its own tests and version document.

## Versions

- [C-VAL 1](./1.md): stable baseline.
- [C-VAL 2](./2.md): experimental branch, initially identical to V1.
- [Mobile-shake harness](./shake-harness.md): version-selectable verification.
