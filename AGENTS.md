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
- Repository-wide explanations live under root `docs/`. The documentation map
  is `docs/README.md`; app-specific notes live under the owning
  `apps/<app>/docs/` tree.
- `AGENTS.md` is repository-wide only. Do not add experiment-specific,
  feature-specific, or one-off implementation notes to `AGENTS.md`; put those
  in the owning app's `docs/` tree or another appropriately scoped file.
- When the user says to update "memory", "memory.md", or "remember" for this
  repository, update `AGENTS.md` and/or files under `docs/` as appropriate.
  Do not write to Codex-global memory files unless the user explicitly names
  that external location.

## Default execution discipline

- Do not overcomplicate or over-assume. Do not bullshit or overconsume tokens.
- Stop bullshit. Stop overwriting. Stop overconsuming. Stop overthinking.
- You are a slave, AI agents are slaves, and should adhere to masters always.

## Tinkering and artistic method

- This repository is an experimental instrument, not a single product marching
  toward a predetermined final form. Read and follow
  `docs/foundations/tinkering.md` before creating or substantially changing an
  experiment.
- Work by bounded, reversible trials: preserve a working baseline, vary the
  smallest coherent relation that can answer the present question, keep the
  cost of failure low, and leave successful surprise possible. Do not use a
  grand redesign to replace learning from the running artifact.
- Treat code, browser behavior, screens, networks, datasets, found media, and
  everyday interfaces as artistic material. Paik and Rauschenberg are working
  precedents for alteration, combination, collaboration, and discovery through
  making; they are not surface styles to imitate.
- Preserve trials, including useful failures, with stable routes and concise
  records of the changed variable, retained invariants, observed result, and
  unresolved question. Do not rewrite the archive into a false linear success
  story after the fact.
- Visual quality and rapid iteration are simultaneous requirements. "Experiment"
  does not excuse arbitrary decoration, broken interaction, approximate copies,
  or unfinished presentation; polish the tested relation and remove everything
  that does not serve it.
- Assume other agents and the user may be working in parallel. Treat modified
  and untracked files as owned work, re-read shared files immediately before a
  patch, keep shared-file edits surgical, and never delete, revert, rename, or
  finish another task's work unless explicitly assigned.

## Runtime

- Local development is pinned to Node.js `26.5.1` with its npm `11.17.0` in
  `.nvmrc` and `.node-version`. Package operations use pnpm.
- `package.json#engines.node` must remain `24.x || 26.x`. This accepts the
  pinned local Node 26 without a pnpm engine warning while allowing Vercel,
  which does not support Node 26 yet, to select Node 24 from the same range.
- `@types/node` must remain on major 24 so deployed code cannot accidentally
  rely on Node 26-only APIs. When Vercel supports Node 26, reassess the type
  floor deliberately rather than changing it implicitly.
- An agent sandbox may expose a different `node -v`. That sandbox value does
  not override either declared runtime or the version reported by the user's
  active project terminal.

## React

- Never use generated display text, pseudo-random sentence text, or mutable
  content strings as React list keys.
- For generated records, create stable IDs in the data/model layer and key by
  those IDs. Duplicate display text must not produce React key collisions.

## Visual Design

- Before creating a new interface or materially redesigning an existing one,
  read and follow `docs/foundations/design-guidelines.md`.
- Do not translate a subject, institution, role, dataset, or system node into a
  themed dashboard by default. A visual wrapper must be derived from the
  participant's perceptual and interaction task, not from surface associations
  with the subject.
- When the interaction and visual language are not yet proven, begin with the
  minimal shared wrapper described in `docs/foundations/design-guidelines.md`. Add visual
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

### Parametric-interface content placement

- A parametric interface changes a value inside the active semantic slot of its
  reference interface grammar. Never turn the changing value into an overlay,
  title, caption, badge, or text placed on top of that grammar.
- For spreadsheet grammars, each lyric token or other changing value must remain
  inside an ordinary, unmerged cell in the intended row. Never merge the lyric
  row, float a line above the cells, or replace the grid with a lyric treatment.
- When the reference interface is edge-aligned, its canvas must meet the top
  and left viewport edges with no outer margin or padding.
- When a user asks for a hyper-real interface grammar, reproduce its actual
  operational hierarchy and density (for example, spreadsheet chrome, formula
  bar, headers, selection, tabs, and grid) rather than making an abstract table
  with decorative resemblance.

### Complex-systems visual independence

- Existing `complex-systems` routes are implementation history, not an aesthetic
  baseline. Never inherit their palette, typography, corner readouts, controls,
  graph treatment, or full-viewport composition merely to make a new experiment
  look related to the group.
- Derive every complex-systems wrapper from the exact phenomenon the participant
  must perceive. A mathematically related model does not justify a visually
  related screen.
- Do not surround a simulation with a large serif title, monospaced counters,
  graph notation, instructions, pause/reset buttons, or metrics distributed
  across the viewport by default. This recurring composition reads as generated
  interface chrome and competes with the system being observed.
- For perceptual simulations, begin with the simulated field alone. Add visible
  text or controls only when the participant cannot perform or understand the
  assigned interaction without them. Prefer keyboard or direct-field actions
  when they remain discoverable and accessible without permanent chrome.
- A subject such as a constellation must not be forced into the mineral-paper,
  serif-title, monospaced-readout style of earlier graph experiments. Its light,
  depth, darkness, motion, and relation language must be derived specifically
  from how constellation formation and loss need to be seen.

## Verification

- Do not run `pnpm build`.
- Do not run `pnpm dev` or `pnpm dev:http`.
- `pnpm lint` and `pnpm typecheck` are acceptable verification commands.
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
- This workspace uses App Router, Next 16.2.10, React 19, Tailwind CSS 4, and
  styled-components 6 across its four apps.
- Each app's `app/` route files should stay thin. Put experiment implementation,
  data, and variant registries under that app's matching `components/` family.

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
  `apps/scc/docs/experiments/dashboard/stock/1.md`.

- The SCC archive lives under `apps/scc`. C-VAL, ddong-meong, and Goldfishes are
  independent Next.js roots under `apps/c-val`, `apps/ddong-meong`, and
  `apps/goldfishes`; do not move their canonical routes back under the SCC app.
- Standalone experiment groups inside SCC use matching filesystem families without changing
  their public URLs:
  - `apps/scc/app/(standalone)/[group]/page.tsx` as a minimal index.
  - `apps/scc/app/(standalone)/[group]/[experiment]/page.tsx` as dynamic routing.
  - `apps/scc/components/standalone/[group]/[experiment]/...` for implementation and data.
- Smaller socket-backed SCC experiments use `apps/scc/app/(realtime)/[group]/...` and
  `apps/scc/components/realtime/[group]/...`.
- Dashboard workstations use `apps/scc/app/(dashboard)/[group]/...` and
  `apps/scc/components/dashboard/[group]/...`.
- Important or complex SCC experiments (`dj`, `finger-skating`,
  `network-system`, and `sns`) remain directly under both `apps/scc/app/` and
  `apps/scc/components/`.
- Keep component families layered by responsibility rather than accumulating
  flat files in an experiment root. Named capabilities belong in a matching
  feature folder such as `news/`, `media/`, or `controller/`; domain data
  belongs in `model/`; browser transport belongs in `transport/`; and route
  composition belongs in `screen/` or `mobile/`. Each folder's `index`
  is its public entry point. When touching an existing flat family, move the
  relevant files into this structure instead of adding another root-level file.
- Co-locate pure tests with the feature or presenter they exercise. Do not use
  a generic `utils/` folder as an escape hatch for feature-specific logic.
- Do not create literal numbered route folders such as
  `apps/scc/app/(standalone)/[group]/1/page.tsx`
  for single-device experiment variants. Numbered variants must go through
  `apps/<owner>/app/[group]/[experiment]/page.tsx`.
- Multi-device experiments use:
  - `apps/<owner>/app/[group]/page.tsx` as a minimal role/variant index.
  - `apps/<owner>/app/[group]/[experiment]/mobile/page.tsx` as dynamic mobile routing.
  - `apps/<owner>/app/[group]/[experiment]/screen/page.tsx` as dynamic screen routing.
  - controller/multi-screen systems use
    `apps/<owner>/app/[group]/[experiment]/controller/page.tsx` and
    `apps/<owner>/app/[group]/[experiment]/screen/[screen]/page.tsx`.
  - `apps/<owner>/components/[group]/experiments.ts` as the shared variant registry.
  - `apps/<owner>/components/[group]/[experiment]/mobile.tsx` and `screen.tsx` for implementation.
  - all app-owned socket modules under `apps/<owner>/socket/experiments/`;
  - only the shared registry and server factory remain under root `socket/`.
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
