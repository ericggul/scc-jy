# Harness Overview

SCC is a pnpm monorepo for a creative experiment archive and independently
deployable web artworks. It supports single-device studies and multi-device web
artwork experiments without splitting their Git history.

## Runtime baseline

Local development uses Node.js `26.5.1` with npm `11.17.0`; package operations
use pnpm. `.nvmrc` and `.node-version` own that local pin. Vercel builds use
Node `24.x`; `package.json#engines.node` accepts `24.x || 26.x`, allowing both
the Vercel runtime and pinned local runtime without a pnpm engine warning.
`@types/node` targets major 24. A different Node version exposed inside an
agent sandbox must not be written back into either declaration.

The documentation split is:

- `AGENTS.md`: active instructions for coding agents.
- `CLAUDE.md`: delegates to `AGENTS.md`; it is not a second rule set.
- `llm.txt`: compact LLM documentation index.
- `docs/README.md`: complete documentation and experiment map.
- `docs/harness/*`: repo-wide engineering patterns.
- `docs/harness/local-image-collections.md`: reusable process for collecting,
  sourcing, checkpointing, and locally serving image sets.
- `docs/foundations/*`: shared visual and artwork theory.
- `apps/scc`: the SCC archive and its existing experiment families.
- `apps/c-val`: the standalone C-VAL artwork.
- `apps/ddong-meong`: the standalone ddong-meong artwork.
- `apps/goldfishes`: the standalone Goldfishes archive and artwork family.
- `apps/*/docs/*`: notes aligned with each owning app/component family.

Keep operational instructions short and enforceable. Put a repeated
repository-wide failure in `AGENTS.md` or a harness document. Put a
variant-specific contract, source ledger, or postmortem in that experiment's
documentation folder.

Verification defaults:

- Use `pnpm lint`.
- Use `pnpm typecheck` (or an app-filtered workspace typecheck).
- Never run `pnpm build`.
- Do not start a development server.
- Do not run browser or runtime interaction checks unless the user explicitly
  requests them.
