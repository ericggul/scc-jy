# Experiment Structure

Single-device experiment groups use this shape:

```txt
app/[group]/page.tsx
app/[group]/[experiment]/page.tsx
components/[group]/experiments.ts
components/[group]/[experiment]/index.tsx
components/[group]/[experiment]/data.ts
```

`app/[group]/page.tsx` should be a minimal index linking to numbered variants. Do not add explanatory chrome unless asked.

`app/[group]/[experiment]/page.tsx` should route dynamically and import the selected component.

Multi-device experiments use this shape:

```txt
app/[experiment]/mobile/page.tsx
app/[experiment]/screen/page.tsx
socket/experiments/[experiment].mjs
socket/experiments/[experiment].md
```

Rules:

- Implementation and data belong under `components/`.
- `app/` should mostly route/import.
- Non-scrollable pages must fit all required visible content inside the viewport.
- Avoid decorative AI-looking labels, badges, footers, subtitles, or explanatory UI not requested by the user.
