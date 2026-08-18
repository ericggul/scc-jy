# SCC relay deployment

This is the deployment procedure for the SCC Socket.IO relay only. It applies
to C-VAL and ddong-meong, which share the `scc-io` process on port `4001`.

It must never be substituted with the Banpo deployment procedure: do not touch
`banpo-io`, its `4000` port, Banpo's code directory, or Nginx for a normal SCC
relay release.

## What needs deployment

- Changes under `apps/c-val/socket/experiments/` or
  `apps/ddong-meong/socket/experiments/` require an `scc-io` relay update.
- Changes under `socket/`, `socket-server-production.mjs`, or relay
  dependencies also require an `scc-io` relay update.
- Frontend-only changes are deployed by Vercel and do not require a relay
  restart.

## Fixed production contract

| Item | Value |
| --- | --- |
| Remote working directory | `/home/ubuntu/scc-socket` |
| PM2 process | `scc-io` |
| Internal listener | `127.0.0.1:4001` |
| Health endpoint | `http://127.0.0.1:4001/socket` |
| Relay entry point | `socket-server-production.mjs` |

The remote directory is a deployed file copy, not a Git checkout. Do not run
`git pull` there. Copy only the changed relay files into a staging directory,
verify them, then replace the matching SCC files.

## Normal release

1. Confirm the local changes and run the targeted checks. Never use
   `pnpm build` for this repository.

   ```bash
   git diff --check
   pnpm --filter @scc/ddong-meong typecheck
   ```

2. Use the existing SCC relay SSH identity and host. Keep the actual key path
   and host in the invoking shell; do not commit either to this repository.

   ```bash
   export SCC_RELAY_KEY='/absolute/path/to/key.pem'
   export SCC_RELAY_HOST='ubuntu@your-scc-relay-host'
   ```

3. Read the target process before changing it. The output must name
   `scc-io`, use `/home/ubuntu/scc-socket`, and listen on port `4001`.

   ```bash
   ssh -i "$SCC_RELAY_KEY" "$SCC_RELAY_HOST" \
     'pm2 describe scc-io; ss -ltnp | grep ":4001"'
   ```

4. Copy changed relay files to `/home/ubuntu/scc-deploy-staging/`, verify
   SHA-256 checksums, then copy them into `/home/ubuntu/scc-socket/`. Keep the
   source-relative path intact. For example, an update that touches C-VAL and
   ddong-meong experiment handlers copies only those handler modules.

5. Restart only the SCC relay and check its loopback endpoint:

   ```bash
   ssh -i "$SCC_RELAY_KEY" "$SCC_RELAY_HOST" \
     'cd /home/ubuntu/scc-socket && pm2 restart scc-io && curl -fsS http://127.0.0.1:4001/socket'
   ```

   A successful response includes `"ok":true`, `"service":"scc-socket"`,
   and the expected experiment list. A restart resets in-memory realtime
   state, so do it when a short reconnection is acceptable.

6. Remove the staging directory after a successful check:

   ```bash
   ssh -i "$SCC_RELAY_KEY" "$SCC_RELAY_HOST" \
     'rm -rf /home/ubuntu/scc-deploy-staging'
   ```

## Dependency or entry-point change

If `package.json`, `pnpm-lock.yaml`, `socket-server-production.mjs`, or a
shared `socket/` module changes, stage the complete affected relay set. For a
dependency change, run `pnpm install --frozen-lockfile` inside
`/home/ubuntu/scc-socket` before restarting `scc-io`. Do not install packages
for an experiment-handler-only release.

## Boundaries

- Do not restart `banpo-io`.
- Do not change Nginx, DNS, TLS, security groups, or Vercel variables as part
  of this procedure.
- Do not expose port `4001`; it remains loopback-only.
- Do not store private keys, IP addresses, or credentials in this repository.
