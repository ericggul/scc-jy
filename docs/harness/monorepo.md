# Monorepo apps and deployment

The repository is a pnpm workspace with three independent Next.js roots. A
change to one artwork does not require a second Git repository or a duplicate
dependency checkout.

| Vercel project | Root Directory | Intended domain |
| --- | --- | --- |
| SCC archive | `apps/scc` | the existing SCC domain |
| C-VAL | `apps/c-val` | `c-val.vercel.app` |
| ddong-meong | `apps/ddong-meong` | `ddong-meong.vercel.app` |

Create or connect three Vercel projects to the same Git repository and set each
Root Directory exactly as above. Keep the repository's pnpm install command and
the app-local Next.js build command selected by Vercel. The exact `vercel.app`
names still depend on availability in the Vercel account.

The SCC project accepts `C_VAL_APP_URL` and `DDONG_MEONG_APP_URL`, each a
deployed origin without a trailing path. They default in production to the
intended domains above. SCC uses them only to preserve the old `/c-val/...` and
`/ddong-meong/...` entry paths; the path suffix and query string are carried to
the standalone app.

Browser clients continue to use `NEXT_PUBLIC_SOCKET_URL` when explicitly
configured. Otherwise the existing HTTPS hostname plus
`NEXT_PUBLIC_SOCKET_PORT` behavior remains. `SCC_SOCKET_SCOPE` can limit a
separately hosted relay to `scc`, `c-val`, or `ddong-meong`; the local all-app
runner uses the complete registry. Socket deployment remains a stateful service
and is not part of an app's Vercel Root Directory.

To add a future standalone artwork, create another `apps/<artwork>` workspace,
give it its own Next.js config and public directory, add it to the HTTPS runner,
and connect another Vercel project to that directory. Do not move its routes
back into the SCC archive app.
