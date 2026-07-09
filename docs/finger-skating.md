# Finger Skating Experiment

Routes:

- `/finger-skating`
- `/finger-skating/mobile/1`
- `/finger-skating/screen/1`

Files:

- `app/finger-skating/page.tsx`
- `app/finger-skating/mobile/[experiment]/page.tsx`
- `app/finger-skating/screen/[experiment]/page.tsx`
- `components/finger-skating/experiments.ts`
- `components/finger-skating/1/mobile.tsx`
- `components/finger-skating/1/screen.tsx`
- `hooks/use-experiment-socket.ts`
- `socket/experiments/finger-skating.mjs`

Intent:

`finger-skating` is a minimal multi-device Socket.IO experiment with isolated mobile and screen routes.

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
