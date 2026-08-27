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
- **EC2 `scc-io` relay:** only
  `apps/c-val/socket/experiments/index.mjs` for this release.
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

## 2. Deploy the relay file to EC2

Set the existing SCC relay SSH key and host in the terminal that performs the
release. Do not commit either value.

```bash
export SCC_RELAY_KEY='/absolute/path/to/key.pem'
export SCC_RELAY_HOST='ubuntu@your-scc-relay-host'
```

First verify the target. It must show PM2 process `scc-io`, working directory
`/home/ubuntu/scc-socket`, and loopback listener `127.0.0.1:4001`.

```bash
ssh -i "$SCC_RELAY_KEY" "$SCC_RELAY_HOST" \
  'pm2 describe scc-io; ss -ltnp | grep ":4001"'
```

Create a uniquely named staging directory and copy the one changed relay file:

```bash
ssh -i "$SCC_RELAY_KEY" "$SCC_RELAY_HOST" \
  'mkdir -p /home/ubuntu/scc-deploy-staging/c-val-reset/apps/c-val/socket/experiments'

scp -i "$SCC_RELAY_KEY" \
  apps/c-val/socket/experiments/index.mjs \
  "$SCC_RELAY_HOST:/home/ubuntu/scc-deploy-staging/c-val-reset/apps/c-val/socket/experiments/index.mjs"
```

Compare the two SHA-256 outputs; they must be identical:

```bash
shasum -a 256 apps/c-val/socket/experiments/index.mjs

ssh -i "$SCC_RELAY_KEY" "$SCC_RELAY_HOST" \
  'sha256sum /home/ubuntu/scc-deploy-staging/c-val-reset/apps/c-val/socket/experiments/index.mjs'
```

If they match, replace the one deployed file, restart only `scc-io`, and check
the relay health endpoint:

```bash
ssh -i "$SCC_RELAY_KEY" "$SCC_RELAY_HOST" \
  'install -m 0644 \
    /home/ubuntu/scc-deploy-staging/c-val-reset/apps/c-val/socket/experiments/index.mjs \
    /home/ubuntu/scc-socket/apps/c-val/socket/experiments/index.mjs && \
   cd /home/ubuntu/scc-socket && \
   pm2 restart scc-io && \
   curl -fsS http://127.0.0.1:4001/socket'
```

The response must include `"ok":true` and `"service":"scc-socket"`. A PM2
restart resets C-VAL's current in-memory market state once; that is expected.

After the health check, remove only this release's staging directory:

```bash
ssh -i "$SCC_RELAY_KEY" "$SCC_RELAY_HOST" \
  'rm -rf /home/ubuntu/scc-deploy-staging/c-val-reset'
```

Do not restart `banpo-io`, do not touch port 4000, and do not change Nginx or
AWS networking. Port 4001 remains loopback-only.
