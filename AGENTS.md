<!-- BEGIN:repo-agent-rules -->
# Top priority repo rule

Never run `pnpm build` in this repository.

Never run `pnpm dev` or `pnpm dev:http` in this repository.

Never start any dev server yourself. If runtime verification requires a server,
ask the user exactly: `서버 켜주세요 전하`.

All local runtime verification must use HTTPS. Do not start an HTTP dev server.
<!-- END:repo-agent-rules -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SCC Agent Rules

## Source of truth

- `AGENTS.md` is the active operational rule file for coding agents.
- `llm.txt` is an index for LLM/harness documentation, not a dumping ground.
- Durable explanations live under `docs/`; per-experiment notes live at `docs/[experiment].md`.

## Verification

- Do not run `pnpm build`.
- Do not run `pnpm dev` or `pnpm dev:http`.
- `pnpm lint` and `pnpm exec tsc --noEmit` are acceptable verification commands.
- Do not start dev servers under any circumstance. If a server is needed, ask
  the user exactly: `서버 켜주세요 전하`.
- Do not kill dev servers unless the user explicitly asks you to shut them down.

## Next.js

- Before changing routing, config, image handling, styling setup, or server behavior, read the relevant local guide in `node_modules/next/dist/docs/`.
- This app uses App Router, Next 16.2.10, React 19, Tailwind CSS 4, and styled-components 6.
- `app/` route files should stay thin. Put experiment implementation, data, and variant registries under `components/[experiment]/...`.

## Experiment Structure

- Single-device experiment groups use:
  - `app/[group]/page.tsx` as a minimal index.
  - `app/[group]/[experiment]/page.tsx` as dynamic routing.
  - `components/[group]/[experiment]/...` for implementation and data.
- Multi-device experiments use:
  - `app/[experiment]/mobile`
  - `app/[experiment]/screen`
  - dedicated socket modules under `socket/experiments/[experiment].mjs`.
- Do not add decorative labels, footers, captions, archive text, mode badges, or explanatory chrome unless the user explicitly asks.
- If a page is specified as non-scrollable, visible content must actually fit inside the viewport.

## HTTPS and Sockets

- Local browser/runtime verification must be HTTPS-only.
- Do not use HTTP dev servers for this app.
- Socket behavior must be modular per experiment. Each socket experiment gets its own event prefix, room, and state.
- Events for one experiment must not be visible to another experiment.
