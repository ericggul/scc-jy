# AWS real-time relay deployment

> **현재 배포 결정에는 이 문서의 Lightsail 권고를 적용하지 않는다.** SCC는
> 기존 Banpo-Xism EC2에 공동 배치한다. 실행 우선순위와 분리 경로는
> [반포자이즘 EC2와 SCC socket 공동 운영 결정](./banpo-ec2-scc-cohosting.md)을
> 따른다. 이 문서는 독립 Lightsail 배포가 다시 승인될 때만 사용한다.

This is the production deployment guide for the Socket.IO relay services. The
two Vercel applications remain independent:

| Artwork | Vercel application | Dedicated production relay | Relay process scope |
| --- | --- | --- | --- |
| C-VAL | `https://c-val.vercel.app` | `https://cval-socket.YOUR_DOMAIN` | `c-val` |
| ddong-meong | `https://ddong-meong.vercel.app` | `https://ddong-socket.YOUR_DOMAIN` | `ddong-meong` |

The relay is deliberately not a Vercel Function. Socket.IO rooms, live
in-memory state, persistent WebSocket connections, and C-VAL's 50 ms market
clock require a durable process. Each relay gets a different DNS name,
systemd unit, allowed browser origin, environment file, and restart boundary.
They may run on the same small host for a short exhibition. A ddong-meong
deployment does not import C-VAL's runtime, tick loops, or external publishers.

## Behavior preserved by this migration

### C-VAL

1. A phone joins `experiment:c-val:2` as `mobile` and emits a normalized V/A/L
   control at most once per 16 ms (62.5 Hz).
2. The server validates the mobile role, aggregates live phones equally, and
   expires a control after 450 ms. It remains the authority for market state.
3. Every 50 ms the server advances the market and emits one snapshot to the
   room. Each screen derives its own rendering from that abstract snapshot.
4. Hence the irreducible response interval is one 50 ms server tick plus Wi-Fi,
   Internet RTT, and screen rendering. Hosting in Seoul minimizes the network
   term for a Korean installation; changing the 50 ms interval changes the
   artwork's model and is outside deployment work.

### ddong-meong

1. A phone joins `experiment:ddong-meong` and sends a session start, sparse
   phase/engagement/interaction updates, completion, and best-effort
   visibility/leave beacon.
2. The relay owns active sessions and the process-local daily archive, then
   broadcasts snapshots to `/screen` on each state transition.
3. Its requirement is reliable connection lifetime and correct restart
   handling—not C-VAL-class high-frequency latency.

Neither app needs a client-code change: both already use
`NEXT_PUBLIC_SOCKET_URL` when set. That public environment variable must point
to the *matching* relay only; it is compiled into browser JavaScript at Vercel
build time.

## Recommended production architecture

For a one-week exhibition, use **one** AWS Lightsail 2 GB Linux instance with
public IPv4 in **Asia Pacific (Seoul), `ap-northeast-2`**. It runs two Node
processes: C-VAL on loopback port 4000 and ddong-meong on 4001. They share the
machine but not a Socket.IO server, room, state map, environment file, or
restart. ddong-meong is sparse enough that it does not materially contend with
C-VAL's 20 Hz market loop at this scale.

Lightsail is the preferred first deployment over raw EC2 because it supplies a
predictable transfer bundle. C-VAL broadcasts full state at 20 Hz and can make
outbound bandwidth—not CPU—the surprise cost. A second host is an optional
upgrade only after a rehearsal demonstrates sustained host pressure or if an
independent host failure boundary is worth paying for.

Raw EC2 is appropriate only if monitoring shows C-VAL needs a larger,
non-burstable CPU or if the service later needs VPC/private-network controls.
Do not use Lambda, Vercel Functions, or a scale-to-zero container: they lose
long-lived connections or in-memory authority.

```text
phone + screen ─────────── wss://cval-socket.YOUR_DOMAIN ── Nginx/TLS ── C-VAL relay
                                                                  (127.0.0.1:4000)

phone + exhibition screen ─ wss://ddong-socket.YOUR_DOMAIN ─ Nginx/TLS ── ddong relay
                                                                  (127.0.0.1:4001)
                                                     └── same Seoul Lightsail host
```

The web apps remain served directly by their own Vercel projects. Do not place
the Vercel app behind the relay. Keep two socket hostnames even when they share
one IP: that preserves each app's explicit origin and operational boundary.

## Cost estimate

AWS currently lists a public-IPv4 Lightsail 2 GB Linux bundle at **$12/month**
with 3 TB transfer. Instances accrue hourly usage up to their monthly bundle
price. One shared host costs approximately:

| Usage assumption | One 2 GB Lightsail host for both apps |
| --- | ---: |
| One 6-hour interaction session | **~$0.10** |
| One full week (168 hours) | **~$2.76** |
| Always running, monthly ceiling | **$12** |

These estimates exclude domain registration, optional Route 53 hosted-zone
charges, and any deliberately enabled C-VAL Discord/Slack/Telegram service.
They include neither a load balancer nor database because neither is required
for one durable instance per artwork.

For C-VAL, the calibration caps one snapshot at 32 KB and emits 20 per second.
At that worst-case cap, one connected recipient receives about **12.9 GiB in
six hours**; one phone plus two screens receives about **38.6 GiB**. Actual
snapshots can be smaller, but budget from the cap. The 3 TB C-VAL Lightsail
allowance is therefore about 232 six-hour recipient-sessions at that bound.
ddong-meong's transition-based traffic is negligible in comparison. Measure
the actual outbound bytes during a dress rehearsal before adding capacity.

## Exact setup

### 1. DNS and Vercel

1. Allocate one static IP for the Seoul instance.
2. Create two public `A` records pointing to that same IP:
   `cval-socket.YOUR_DOMAIN` and `ddong-socket.YOUR_DOMAIN`.
3. In the **C-VAL Vercel project only**, create this Production environment
   variable and redeploy the project:

   ```dotenv
   NEXT_PUBLIC_SOCKET_URL=https://cval-socket.YOUR_DOMAIN
   ```

4. In the **ddong-meong Vercel project only**, create this Production
   environment variable and redeploy that project:

   ```dotenv
   NEXT_PUBLIC_SOCKET_URL=https://ddong-socket.YOUR_DOMAIN
   ```

Use exact origins, no trailing slash. A value set without a matching redeploy
does nothing to the already-built browser bundle. Keep Preview deployments off
the production relay unless explicitly required; if allowed, add their complete
origin to that relay's comma-separated allow-list.

### 2. Create each host

Use Ubuntu 24.04 LTS. In its Lightsail firewall (or EC2 security group), allow:

- TCP 22 only from the administrator's fixed IP;
- TCP 80 publicly for ACME and HTTP→HTTPS redirection;
- TCP 443 publicly;
- no public access to TCP 4000 or 4001.

Run once on the shared host, replacing `REPOSITORY_URL`:

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx git curl
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo corepack enable
sudo useradd --system --create-home --shell /usr/sbin/nologin sccsocket
sudo mkdir -p /opt/scc /etc/scc-socket
sudo chown sccsocket:sccsocket /opt/scc
sudo -u sccsocket git clone REPOSITORY_URL /opt/scc
cd /opt/scc
sudo -u sccsocket pnpm install --frozen-lockfile
sudo install -m 0644 deploy/aws/scc-socket.service /etc/systemd/system/scc-socket@.service
```

### 3. Relay environments

Create `/etc/scc-socket/c-val.env`:

```dotenv
SCC_SOCKET_SCOPE=c-val
SOCKET_HOST=127.0.0.1
SOCKET_PORT=4000
SOCKET_ALLOWED_ORIGINS=https://c-val.vercel.app
NODE_ENV=production
```

Create `/etc/scc-socket/ddong-meong.env` on the same host:

```dotenv
SCC_SOCKET_SCOPE=ddong-meong
SOCKET_HOST=127.0.0.1
SOCKET_PORT=4001
SOCKET_ALLOWED_ORIGINS=https://ddong-meong.vercel.app
NODE_ENV=production
```

If either app uses a custom Vercel domain, replace the matching value with that
exact HTTPS origin. The production entry point rejects a missing or wildcard
allow-list. It validates the `Origin` header during both polling and native
WebSocket handshakes, not merely with response CORS headers.

Only C-VAL's host may receive the optional C-VAL external-publisher secrets;
keep them in this non-public environment file. Do not put server secrets in
`NEXT_PUBLIC_*` variables.

### 4. TLS reverse proxy and service

Copy `deploy/aws/nginx-socket.conf` twice to `/etc/nginx/sites-available/`.
Set the first copy to C-VAL's hostname and port 4000, and the second to
ddong-meong's hostname and port 4001; symlink both into
`/etc/nginx/sites-enabled/`. Obtain certificates and start both units:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d cval-socket.YOUR_DOMAIN -d ddong-socket.YOUR_DOMAIN
sudo systemctl daemon-reload
sudo systemctl enable --now scc-socket@c-val
sudo systemctl enable --now scc-socket@ddong-meong
```

Nginx is the only public service. It terminates TLS, forwards WebSocket upgrade
headers, disables proxy buffering, and has a one-hour proxy read timeout. The
Node process is plain HTTP bound to loopback: `/cert` is deliberately disabled
in production because the public certificate is provided by Nginx/Let's Encrypt.

### 5. Release, verification, and rollback

Deploy the same Git commit that Vercel built:

```bash
cd /opt/scc
sudo -u sccsocket git fetch --all --tags
sudo -u sccsocket git checkout COMMIT_SHA
sudo -u sccsocket pnpm install --frozen-lockfile
sudo systemctl restart scc-socket@c-val
curl -fsS https://cval-socket.YOUR_DOMAIN/socket
sudo journalctl -u scc-socket@c-val -n 100 --no-pager
```

The two services have separate unit names and domains. A rollback is the last
known-good commit plus a restart of that one unit. A restart intentionally
clears only that process's memory: C-VAL begins a new market runtime;
ddong-meong loses active sessions and its server-local daily archive. Release
outside a live installation. Add Redis/database persistence later only if
cross-restart continuity becomes an explicit requirement.

## Performance acceptance and operations

Use the actual exhibition Wi-Fi, not a laptop-only test. With the planned
phone/screen count, record at least 10 minutes of continuous C-VAL input.
Accept only if P95 phone-send-to-screen-receipt latency is under 150 ms, no
continuous input is marked stale, and the host does not show sustained CPU
saturation. A larger EC2 host is a capacity response; changing tick frequency
requires a separate C-VAL experiment decision.

For ddong-meong, verify phone start, phase changes, visibility beacon,
completion, reconnect, and exhibition-screen snapshot. Verify once after a
controlled relay restart so the curatorial team understands the intended
in-memory reset behavior.

Do not add an AWS load balancer, multiple relay replicas, or a Redis adapter
yet. Socket.IO multi-node coordination would add cost, a cross-node hop, and a
new state-consistency problem without improving this one-week topology.
