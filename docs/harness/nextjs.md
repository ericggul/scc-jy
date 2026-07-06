# Next.js Harness Notes

This repo uses Next.js 16.2.10, React 19, App Router, Tailwind CSS 4, and styled-components 6.

Before changing Next-specific behavior, read the relevant local docs in `node_modules/next/dist/docs/`. The repo intentionally keeps this rule in `AGENTS.md` because this Next version may differ from model memory.

Current setup:

- styled-components SSR registry: `lib/styled-components-registry.tsx`
- compiler flag: `next.config.ts`
- app shell: `app/layout.tsx`

Route files should stay minimal. For numbered experiment variants, route files import from `components/[group]/...` and should not hold substantial UI/data code.
