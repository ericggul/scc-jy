# cv

`cv` is a single-device experiment for infinitely variable pseudo CV generation.

The first variant maps pointer X to industry/job family and pointer Y to years
of experience. The generator keeps future parameter dimensions explicit in the
types so country, qualification system, format preference, language, and evidence
density can become first-class controls later.

## Variants

- `cv/1`: canonical A4 CV/resume generator. Work here first.
- `cv/2`: legacy broad-style candidate. Do not use it as the design baseline.

## Design rules

- CVs must look like real working documents, not portfolio cards, landing pages,
  or decorative dashboards.
- Keep a very minimal black outline around the A4 CV page so the page boundary
  is readable.
- The A4 page box and black outline position must stay invariant across style
  changes. Only browser viewport changes may resize the page.
- Internal typography and spacing must scale with the A4 page box. Do not use
  capped pixel font clamps that make the border resize while the text stays the
  same size.
- Default ATS/professional styles to single-column, reverse-chronological
  documents. Structured formats may use tabular, dossier, or letterhead
  conventions when that matches a real CV family.
- Do not use portrait/photo blocks, badge clusters, decorative sidebars, ugly
  colored page stages, heavy shadows, or artificial card backgrounds.
- In `cv/2`, black-background CV styles must stay below 5% of the style space.
- Support multiple document archetypes through section order and page count:
  ATS resume, executive resume, academic CV, Europass-style structured CV,
  government dossier, legal memo, clinical file, product spec, architecture
  index, editorial resume, and portfolio-leaning CVs.
- Variation must be structural, not just palette-level: use different evidence
  grammars such as chronology ledgers, representative matters, KSA narratives,
  academic publication lists, clinical credential files, architecture project
  indices, case-study grids, and structured qualification tables.
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
- 2026 redesign pass synthesizes more than 100 public CV/resume references into
  document families rather than color themes. Structural references include:
  Harvard MCS one-page resume examples and paragraph/bullet templates, Harvard
  GSAS academic CV guidance, Europass profile/CV structure, USAJOBS federal
  resume requirements, and broad public galleries only as secondary evidence of
  layout families. The implementation should synthesize style families from
  those references, not copy any single template.

Runtime verification follows the repo rules: do not start a dev server, do not
run browser checks unless explicitly requested, and use only `pnpm lint` plus
`pnpm exec tsc --noEmit` for local static verification.
