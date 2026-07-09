# cv

`cv` is a single-device experiment for infinitely variable pseudo CV generation.

The first variant maps pointer X to industry/job family and pointer Y to years
of experience. The generator keeps future parameter dimensions explicit in the
types so country, qualification system, format preference, language, and evidence
density can become first-class controls later.

## Variants

- `cv/1`: twenty grounded A4 CV/resume styles with rich pseudo-career data.
- `cv/2`: a broader style-space version with 120 style profiles generated from
  twelve document archetypes and ten palette systems. It includes white,
  warm-paper, clinical, legal, editorial, charcoal, and black-background CVs.

## Design rules

- CVs must look like real working documents, not portfolio cards, landing pages,
  or decorative dashboards.
- Keep a very minimal black outline around the A4 CV page so the page boundary
  is readable.
- Default ATS/professional styles to single-column, reverse-chronological
  documents. Structured formats may use tabular, dossier, or letterhead
  conventions when that matches a real CV family.
- Do not use portrait/photo blocks, badge clusters, decorative sidebars, ugly
  colored page stages, heavy shadows, or artificial card backgrounds.
- Support multiple document archetypes through section order and page count:
  ATS resume, executive resume, academic CV, Europass-style structured CV,
  government dossier, legal memo, clinical file, product spec, architecture
  index, editorial resume, and portfolio-leaning CVs.
- A4 pages must remain portrait sheets fitted by viewport height on wide desktop
  screens. Multi-page formats should render as stacked A4 pages, not as one
  compressed pseudo-page.
- Generated visible text may repeat. Every generated record must have a stable
  model ID and React list keys must use those IDs.

## Research grounding

- Harvard MCS resume guidance: concise, fact-based, active language, quantified
  results, reverse chronological order, easy scanning, no photo, no age/gender,
  no references.
- Europass grounding: structured CVs organize profile data around work
  experience, education/training, skills, language, and qualifications.
- Academic CV grounding: use appointment, education, publication, research,
  teaching/service, and grant/project sections rather than compressing an
  academic career into a one-page resume.
- 2026 redesign pass checked more than 100 public CV/resume references through
  template galleries and official guides: Overleaf CV/resume templates across
  multiple pages, VisualCV 30+ templates, Resume.io's named template gallery,
  Novoresume template families, Zety style categories, Enhancv template
  families, Microsoft role-specific Word resume templates, Harvard MCS guidance,
  and Europass official structure. The implementation should synthesize style
  families from those references, not copy any single template.

Runtime verification follows the repo rules: do not start a dev server, do not
run browser checks unless explicitly requested, and use only `pnpm lint` plus
`pnpm exec tsc --noEmit` for local static verification.
