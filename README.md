# SCC

SCC is a Next.js creative experiment harness.

## Runtime

This repository requires Node.js `26.5.1` with npm `11.17.0`. Package
operations use pnpm. The same Node version is pinned in `.nvmrc`,
`.node-version`, and `package.json`.

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
