# C-VAL reset-route release

`/reset` shows C-VAL relay status and restarts the C-VAL Socket.IO process. A
restart broadcasts `window.location.reload()` to every connected C-VAL client,
then ends the relay process. The local HTTPS harness starts a fresh local socket
process; the EC2 PM2 process starts a fresh production relay.

There are two deployments. The Vercel release supplies `/reset` and the browser
reload listener. The EC2 release supplies the Socket.IO restart event. Release
them together; do not use `/reset` between the two releases.

## Release contents

- **Vercel C-VAL project:** all committed C-VAL route/client changes in this
  release, including `app/reset/`, `components/reset/`, and
  `components/transport/use-socket.ts`.
- **EC2 `scc-io` relay:** the shared C-VAL, ddong-meong, and SCC socket
  handlers are synchronized together.
- **Local only:** `scripts/dev-https.mjs` is not copied to EC2.

No package, Nginx, DNS, TLS, security-group, or Vercel environment-variable
change is required.

## 1. Release the C-VAL frontend to Vercel

From the repository root, stage only this release's files, commit, then push to
the production branch connected to the C-VAL Vercel project:

```bash
git add \
  apps/c-val/app/reset \
  apps/c-val/components/reset \
  apps/c-val/components/transport/use-socket.ts \
  apps/c-val/socket/experiments/index.mjs \
  apps/c-val/socket/experiments/index.test.mjs \
  apps/c-val/docs/README.md \
  apps/c-val/docs/reset-route.md \
  scripts/dev-https.mjs
git commit -m "Add C-VAL relay reset route"
git push
```

Wait until the C-VAL Vercel deployment is marked Ready. Its Root Directory must
remain `apps/c-val`.

## 2. Deploy the shared relay to EC2

Deploy all shared socket handlers with:

```bash
pnpm deploy:scc-relay
```

It restarts only `scc-io` and checks the loopback health endpoint. A restart
resets C-VAL's current in-memory market state once; that is expected. The
actual EC2 process, path, and update boundary are documented in
[the shared relay deployment](../../../docs/harness/scc-relay-deployment.md).

Do not restart `banpo-io`, do not touch port 4000, and do not change Nginx or
AWS networking. Port 4001 remains loopback-only.
