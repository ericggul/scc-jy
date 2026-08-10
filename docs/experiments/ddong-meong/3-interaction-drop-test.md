# ddong-meong/3 — spatial interaction and background lab — 2026-08-10

## Trial

Test one new relation in the working `/3/mobile` reader: a participant's press
does not move the meditation text. It releases one material event from the
precise position pressed.

## Participant situation

A participant is reading the same timed meditation on a phone. The text continues
to move at the fixed content duration; touch no longer lets the participant take
over that timeline. A direct press is an embodied request for one falling
material event at that screen coordinate.

## Changed variable

- manual text scrolling is removed;
- `pointerdown` normalizes the pressed x/y position relative to the current
  content surface and passes only `{ x, y, startedAt, id }` to the background;
- finger skating follows the repository pattern: pointer capture begins at
  press and the currently moving coordinate is resolved while the pointer
  remains down. Each pointer contributes at most one current trace segment per
  animation frame; coalesced samples retain the distance travelled within that
  frame. The segment spans its previously rendered coordinate to its current
  coordinate, rather than snapping to fixed spatial steps. Pointer up, cancel,
  and lost capture end only that pointer stream; hover never emits;
- keyboard activation uses the surface centre; wheel input has no visual action;
- every press produces an immediate falling event. During skating, the trace
  follows the live coordinate once per display frame; there is no input queue,
  or concurrency ceiling. The original `/2` above-field fall begins at entry
  and continues with its profile phrase emission as a visual-only layer; it
  never calls the interaction path or raises the field;
- only after a manual event has reached the existing field does it increment the
  accumulation state. Its `1/192` height change is then eased into
  the field; elapsed time never raises that field by itself;
- a press's visible falling particle count remains half of the initial
  interactive trial, while its accumulation volume is one quarter of the
  preceding trial. A skating trace integrates
  its travelled distance instead of treating each animation frame as a full
  press, so later volume tests have one local control point;
- all six material profiles derive their spawn point from that input. Their
  profile values now control material behavior, not a fixed screen lane.

## Retained invariants

- the legacy [`mobile copy`](../../../components/ddong-meong/3/mobile%20copy)
  is not modified;
- `/3/mobile` still has the same route, text, total duration, automatic text
  movement, timer, prelude, soundtrack, flush sequence, layout and six profiles;
- the original lower accumulation form, material profiles and drain are
  retained; only its progress source changes from elapsed time to completed
  events, with a press's falling density set to one half and its accumulation
  volume set to one quarter of the preceding trial;
- material form, palette, fall duration, path, and accumulation profile remain
  content-specific.

## Renderer boundary

`mobile/content/registry.ts` binds every text script to a profile. The reader
only owns timed text, sound, and flush state. `mobile/background/interaction`
owns input normalization and independent concurrent drops; `mobile/background/interactive-accumulation`
owns the WebGL material. The renderer receives the current abstract drop origin
and interaction count, then derives the visual trail and accumulation locally.
The continuous automatic layer has its own static GPU geometry and no manual
interaction state. Presses and skating traces use separate reusable GPU batches (the solid form
uses instanced batches). A trace segment has fourteen percent of a press's visible
particle budget, while its accumulation amount integrates the actual travelled
distance. Batch allocation grows only when concurrent input actually requires
it. At count zero, the field remains absent while the independent `/2` fall
layer is already running.

## Test route and flush definition

`/ddong-meong/3/testing` redirects to `/ddong-meong/3/testing/original`. Each
of the six tests is one full-viewport background with only a small lower route
selector and a flush control. The routes are named after their own background
relations—not after any meditation content:

- `/testing/original`
- `/testing/viscous-stream`
- `/testing/solid-form`
- `/testing/heavy-column`
- `/testing/drifting-mist`
- `/testing/liquid-burst`

Every test begins at zero completed drops: the accumulated field is black while
the independent `/2` fall begins immediately above it without adding height.
Each press or continued skating position immediately creates a
coordinate-based drop; only after that drop lands does it add `1/192` of the
existing accumulation field. The same captured pointer stream is shared by
every test profile.

The actual reader retains its existing flush sequence: 2.8 seconds of drain,
then 5.5 seconds black before returning to `/ddong-meong/3/main`. The lab keeps
the same 2.8-second drain, holds black for 0.7 seconds, then resets only that
active background to zero interactions. This shorter hold is a lab-only repeat
cycle, not a change to the content route.

`/3/mobile`, `/3/screen`, and every test surface disable text selection,
long-press callouts, double-tap zoom, and pinch zoom. The reader's interaction
surface itself owns the no-scroll skating gesture.

## Observation question

How does the perceived causality differ among the six material profiles when
the launch point—not scrolling—is directly authored? Browser observation is
required before answering.
