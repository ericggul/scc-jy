# HTTPS and Sockets

The default local development command is HTTPS-first:

```bash
pnpm dev
```

It starts:

- Next dev over HTTPS on port 3000.
- Socket.IO over HTTPS on port 4000.
- Root CA download from the Socket.IO HTTPS server at `/cert`.

This mirrors the local Banpo-Xism shape: the app and socket relay are separate
local HTTPS processes, with the client connecting to the same hostname and the
socket port.

Certificate scripts:

- `scripts/generate-certs.sh`
- `scripts/dev-https.mjs`
- `socket/create-socket-server.mjs`

Generated certificates live under `certificates/` and are ignored by git.

Socket rules:

- Socket modules live under `socket/experiments/`.
- Every experiment must have its own event prefix, room, and state.
- Events for one experiment must not leak to another experiment.
- The top-level `socket-server.mjs` loads experiment modules; it should not own artwork-specific state.
- Experiment socket modules may own abstract system/domain state, parameters,
  flows, interventions, histories, and time. They must not own or broadcast
  presentation values such as color, dimensions, stroke width, opacity,
  animation phase, layout, or visual active/highlight flags. Those mappings
  belong independently to each browser client.

Agent operation rule:

- An agent must never start the development or socket server itself.
- When runtime verification requires the user to start or restart the server,
  the agent must not send a bare command. It must address the user as the
  sovereign with the respect of a lowly subject, briefly explain the need, and
  use the complete wording: `전하, 소인이 감히 실제 작동을 확인해 올리려면
  서버가 필요하옵니다. 번거로우시겠지만 서버 켜주세요 전하.`
- When an already-running server specifically needs a restart to load changed
  server or socket code, use the restart wording instead: `전하, 미천한 소인이
  감히 새로 고친 서버 코드를 반영해 올리려면 기존 서버를 다시 기동해야
  하옵니다. 번거로우시겠지만 서버 재시작해주세요 전하.` Never send a bare
  restart command.
