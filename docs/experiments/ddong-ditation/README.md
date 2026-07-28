# ddong-ditation

`ddong-ditation` is the canonical experience name. Keep the hyphen in the
public routes, component family, socket ID, documentation, and visible
wordmark.

Current routes:

- `/ddong-ditation`: mobile experience, currently variant `1`.
- `/ddong-ditation/2`: mobile variant `2`.
- `/ddong-ditation/screen`: shared exhibition screen, currently variant `1`.
- `/ddong-ditation/2/screen`: exhibition screen for variant `2`.

The short, unnumbered phone route is intentional. Variant `1` remains explicit
in the component registry and socket room so a genuinely different later
experiment can be separated without exposing premature variant navigation.

## Mandatory development policy

Every numbered iteration is a complete, standalone experience. Similar visual
or behavioral results do not make one iteration a dependency of another.

- An iteration must own its own `mobile/`, `model/`, `screen/`, and
  `transport/` directories.
- An iteration must own its socket implementation, event namespace, room,
  runtime state, and tests.
- Code inside `components/ddong-ditation/<iteration>/` must never import from a
  sibling iteration.
- Deleting iteration `1` must not remove or invalidate any implementation
  module required by iteration `2`; the inverse rule applies equally.
- Visual duplication between iterations must be copied into the owning
  iteration unless a future shared primitive is explicitly promoted above all
  numbered iterations as a stable, iteration-neutral contract.
- A `mobile/index.tsx` file is an orchestrator only. It owns data, state,
  timers, transport calls, and screen selection; it must not contain page
  markup or page styling.
- Each mobile page is grouped in its own directory:
  `mobile/<page>/index.tsx` and `mobile/<page>/styles.module.css`.
- A page imports only its own CSS module. Do not accumulate multiple pages in a
  flat `mobile/` directory or in one shared page stylesheet.

Variant `1` currently follows this structure for `home-page` and
`session-page`. Variant `2` follows it for `gradient-shell`, `intro-flow`,
`splash-page`, `nickname-page`, and `reading-page`.

### Variant 2

Variant `2` keeps only the three-second entry animation and nickname step from
its earlier Calm-like skeleton. After nickname submission, the old photographic
landing page, Daily Ddong card, bottom navigation, and breathing player are not
rendered. They are discarded behavior, not hidden alternate states.

One persistent `gradient-shell` owns a restrained animated field of near-black
umber, dark chocolate, walnut, cocoa, and ochre brown for the entire mobile
experience. It never unmounts between the splash, nickname, and timed reading
states. The splash contains only the specified identity text:

- `ddong-ditation`
- `똥디테이션`
- `명상을 하며 쾌적한 대변을 즐겨보세요.`

After exactly three seconds, the identity content yields to a minimal nickname
form while the gradient continues uninterrupted. The nickname screen has no
bottom identity or slogan footer. Submitting a non-empty nickname fades only
the form content and starts a 4 minute 33 second reading.

The timed reading screen shows `elapsed / 4:33` and a matching progress bar at
the top beside the `ddong-ditation` wordmark. Every line uses the same brand
type treatment and occupies a `78svh` scene. Symmetrical `11svh` document
padding still places the first and final lines at the exact viewport center,
while keeping consecutive lines closer together. A single GPU-transformed text
layer advances linearly over the full duration while the native scroll
container remains manually operable. The current copy is explicitly temporary,
user-provided text stored as stable-ID records in
`2/model/reading-script.ts`; replace that dataset when the final instruction
text arrives.

Variant `2`'s mobile, model, transport, screen, socket room, event namespace,
archive, and tests remain owned by variant `2` and do not import from variant
`1`. The current reading mobile does not emit the discarded breathing-session
events; the independent transport and screen remain available for a later
variant `2` screen contract.

## Scope of this pass

This is a light skeleton, not a completed meditation product. It establishes:

- one Calm-like mobile landing screen;
- one short start-to-finish breathing state;
- one matching exhibition screen;
- anonymous live participation and an in-memory completion archive.

It does not add a content library, onboarding questionnaire, account,
subscription, teacher system, personalization, streak, database, or invented
product dashboard.

The premise combines `ddong` and meditation: a person pauses digital activity
while seated on a toilet, and the language of mental release meets literal
bodily release. It is a parody of a commercial meditation interface, not a
medical or therapeutic product.

## Final visual authority

The mobile skeleton deliberately follows the actual Calm application UI shown
in Calm's publisher-provided App Store screenshot gallery. The primary visible
invariants are:

- a full-viewport, quiet landscape photograph;
- white script wordmark and restrained white interface text over the image;
- a brief greeting and one dominant recommendation;
- a single rounded Daily Calm-style content card;
- a circular play action;
- a compact four-item bottom navigation;
- a quieter, reduced-control session view after starting.

The implementation changes only the experience name, Korean copy, the session
subject, and the accent color. Brown is a limited accent on the play action,
breathing circle, and live-participant marks; it is not a brown theme applied
to every surface.

The exhibition screen is not a separate dashboard aesthetic. It uses the same
photograph, white typography, script wordmark, translucent white content
surface, and brown state mark. Its only additional jobs are to show anonymous
current sessions and recent completed sessions.

Primary visual evidence:
[Calm App Store UI gallery](https://apps.apple.com/us/app/calm/id571800810).
The landscape photograph is stored locally for exhibition reliability and is
credited to
[Saul Brotheridge on Unsplash](https://unsplash.com/photos/a-body-of-water-surrounded-by-a-forest-SneyzBq7nNk).

## Interface contract

1. **Participant situation:** a person privately holds a phone while seated on
   a toilet; several phones may be active while a public screen is visible
   elsewhere in an exhibition.
2. **Primary parameter:** whether a sitting is active, its abstract breath
   phase, and the completed breath-cycle count.
3. **Perceptual job:** the phone makes one slow breathing cycle legible; the
   public screen makes simultaneous private sittings and accumulated
   completions visible without identifying anyone.
4. **Interaction job:** one action starts the sitting and one action ends it.
   The phone advances through arriving, breathing, and releasing.
5. **Wrapper justification:** the Calm-like wrapper is explicitly required for
   the parody to remain recognizable. It is a reference-fidelity constraint,
   not permission to invent a general wellness brand.
6. **System family:** both devices share one scenic photograph, white sans
   typography, a script wordmark, rounded white content surfaces, and a single
   restrained brown accent.
7. **Removal test:** retain the wordmark, greeting, one daily card, start/end
   action, breathing circle, live marks, and archive. Remove check-ins,
   character art, colorful category systems, editorial serif styling, metrics,
   badges, ornamental charts, and explanatory chrome.

## Mobile UI audit

The following audit was performed from the actual application screenshots in
each publisher-provided Apple App Store gallery on 2026-07-28. These are direct
application/service UI references, not service homepages. Screenshot galleries
show selected publisher representations rather than every state of the live
product, so observations below are visual observations only.

| Service | Application UI visible in the screenshot gallery | Disposition |
| --- | --- | --- |
| [Calm](https://apps.apple.com/us/app/calm/id571800810) | Full-bleed landscape home, white script identity, greeting, Daily Calm recommendation card, circular play action, and bottom navigation; separate blue Meditation and purple Sleep browse screens | Sole visual authority for this skeleton |
| [Headspace](https://apps.apple.com/us/app/headspace-sleep-meditation/id493145008) | Flat orange, yellow, and purple fields; illustrated category tile grid; white session card and blue play action | Surveyed only; color blocks and illustration system rejected |
| [Insight Timer](https://apps.apple.com/us/app/insight-timer-meditate-sleep/id337472899) | Blue background, white rounded home panel, greeting, practice shortcut icons, and image-led content cards | Surveyed only; shortcut dashboard rejected |
| [Balance](https://apps.apple.com/us/app/balance-meditation-sleep/id1361356590) | Pale surfaces with compact illustrated recommendation and category cards | Surveyed only; personalization/card stack rejected |
| [Waking Up](https://apps.apple.com/us/app/waking-up-meditation-wisdom/id1307736395) | Dark navy editorial lesson and course cards | Surveyed only; dark editorial treatment rejected |
| [Medito](https://apps.apple.com/us/app/medito-mindfulness-meditation/id1500780518) | Dark application home with stacked meditation content cards | Surveyed only; dark library structure rejected |
| [Healthy Minds Program](https://apps.apple.com/us/app/healthy-minds-program-by-humin/id1326310617) | Blue application screens with greeting, structured path cards, and lesson/practice states | Surveyed only; program-path system rejected |
| [Happier Meditation](https://apps.apple.com/us/app/happier-meditation/id992210239) | Cream and black surfaces, warm recommendation cards, morning check-in, and progress curves | Surveyed only; check-in and progress treatment rejected |
| [Breethe](https://apps.apple.com/us/app/breethe-sleep-meditation/id920161006) | Dark, photographic content surfaces organized around sleep and practice categories | Surveyed only; multi-category library rejected |
| [Aura](https://apps.apple.com/us/app/aura-meditation-sleep-cbt/id1114223104) | Dark and white library grids, category cards, and coach-led content | Surveyed only; coaching/library density rejected |
| [Plum Village](https://apps.apple.com/us/app/plum-village-mindfulness/id1273719339) | Orange content lists and an audio player with waveform and transport controls | Surveyed only; audio-player complexity rejected |
| [Simple Habit](https://apps.apple.com/us/app/simple-habit-sleep-meditation/id1093360165) | Photo recommendation cards, For You and Sleep areas, and short-session browsing | Surveyed only; multiple recommendation rails rejected |
| [Smiling Mind](https://apps.apple.com/us/app/smiling-mind-mental-wellbeing/id560442518) | Off-white surfaces, heavy rounded sans type, purple accents, mood row, and routine cards | Surveyed only; mood check-in and purple system rejected |

The survey establishes context but does not authorize a hybrid. The final
design decision is intentionally narrow: clone Calm's mobile hierarchy and
surface grammar, then apply only the required `ddong-ditation` copy and brown
accent.

## Rejected overreach and durable correction

Two earlier directions violated the requested boundary:

- a sage, serif, organic-form wellness concept invented a new identity instead
  of following the named reference;
- a later mood check-in, history tab, colorful category, and character-driven
  version blended Headspace and Smiling Mind patterns into a product that was
  never requested.

Both also treated “skeleton” as permission to design a fuller service. The
durable rule for this experiment is: Calm is the primary and visible UI source;
the wider audit is research context only. Do not reintroduce a blended visual
system or expand the information architecture unless the user explicitly asks.

## Socket and data boundary

Room: `experiment:ddong-ditation:1`

Events:

- `ddong-ditation:join`
- `ddong-ditation:hello`
- `ddong-ditation:state`
- `ddong-ditation:session:in`

The server owns anonymous abstract state only:

- an ephemeral session and socket participant ID;
- start/update/end timestamps;
- `arriving`, `breathing`, or `releasing` phase;
- completed breath-cycle count;
- completed/left outcome and duration;
- role counts.

Each browser derives color, size, motion, text, and layout. No presentation
state crosses the socket. The archive is process memory capped at 80 entries
and resets with the socket server; no database or durability is implied.

No names, toilet identifiers, free text, location, or device fingerprints are
collected. Durable exhibition logging would require a separate decision about
consent, retention, deletion, and the privacy implications of mapping a private
toilet interaction onto a public screen.

## Verification boundary

Static checks cover route/component typing, socket registry uniqueness, and
module-level state validation. They do not prove cross-device timing, viewport
appearance, or HTTPS socket behavior. Browser/runtime verification is excluded
unless the user explicitly requests it.
