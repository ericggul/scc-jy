<!-- BEGIN:repo-agent-rules -->
# Top priority repo rule

Never run `pnpm build` in this repository.

Never run `pnpm dev` or `pnpm dev:http` in this repository.

Never start any dev server yourself. If runtime verification requires a server,
ask the user exactly: `서버 켜주세요 전하`.

Never run browser or runtime interaction verification unless the user explicitly
asks for browser testing.

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
- `AGENTS.md` is repository-wide only. Do not add experiment-specific,
  feature-specific, or one-off implementation notes to `AGENTS.md`; put those
  in the relevant `docs/[experiment].md` or another scoped file under `docs/`.
- When the user says to update "memory", "memory.md", or "remember" for this
  repository, update `AGENTS.md` and/or files under `docs/` as appropriate.
  Do not write to Codex-global memory files unless the user explicitly names
  that external location.

## React

- Never use generated display text, pseudo-random sentence text, or mutable
  content strings as React list keys.
- For generated records, create stable IDs in the data/model layer and key by
  those IDs. Duplicate display text must not produce React key collisions.

## Verification

- Do not run `pnpm build`.
- Do not run `pnpm dev` or `pnpm dev:http`.
- `pnpm lint` and `pnpm exec tsc --noEmit` are acceptable verification commands.
- Do not run browser checks, Playwright checks, curl runtime probes, or other
  runtime interaction verification unless the user explicitly asks for it.
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
- Do not create literal numbered route folders such as `app/[group]/1/page.tsx`
  for single-device experiment variants. Numbered variants must go through
  `app/[group]/[experiment]/page.tsx`.
- Multi-device experiments use:
  - `app/[group]/page.tsx` as a minimal role/variant index.
  - `app/[group]/mobile/[experiment]/page.tsx` as dynamic mobile routing.
  - `app/[group]/screen/[experiment]/page.tsx` as dynamic screen routing.
  - `components/[group]/experiments.ts` as the shared variant registry.
  - `components/[group]/[experiment]/mobile.tsx` and `components/[group]/[experiment]/screen.tsx` for implementation.
  - dedicated socket modules under `socket/experiments/[group].mjs`.
- Do not add decorative labels, footers, captions, archive text, mode badges, or explanatory chrome unless the user explicitly asks.
- If a page is specified as non-scrollable, visible content must actually fit inside the viewport.
- Fixed-format experiments such as A4 pages, boards, grids, and instrument
  panels must scale internal typography, spacing, and content constraints from
  the same responsive container as the outer frame. Never make only the boundary
  responsive while leaving the inside at fixed pixel sizes.
- Responsive scaling must preserve the intended visual scale of the artifact.
  Do not satisfy responsiveness by making text or controls technically scale
  while the default rendered size is too small, too dense, or unusable for the
  format being represented.

## HTTPS and Sockets

- Local browser/runtime verification must be HTTPS-only.
- Do not use HTTP dev servers for this app.
- Socket behavior must be modular per experiment. Each socket experiment gets its own event prefix, room, and state.
- Events for one experiment must not be visible to another experiment.
