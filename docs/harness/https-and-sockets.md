# HTTPS and Sockets

The default local development command is HTTPS-first:

```bash
pnpm dev
```

It starts:

- Next dev over HTTPS on port 3000.
- Socket.IO over HTTPS on port 3001.
- Root CA download helper on port 4080.

Certificate scripts:

- `scripts/generate-certs.sh`
- `scripts/dev-https.mjs`
- `scripts/cert-server.mjs`

Generated certificates live under `certificates/` and are ignored by git.

Socket rules:

- Socket modules live under `socket/experiments/`.
- Every experiment must have its own event prefix, room, and state.
- Events for one experiment must not leak to another experiment.
- The top-level `socket-server.mjs` loads experiment modules; it should not own artwork-specific state.
