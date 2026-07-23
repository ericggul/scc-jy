# Harness Overview

SCC is a Next.js creative experiment harness. It supports single-device studies and multi-device web artwork experiments.

The documentation split is:

- `AGENTS.md`: active instructions for coding agents.
- `CLAUDE.md`: delegates to `AGENTS.md`; it is not a second rule set.
- `llm.txt`: compact LLM documentation index.
- `docs/README.md`: complete documentation and experiment map.
- `docs/harness/*`: repo-wide engineering patterns.
- `docs/foundations/*`: shared visual and artwork theory.
- `docs/experiments/*`: notes aligned with `app/` and `components/` families.

Keep operational instructions short and enforceable. Put a repeated
repository-wide failure in `AGENTS.md` or a harness document. Put a
variant-specific contract, source ledger, or postmortem in that experiment's
documentation folder.

Verification defaults:

- Use `pnpm lint`.
- Use `pnpm exec tsc --noEmit`.
- Never run `pnpm build`.
- Do not start a development server.
- Do not run browser or runtime interaction checks unless the user explicitly
  requests them.
