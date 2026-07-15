# Experiment Structure

Standalone experiment groups use this shape:

```txt
app/(standalone)/[group]/page.tsx
app/(standalone)/[group]/[experiment]/page.tsx
components/standalone/[group]/experiments.ts
components/standalone/[group]/[experiment]/index.tsx
components/standalone/[group]/[experiment]/data.ts
```

`app/[group]/page.tsx` should be a minimal index linking to numbered variants. Do not add explanatory chrome unless asked.

`app/[group]/[experiment]/page.tsx` should route dynamically and import the selected component.

Smaller realtime experiments use the matching `(realtime)` family. Complex
system experiments remain directly under `app/` and `components/`.

Multi-device experiments use this route shape within their assigned family:

```txt
app/[group]/page.tsx
app/[group]/[experiment]/mobile/page.tsx
app/[group]/[experiment]/screen/page.tsx
components/[group]/experiments.ts
components/[group]/[experiment]/mobile.tsx
components/[group]/[experiment]/screen.tsx
socket/experiments/[group]/index.mjs
```

`app/[group]/page.tsx` should be a minimal index linking to role-specific numbered variants, for example `/finger-skating/1/mobile` and `/finger-skating/1/screen`.

`app/[group]/[experiment]/mobile/page.tsx` and `app/[group]/[experiment]/screen/page.tsx` should route dynamically from the same `components/[group]/experiments.ts` registry.

Rules:

- Implementation and data belong under `components/`.
- The `app` and `components` family assignment must match.
- Route groups organize the filesystem only and must not change public URLs.
- `app/` should mostly route/import.
- Non-scrollable pages must fit all required visible content inside the viewport.
- Avoid decorative AI-looking labels, badges, footers, subtitles, or explanatory UI not requested by the user.
