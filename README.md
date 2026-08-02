# SCC

SCC is a Next.js creative experiment harness.

## Runtime

Local development uses Node.js `26.5.1` with npm `11.17.0`, pinned in `.nvmrc`
and `.node-version`. Package operations use pnpm. Vercel builds use Node
`24.x` because Vercel does not yet support Node 26. The package engine range is
`24.x || 26.x`: local Node 26 satisfies it without warnings, while Vercel
selects its currently supported Node 24 runtime.

## Getting started

Install dependencies with the pinned Node version active:

```bash
pnpm install
```

The user-owned HTTPS development workflow is:

```bash
pnpm dev
```

It exposes the app at `https://<local-hostname>:3000`, the socket relay at
`https://<local-hostname>:4000`, and the local root certificate at
`https://<local-hostname>:4000/cert`.

Agents must not start the development server. See [AGENTS.md](./AGENTS.md) and
the [HTTPS/socket harness notes](./docs/harness/https-and-sockets.md) for the
operational rules.

## Documentation

- [Documentation index](./docs/README.md)
- [Harness overview](./docs/harness/overview.md)
- [Experiment structure](./docs/harness/experiments.md)
