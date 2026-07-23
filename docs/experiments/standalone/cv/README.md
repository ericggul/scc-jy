# cv

`cv` is a single-device experiment for infinitely variable pseudo CV generation.

The first variant maps pointer X to industry/job family and pointer Y to years
of experience. The generator keeps future parameter dimensions explicit in the
types so country, qualification system, format preference, language, and evidence
density can become first-class controls later.

## Variants

- `cv/1`: canonical A4 CV/resume generator with mouse-position parameter
  navigation.
- `cv/2`: 2D scroll-plane navigator using the same semantic axes and same A4
  sheet rendering as `cv/1`. CV states are laid out on a virtualized 100 by 100
  X/Y grid and navigated with horizontal/vertical scroll, not mouse-position
  randomization.
- `cv/3`: same 2D virtualized plane and navigation as `cv/2`, but every CV is a
  parallel-universe variant of the same person name: `Jeanyoon Choi`. Contact
  details, city, career history, employers, schools, industries, and formats
  still vary by coordinate.

## Design rules

- CVs must look like real working documents, not portfolio cards, landing pages,
  or decorative dashboards.
- Keep a very minimal black outline around the A4 CV page so the page boundary
  is readable.
- The A4 page box and black outline position must stay invariant across style
  changes. Only browser viewport changes may resize the page.
- The left-side parameter panel is an overlay and must not participate in page
  centering, page sizing, or CV document flow. It should show semantic CV data
  only, not visual style, structure, page-mode, or density parameters.
- Internal typography and spacing must scale with the A4 page box. Do not use
  capped pixel font clamps that make the border resize while the text stays the
  same size.
- A rendered CV page should use the full A4 sheet. Sparse variants should add
  realistic record sections or distribute sections through the page height
  rather than leaving a half-empty sheet.
- Default ATS/professional styles to single-column, reverse-chronological
  documents. Structured formats may use tabular, dossier, or letterhead
  conventions when that matches a real CV family.
- Do not use portrait/photo blocks, badge clusters, decorative sidebars, ugly
  colored page stages, heavy shadows, or artificial card backgrounds.
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
- `cv/2` grid cells must be exactly A4-sheet-sized, not viewport-sized, with no
  viewport-sized dead space. Inter-CV margin is controlled by one responsive
  ratio constant in the plane component, currently sized from the A4 page width.
  Positive values add space between CVs; negative values intentionally overlap
  neighboring CV sheets without changing each CV's internal layout. In negative
  overlap mode, CV sheet backgrounds must be transparent so text layers visually
  stack instead of being covered by white page fills.
  Multiple CVs should be visible in one viewport when space allows, and
  neighboring CVs should sit directly above, below, left, and right of the
  current CV.
- `cv/2` must have exactly one scroll container: the fixed full-screen 2D plane.
  The page/body and individual CV sheets must not create nested scroll regions.
- `cv/2` must not use native mandatory scroll snapping because it interrupts
  high-speed scrolling. Let the 2D plane scroll freely, then after scrolling
  settles, programmatically center the nearest CV sheet.
- `cv/2` should keep scroll performance independent from total grid size by
  rendering only a 15 by 15 neighborhood around the current scroll position
  rather than mounting the full 100 by 100 plane. This is 225 mounted CV sheets,
  below the previous 16 by 16 cap.
- `cv/2` zoom controls live at bottom left. Zoom changes the grid cell pitch so
  zooming out reveals more neighboring CV sheets like a map, while preserving
  the current semantic position.
- `cv/3` must keep only the displayed person name constant as `Jeanyoon Choi`.
  Contact details, city, phone, profile URL, country dimension, and career data
  should remain generated per coordinate.
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
