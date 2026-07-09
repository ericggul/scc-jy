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
