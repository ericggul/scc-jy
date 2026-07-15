<!-- BEGIN:repo-agent-rules -->
# Top priority repo rule

Never run `pnpm build` in this repository.

Never run `pnpm dev` or `pnpm dev:http` in this repository.

Never start any dev server yourself. If runtime verification requires a server,
do not drop a bare command on the user. Address the user as the sovereign with
the respect of a lowly subject, briefly explain why the server is needed, and
ask with this complete wording: `전하, 소인이 감히 실제 작동을 확인해
올리려면 서버가 필요하옵니다. 번거로우시겠지만 서버 켜주세요 전하.`

If an already-running server must be restarted to load changed server or socket
code, distinguish restart from first start and use this complete wording:
`전하, 미천한 소인이 감히 새로 고친 서버 코드를 반영해 올리려면 기존
서버를 다시 기동해야 하옵니다. 번거로우시겠지만 서버 재시작해주세요
전하.` Never reduce this to a bare restart command.

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

## Visual Design

- Before creating a new interface or materially redesigning an existing one,
  read and follow `docs/design-guidelines.md`.
- Do not translate a subject, institution, role, dataset, or system node into a
  themed dashboard by default. A visual wrapper must be derived from the
  participant's perceptual and interaction task, not from surface associations
  with the subject.
- When the interaction and visual language are not yet proven, begin with the
  minimal shared wrapper described in `docs/design-guidelines.md`. Add visual
  elements only when each one has a specific informational or interactive job.
- The generic AI concept-dashboard formula is prohibited: faux technical
  chrome, arbitrary dark/neon themes, glow, gradients, giant metrics surrounded
  by tiny labels, ornamental charts, fake live states, revision codes, badges,
  gauges, or process footers must not be used as substitutes for an actual
  interface concept.
- Visual difference between system nodes must not be invented merely because
  their names or institutional roles differ. Preserve a coherent system family
  unless a different wrapper is justified by a genuinely different parameter,
  interaction, observation task, or established everyday-interface grammar.

## Verification

- Do not run `pnpm build`.
- Do not run `pnpm dev` or `pnpm dev:http`.
- `pnpm lint` and `pnpm exec tsc --noEmit` are acceptable verification commands.
- Do not run browser checks, Playwright checks, curl runtime probes, or other
  runtime interaction verification unless the user explicitly asks for it.
- Do not start dev servers under any circumstance. If a server is needed,
  respectfully explain the need as a lowly subject addressing the sovereign;
  never send only `서버 켜주세요 전하`. Use the full wording: `전하, 소인이
  감히 실제 작동을 확인해 올리려면 서버가 필요하옵니다. 번거로우시겠지만
  서버 켜주세요 전하.`
- Do not kill dev servers unless the user explicitly asks you to shut them down.
- When changed server or socket code requires the user's already-running server
  to restart, never send only `서버 재시작해주세요 전하`. Use the full wording:
  `전하, 미천한 소인이 감히 새로 고친 서버 코드를 반영해 올리려면 기존
  서버를 다시 기동해야 하옵니다. 번거로우시겠지만 서버 재시작해주세요
  전하.`

## Next.js

- Before changing routing, config, image handling, styling setup, or server behavior, read the relevant local guide in `node_modules/next/dist/docs/`.
- This app uses App Router, Next 16.2.10, React 19, Tailwind CSS 4, and styled-components 6.
- `app/` route files should stay thin. Put experiment implementation, data, and variant registries under the matching `components/` family.

## Experiment Structure

### Preserve established UI contracts

- A request to change data, math, behavior, device input, transport, or the
  number of records does not authorize a visual redesign. Preserve the
  existing layout, component geometry, typography, spacing, chart treatment,
  interaction language, and domain-specific display language unless the user
  explicitly asks to change them.
- Before editing an existing experiment, separate requested changes from
  invariants. Treat every unmentioned visual and interaction property as an
  invariant, and verify those invariants after implementation.
- Keep model language out of the rendered product UI unless explicitly asked.
  Internal units such as velocity, sensor slope, simulation gain, or debug
  status must be translated into the experiment's established domain language.
- Reuse the existing component or extract its visual primitive when a new data
  model must inhabit an established interface. Do not recreate an approximate
  version from memory and do not introduce explanatory chrome as a substitute.
- For a concrete failure analysis and preservation checklist, read
  `docs/stock-ui-preservation-postmortem.md`.

- Standalone experiment groups use matching filesystem families without changing
  their public URLs:
  - `app/(standalone)/[group]/page.tsx` as a minimal index.
  - `app/(standalone)/[group]/[experiment]/page.tsx` as dynamic routing.
  - `components/standalone/[group]/[experiment]/...` for implementation and data.
- Smaller socket-backed experiments use `app/(realtime)/[group]/...` and
  `components/realtime/[group]/...`.
- Important or complex experiments (`dj`, `finger-skating`, `network-system`,
  `sns`, and `stock`) remain directly under both `app/` and `components/`.
- Do not create literal numbered route folders such as `app/(standalone)/[group]/1/page.tsx`
  for single-device experiment variants. Numbered variants must go through
  `app/[group]/[experiment]/page.tsx`.
- Multi-device experiments use:
  - `app/[group]/page.tsx` as a minimal role/variant index.
  - `app/[group]/mobile/[experiment]/page.tsx` as dynamic mobile routing.
  - `app/[group]/screen/[experiment]/page.tsx` as dynamic screen routing.
  - `components/[group]/experiments.ts` as the shared variant registry.
  - `components/[group]/[experiment]/mobile.tsx` and `components/[group]/[experiment]/screen.tsx` for implementation.
  - dedicated socket modules under `socket/experiments/[group]/index.mjs`.
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
- Socket servers may own only abstract system/domain state, parameters, flows,
  interventions, and time. They must never calculate or broadcast presentation
  state such as color, size, stroke width, opacity, animation phase, layout, or
  visual active/highlight flags. Every browser client derives its own visual
  mapping from the abstract state.
