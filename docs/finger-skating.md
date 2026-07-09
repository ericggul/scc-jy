# Finger Skating Experiment

Routes:

- `/finger-skating`
- `/finger-skating/mobile/1`
- `/finger-skating/mobile/2`
- `/finger-skating/screen/1`
- `/finger-skating/screen/2`

Files:

- `app/finger-skating/page.tsx`
- `app/finger-skating/mobile/[experiment]/page.tsx`
- `app/finger-skating/screen/[experiment]/page.tsx`
- `components/finger-skating/experiments.ts`
- `components/finger-skating/1/mobile.tsx`
- `components/finger-skating/1/screen.tsx`
- `components/finger-skating/2/mobile.tsx`
- `components/finger-skating/2/screen.tsx`
- `hooks/use-experiment-socket.ts`
- `socket/experiments/finger-skating.mjs`

Intent:

`finger-skating` is a multi-device Socket.IO experiment with isolated mobile and screen routes.

`/finger-skating/mobile/2` is a non-scrollable finger-skating grid. The viewport width is divided by the `gridColumnCount` value in `components/finger-skating/2/mobile.tsx`; rows are generated from the viewport height. The mobile sends the same x/y signal shape as experiment 1, with fixed hue and intensity values.

Multi-touch behavior for experiment 2 is stream-aware while preserving the original pulse visual. Each finger has a stable `streamId` from pointer down to pointer up/cancel. The screen keeps a separate pulse trail per `streamId`, so a single finger still looks like experiment 1's pulse accumulation/fade, while two or more fingers get independent trails instead of competing for one global pulse list.

Screen rendering for experiment 2 is frame-batched: incoming socket signals are collected and applied once per animation frame, with one latest pulse per `streamId` per frame. Expired pulses are cleaned on an interval rather than with one timer per pulse.

Routing rule:

Add future variants under `components/finger-skating/[number]/`, register the slug in `components/finger-skating/experiments.ts`, and wire the mobile/screen component maps in the dynamic route files.

Socket contract:

- Local transport: same hostname as the app, Socket.IO HTTPS port `4000`, path `/socket.io`.
- Room: `experiment:finger-skating`
- Events:
  - `finger-skating:join`
  - `finger-skating:hello`
  - `finger-skating:presence`
  - `finger-skating:signal:in`
  - `finger-skating:signal:out`

Rule:

`finger-skating` state and events must not be shared with future socket experiments.
