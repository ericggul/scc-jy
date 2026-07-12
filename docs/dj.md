# DJ Experiment

Routes:

- `/dj`
- `/dj/controller/1`
- `/dj/screen/1/1`
- `/dj/screen/1/2`
- `/dj/screen/1/3`
- `/dj/screen/1/4`
- `/dj/screen/1/whole`

Files:

- `app/dj/page.tsx`
- `app/dj/controller/[experiment]/page.tsx`
- `app/dj/screen/[experiment]/[screen]/page.tsx`
- `components/dj/experiments.ts`
- `components/dj/1/graph.ts`
- `components/dj/1/controller.tsx`
- `components/dj/1/screen.tsx`
- `components/dj/1/use-dj-socket.ts`
- `socket/experiments/dj.mjs`

Intent:

`dj/1` is a K4 graph-based multi-device Socket.IO experiment. The controller sends node or edge gestures. A node targets one screen. An edge targets the paired endpoint screens.

`/dj/screen/1/whole` is only a performative wrapper for experiment logistics. It renders the same modular screen panes in a 2x2 layout with one shared socket bridge, not iframes and not separate per-pane socket clients.

Socket contract:

- Room: `experiment:dj:1`
- Events:
  - `dj:join`
  - `dj:hello`
  - `dj:presence`
  - `dj:signal:in`
  - `dj:signal:out`
- `dj/1` controller payloads describe graph intent with `source`, `nodeId` or `edgeId`, and pointer coordinates.
- The server resolves `targetScreenIds`; screens filter client-side.

Rule:

`dj` state and events must not be shared with `finger-skating` or future socket experiments.
