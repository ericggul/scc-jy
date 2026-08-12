# Experiment and component structure

Each app's `app/` and `components/` trees and `docs/experiments/` use the same
family assignment. Public URLs do not include route-group names.

The SCC archive owns its established families under `apps/scc`. C-VAL and
ddong-meong own complete route, component, public-asset, and socket trees under
`apps/c-val` and `apps/ddong-meong`; they are not SCC route groups.

## Runtime families

Standalone experiment groups use:

```txt
apps/scc/app/(standalone)/[group]/page.tsx
apps/scc/app/(standalone)/[group]/[experiment]/page.tsx
apps/scc/components/standalone/[group]/experiments.ts
apps/scc/components/standalone/[group]/[experiment]/index.tsx
docs/experiments/standalone/[group]/README.md
```

Smaller socket-backed SCC experiments use matching
`apps/scc/app/(realtime)` and `apps/scc/components/realtime` families.
Dashboard-style workstations use matching `apps/scc/app/(dashboard)` and
`apps/scc/components/dashboard` families. Complex SCC systems such as `dj`,
`finger-skating`, `network-system`, and `sns` remain directly under both SCC
trees.

Multi-device experiments use this shape within their assigned family:

```txt
apps/<owner>/app/[group]/page.tsx
apps/<owner>/app/[group]/[experiment]/mobile/page.tsx
apps/<owner>/app/[group]/[experiment]/screen/page.tsx
apps/<owner>/components/[group]/experiments.ts
apps/<owner>/components/[group]/[experiment]/mobile.tsx
apps/<owner>/components/[group]/[experiment]/screen.tsx
apps/<owner>/socket/experiments/[experiment]/index.mjs
```

Controller/multi-screen systems replace the mobile role with
`controller/page.tsx` and use `screen/[screen]/page.tsx`.

## Component ownership

Experiment code is organized by the responsibility it owns, not by whether it
is TypeScript, React, data, or styling:

```txt
apps/<owner>/components/[family]/[group]/[experiment]/
  model/       abstract domain state, types, deterministic state helpers
  transport/   browser socket or device-input boundary
  controller/  interaction UI and graph/layout helpers
  screen/      screen route composition
  mobile/      mobile route composition, when applicable
  [feature]/   named capabilities such as news/, media/, or timeline/
```

- Each role folder exposes an `index.ts` or `index.tsx` entry point.
- Internal names state their responsibility: `presenter`, `headlines`,
  `config`, `grid`, `order`, or `graph`.
- Pure tests sit beside the pure module they verify.
- Route files select a registered role and validate parameters; they do not
  own domain calculations or media configuration.
- Socket code owns abstract state only. Screen-specific mappings belong in a
  presenter inside the component family.
- Do not rewrite unrelated experiments solely to make the tree uniform. Apply
  this structure when creating or materially editing a family.

`apps/scc/components/network-system/cycle/` is the current layered example, with
`controller/`, `media/`, `model/`, `news/`, `screen/`, and `transport/`.

## Documentation ownership

- Small variants may share their group `README.md`.
- A variant with a distinct visual contract, research ledger, or postmortem
  gets its own file or subfolder under the matching experiment family.
- `docs/README.md` indexes every registry family.
- Do not put experiment notes in `AGENTS.md`.

Rules:

- Implementation and data belong under the owning app's `components/`.
- The `app`, `components`, and documentation family assignments must match.
- Route groups organize the filesystem only and must not change public URLs.
- Each owning app's `app/` should mostly route/import.
- Group index routes link to registered variants and stay minimal.
- Non-scrollable pages must fit all required visible content inside the viewport.
- Avoid decorative AI-looking labels, badges, footers, subtitles, or explanatory UI not requested by the user.
