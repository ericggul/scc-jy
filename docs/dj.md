# DJ Experiment

Routes:

- `/dj`
- `/dj/controller/1`
- `/dj/controller/2`
- `/dj/screen/1/1`
- `/dj/screen/1/2`
- `/dj/screen/1/3`
- `/dj/screen/1/4`
- `/dj/screen/1/whole`
- `/dj/screen/2/1`
- `/dj/screen/2/2`
- `/dj/screen/2/whole`

Files:

- `app/dj/page.tsx`
- `app/dj/controller/[experiment]/page.tsx`
- `app/dj/screen/[experiment]/[screen]/page.tsx`
- `components/dj/experiments.ts`
- `components/dj/1/graph.ts`
- `components/dj/1/controller.tsx`
- `components/dj/1/screen.tsx`
- `components/dj/1/use-dj-socket.ts`
- `components/dj/2/controller.tsx`
- `components/dj/2/screen.tsx`
- `socket/experiments/dj.mjs`

Intent:

`dj/1` is a K4 graph-based multi-device Socket.IO experiment. The controller sends node or edge gestures. A node targets one screen. An edge targets the paired endpoint screens.

`/dj/screen/1/whole` is only a performative wrapper for experiment logistics. It renders the same modular screen panes in a 2x2 layout with one shared socket bridge, not iframes and not separate per-pane socket clients.

`dj/2` is a two-compartment reaction-diffusion model with diffusive coupling. The controller has two room nodes and one connector zone. Touching or hovering a room node injects two-material state into the corresponding room at the matching local coordinate. Touching or hovering the connector adjusts coupling between the rooms. The screens do not autonomously seed or advance the model without controller input; each input advances a fixed simulation step budget so the two screens stay synchronized. `/dj/screen/2/whole` renders both rooms side by side in a compact responsive stage.

Socket contract:

- Rooms: `experiment:dj:1`, `experiment:dj:2`
- Events:
  - `dj:join`
  - `dj:hello`
  - `dj:presence`
  - `dj:signal:in`
  - `dj:signal:out`
- `dj/1` controller payloads describe graph intent with `source`, `nodeId` or `edgeId`, and pointer coordinates.
- `dj/2` controller payloads use `source: "parameter"` and carry reaction-diffusion parameters plus a concrete `interaction` state operation.
- The server resolves `targetScreenIds`; screens filter client-side.
- Socket state is variant-aware; experiment 1 and experiment 2 must not receive each other's signals.

Rule:

`dj` state and events must not be shared with `finger-skating` or future socket experiments.
