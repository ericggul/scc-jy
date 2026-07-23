# macOS UI experiments

- Route group: `/macos`
- Current variant: `/macos/1`
- Implementation: `components/standalone/macos/1`
- Shared copy: `components/standalone/macos/copy.ts`

The first variant renders a responsive vertical stack of desktop menu-bar rows.
Each row takes one exact phrase from the reusable mythic-marketing phrase set in
`copy.ts`; its words become the application menus, and a fixed illustrative
brand name replaces the active-app label. The brand names in `rows.ts` are
explicitly fictional assignments for this artwork. They do not describe or
claim affiliation with real organizations.

The visible row count is derived from viewport height in the component data
layer using `floor(viewportHeight / 38)`. The grid divides the full viewport
height evenly across those rows, keeping each close to 38 px without clipping a
partial final row. At 1920 px, for example, 50 rows render at 38.4 px each. Rows
touch one another with no vertical gap and occupy the complete viewport width.
Generated word records receive stable IDs based on the fixed row ID and word
position; display strings are never used as React keys.

Each row starts with a distinct clock offset, battery percentage, charging
state, and Wi-Fi strength. The first row starts from the reference capture time
`2026-07-10 16:15`. A timer fires every `1000 / 6` milliseconds, advancing the
virtual clock by one displayed minute per tick — six visible minute ticks per
real second rather than a single six-minute jump.

The same tick drives a seeded stochastic simulation. Battery state follows a
bounded charge/discharge random walk with plausible per-minute rates and
probabilistic plug/unplug transitions; Wi-Fi follows an adjacent-level Markov
walk with slower transitions and recovery from disconnection. The PRNG seed is
kept inside simulation state, so the motion is stochastic-looking, reproducible,
and pure under React updater replays.

Top-level menus open on hover in every row. Moving between menu titles switches
the open panel immediately; leaving the row closes it. Click and keyboard paths
remain available as secondary input methods.

## Visual baseline

The current target is **macOS 27 Golden Gate Preview**, not the pre-Tahoe menu
bar and not an invented generic glass surface. As of 2026-07-10, Apple describes
macOS 27 as refining Liquid Glass with more uniform refraction, improved
contrast, stronger readability, and updated menu-bar icons.

For the correction pass, the visual corpus contained 105 distinct recent UI
states after excluding legacy macOS examples and obvious duplicate search
results:

- 42 distinct macOS 27 scenes represented by 84 paired image endpoints on
  Apple's official macOS 27 preview page.
- 24 Tahoe appearance states in the 512 Pixels macOS Screenshot Library,
  covering light, dark, clear, tinted, and theme-color variants.
- 15 macOS 27 first-beta UI comparison images from MacTechNews.
- 24 additional non-duplicate macOS 26/27 menu-bar, Control Center, Live
  Activity, light-wallpaper, and dark-wallpaper examples found across current
  product reviews and UI reports.

Primary references, accessed 2026-07-10:

- <https://www.apple.com/os/macos/>
- <https://512pixels.net/projects/aqua-screenshot-library/macos-26-tahoe/>
- <https://www.mactechnews.de/news/article/macOS-27-Golden-Gate-Bilder-aus-der-neuen-macOS-Generation-189522.html>
- <https://www.macstories.net/stories/macos-26-tahoe-the-macstories-review/2/>

### Menu-bar rules derived from the corpus

- The default menu bar is visually transparent. Do not draw a full-width white
  or frosted slab, bottom border, gloss gradient, or drop shadow behind it.
- Variant 1 deliberately uses the user-specified black desktop and white
  foreground combination. The supplied 2940×1912 Retina captures establish a
  38 px CSS-height notched-MacBook menu bar, 14 px SF text, and a 26 px active
  title surface. The black field is a direct art-direction constraint, not an
  invented wallpaper.
- The surrounding page is not part of this experiment. Keep it plain and do not
  invent a wallpaper, desktop scene, widgets, windows, or decorative content.
- Reproduce hierarchy with SF Pro Text/system font metrics: regular app menus,
  semibold active-app name, compact line height, optical rather than generous
  spacing, and tabular time numerals.
- Status symbols must be compact monochrome silhouettes with consistent visual
  weight. Avoid oversized web-style outline icons.
- Liquid Glass is contextual material, not a synonym for gradients and blur.
  macOS 27 specifically reduces indiscriminate glass effects in favor of
  contrast and legibility.
- Responsive behavior may hide lower-priority menus when width is genuinely
  constrained, but it must preserve the Apple menu, active app, at least one
  conceptual menu, core status, and clock.
- Every visible top-level item must open a populated command menu. Menus use
  13 px system text, 23 px command rows, separators, right-aligned shortcuts,
  restrained icons, disabled states, nested panels where semantics require
  them, and blue selection only at the active command level.

## Failure review: first implementation

The first implementation was wrong for reasons that must not be repeated:

1. **Scope invention.** The request was a menu-bar row. I added a full-screen
   purple/orange gradient wallpaper and pseudo-element artwork. That changed the
   artifact being designed and made an unrequested background dominate it.
2. **No temporal verification.** I claimed a “macOS-style” result from memory
   without checking what “latest” meant. On this task date, the latest public
   design reference is macOS 27 Golden Gate Preview, while even Tahoe 26 had
   already made the default menu bar transparent. The old slab treatment was
   therefore factually stale before it was aesthetically judged.
3. **Wrong material model.** I treated Apple glass as a recipe of white
   gradients, heavy blur, border highlights, and shadow. Apple treats material
   contextually; macOS 27 further tones it down and explicitly prioritizes
   uniform refraction, contrast, and readability. The implementation copied the
   cliché of glass, not the system behavior.
4. **Poor pixel discipline.** The bar height, menu padding, status-icon scale,
   Apple mark, and font weight were chosen by broad `clamp()` estimates rather
   than measured against current screenshots. The result read as a web navbar,
   not OS chrome. The corrected desktop baseline therefore uses fixed logical
   macOS metrics. The corrected target now comes from the user's Retina capture
   rather than the external-display `NSStatusBar` value: 38 px bar, 14 px SF
   text, 26 px title targets, and 8 px ordinary menu padding. Media queries are
   reserved for actual collision handling rather than fluidly distorting system
   chrome.
5. **Weak completion claim.** Passing ESLint and producing no new TypeScript
   errors only proves code health. It does not prove visual fidelity. I reported
   the work as complete without any current visual reference or rendered
   comparison, which was an invalid verification standard for a clone task.
6. **Cosmetic interaction without a menu system.** The first pass only toggled
   a highlight on top-level buttons. A macOS menu bar is defined by the command
   menus it opens, their separators and shortcuts, pointer traversal between
   open menus, nested menus, disabled states, outside-click dismissal, and
   keyboard behavior. A visual highlight alone must never be described as an
   implemented menu bar.

### Mandatory preflight for future agents

Before editing any macOS experiment, determine the current macOS release or
preview from Apple, inspect current screenshots, state which version is the
target, and list the visual invariants. Never add desktop/background content
unless the user explicitly requests it. Do not call a clone complete based only
on lint or type checking; visual fidelity requires reference-based comparison,
and runtime comparison must follow this repository's explicit browser-testing
and server rules.
