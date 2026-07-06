# Harness Overview

SCC is a Next.js creative experiment harness. It supports single-device studies and multi-device web artwork experiments.

The documentation split is:

- `AGENTS.md`: active instructions for coding agents.
- `llm.txt`: index of LLM/harness docs and external references.
- `docs/harness/*`: repo-wide engineering patterns.
- `docs/[experiment].md`: per-experiment notes.

Keep operational instructions short and enforceable. When an agent repeats a mistake, update `AGENTS.md` or the relevant harness doc with the concrete rule.

Verification defaults:

- Use `pnpm lint`.
- Use `pnpm exec tsc --noEmit`.
- Do not run `pnpm build` unless explicitly requested.
