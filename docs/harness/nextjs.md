# Next.js Harness Notes

This repo uses Node.js 26.5.1 with npm 11.17.0, Next.js 16.2.10, React 19,
App Router, Tailwind CSS 4, and styled-components 6. Package operations use
pnpm.

Before changing Next-specific behavior, read the relevant local docs in `node_modules/next/dist/docs/`. The repo intentionally keeps this rule in `AGENTS.md` because this Next version may differ from model memory.

Current setup:

- Node runtime: `26.5.1`, pinned by `.nvmrc`, `.node-version`, and
  `package.json#engines.node`
- styled-components SSR registry: `lib/styled-components-registry.tsx`
- compiler flag: `next.config.ts`
- app shell: `app/layout.tsx`

Route files should stay minimal. Numbered variants import from the matching
`components/[family]/[group]/...` assignment and should not hold substantial
UI or data code.
