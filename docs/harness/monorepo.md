# Monorepo apps and deployment

The repository is a pnpm workspace with four independent Next.js roots. A
change to one artwork does not require a second Git repository or a duplicate
dependency checkout.

| Vercel project | Root Directory | Intended domain |
| --- | --- | --- |
| SCC archive | `apps/scc` | the existing SCC domain |
| C-VAL | `apps/c-val` | `c-val.vercel.app` |
| ddong-meong | `apps/ddong-meong` | `ddong-meong.vercel.app` |
| Goldfishes | `apps/goldfishes` | `goldfishes.vercel.app` |

Create or connect four Vercel projects to the same Git repository and set each
Root Directory exactly as above. Keep the repository's pnpm install command and
the app-local Next.js build command selected by Vercel. The exact `vercel.app`
names still depend on availability in the Vercel account.

The SCC project accepts `C_VAL_APP_URL`, `DDONG_MEONG_APP_URL`, and
`GOLDFISHES_APP_URL`, each a
deployed origin without a trailing path. They default in production to the
intended domains above. SCC uses them only to preserve the old `/c-val/...`,
`/ddong-meong/...`, and `/goldfishes/...` entry paths; the path suffix and query
string are carried to the standalone app.

Browser clients continue to use `NEXT_PUBLIC_SOCKET_URL` when explicitly
configured. Otherwise the existing HTTPS hostname plus
`NEXT_PUBLIC_SOCKET_PORT` behavior remains. `SCC_SOCKET_SCOPE` can limit a
separately hosted relay to `scc`, `c-val`, `ddong-meong`, or `goldfishes`; the
local all-app runner uses the complete registry. Goldfishes currently registers
no socket experiment: its empty scope only reserves an isolated future boundary.
Socket deployment remains a stateful service and is not part of an app's Vercel
Root Directory.

For the production AWS topology, separate C-VAL and ddong-meong relay hosts,
environment variables, and socket origins are documented in
[AWS real-time relay deployment](./aws-realtime-deployment.md).

To add a future standalone artwork, create another `apps/<artwork>` workspace,
give it its own Next.js config and public directory, add it to the HTTPS runner,
and connect another Vercel project to that directory. Do not move its routes
back into the SCC archive app.
