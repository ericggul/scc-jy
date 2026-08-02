# Next.js Harness Notes

Local development uses Node.js 26.5.1 with npm 11.17.0. Vercel builds use Node
24.x because Node 26 is not yet supported there. The application uses Next.js
16.2.10, React 19, App Router, Tailwind CSS 4, and styled-components 6. Package
operations use pnpm.

Before changing Next-specific behavior, read the relevant local docs in `node_modules/next/dist/docs/`. The repo intentionally keeps this rule in `AGENTS.md` because this Next version may differ from model memory.

Current setup:

- Local Node runtime: `26.5.1`, pinned by `.nvmrc` and `.node-version`
- Accepted engine range: `24.x || 26.x`, declared by
  `package.json#engines.node`
- Current Vercel Node runtime: `24.x`, selected because Node 26 is unsupported
- Node type compatibility floor: major 24 through `@types/node`
- styled-components SSR registry: `lib/styled-components-registry.tsx`
- compiler flag: `next.config.ts`
- app shell: `app/layout.tsx`

Route files should stay minimal. Numbered variants import from the matching
`components/[family]/[group]/...` assignment and should not hold substantial
UI or data code.
