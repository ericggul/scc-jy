# Finger Skating Experiment

Routes:

- `/finger-skating`
- `/finger-skating/1/mobile`
- `/finger-skating/2/mobile`
- `/finger-skating/1/screen`
- `/finger-skating/2/screen`

Files:

- `app/finger-skating/page.tsx`
- `app/finger-skating/[experiment]/mobile/page.tsx`
- `app/finger-skating/[experiment]/screen/page.tsx`
- `components/finger-skating/experiments.ts`
- `components/finger-skating/1/mobile.tsx`
- `components/finger-skating/1/screen.tsx`
- `components/finger-skating/2/mobile.tsx`
- `components/finger-skating/2/screen.tsx`
- `hooks/use-experiment-socket.ts`
- `socket/experiments/finger-skating/index.mjs`

Intent:

`finger-skating` is a multi-device Socket.IO experiment with isolated mobile and screen routes.

## Reusable interaction pattern

Finger skating is a continuous selection technique for an interface made of
discrete controls. In an ordinary interface, selecting several buttons requires
repeatedly touching and lifting a finger. With finger skating, one pointer-down
starts a continuous gesture: while the finger stays on the surface, whichever
eligible control is currently under the finger becomes selected. The gesture
may cross both control boundaries and independently stateful groups such as
rows. Pointer-up, pointer-cancel, or lost pointer capture ends the gesture.

The defining behavior is current-position selection, not a swipe interpreted
only after release. A valid implementation must therefore:

- select the control under the initial pointer-down immediately;
- keep the pointer stream alive with pointer capture while it crosses child
  elements;
- resolve the control under every active pointer position and update it without
  waiting for pointer-up;
- allow a single gesture to modify multiple independent groups when its path
  crosses them;
- do nothing on hover when no pointer is down;
- stop cleanly on pointer-up, pointer-cancel, and lost pointer capture;
- avoid repeating state work when the resolved semantic selection is unchanged.

Pointer capture retargets later pointer events to the capturing surface, so
`event.target` cannot reliably identify the control visually under the finger.
For DOM control collections, use viewport coordinates with
`document.elementFromPoint()` and stable `data-*` identifiers, or calculate the
semantic cell directly from the surface geometry. Process coalesced pointer
samples when available so quick movement is less likely to skip narrow targets,
but fall back to the event itself when the API is missing or returns an empty
array. Gaps between eligible controls should preserve the last selection and
resume selection when the finger reaches another eligible target.

Use `touch-action: none` only on a surface that intentionally owns the gesture;
otherwise preserve native scrolling and browser gestures. Keep real button
semantics and a keyboard/assistive-technology activation path. If pointer-down
already performs selection, suppress or distinguish the later compatibility
click so it cannot restore the gesture's starting control after the finger has
skated elsewhere. Multi-touch is optional, but if supported each `pointerId`
must have an independent lifecycle.

For dense rows of controls, each row retains its own selected value. A diagonal
gesture can therefore select one item in row A, continue through row B, and
select another item there without lifting. Visual transitions may interpolate
between selections, but the semantic state must always follow the latest
resolved target.

Implementation review checklist:

- tap selects the touched target;
- horizontal skating selects successive controls before release;
- vertical or diagonal skating updates every crossed group independently;
- leaving and re-entering eligible controls during the same captured gesture
  resumes selection;
- release and cancellation cause no further selection;
- mouse hover alone does not select;
- keyboard activation still works;
- native scrolling is disabled only where the experiment requires it.

This is the repository-wide living specification for the pattern. When
iterative testing reveals a failure or correction, record the generalized cause
and durable rule here, while keeping experiment-specific details in that
experiment's document.

`/finger-skating/2/mobile` is a non-scrollable finger-skating grid. The viewport width is divided by the `gridColumnCount` value in `components/finger-skating/2/mobile.tsx`; rows are generated from the viewport height. The mobile sends the same x/y signal shape as experiment 1, with fixed hue and intensity values.

Multi-touch behavior for experiment 2 is stream-aware while preserving the original pulse visual. Each finger has a stable `streamId` from pointer down to pointer up/cancel. The screen keeps a separate pulse trail per `streamId`, so a single finger still looks like experiment 1's pulse accumulation/fade, while two or more fingers get independent trails instead of competing for one global pulse list.

Screen rendering for experiment 2 is canvas-based for performance. Incoming socket signals are collected per animation frame, with one latest pulse per `streamId` per frame. Pulses are stored in refs and rendered through one canvas draw loop instead of React-managed DOM nodes. Mobile move signals are also emitted at most once per pointer per animation frame. Canvas glow is drawn with layered strokes instead of `shadowBlur`.

Routing rule:

Add future variants under `components/finger-skating/[number]/`, register the slug in `components/finger-skating/experiments.ts`, and wire the mobile/screen component maps in the dynamic route files.

Socket contract:

- Local transport: same hostname as the app, Socket.IO HTTPS port `4000`, path `/socket.io`.
- Rooms: `experiment:finger-skating:1` and `experiment:finger-skating:2`
- Events:
  - `finger-skating:join`
  - `finger-skating:hello`
  - `finger-skating:presence`
  - `finger-skating:signal:in`
  - `finger-skating:signal:out`

Rule:

Each `finger-skating` variant has isolated room state. Its state and events must
not be shared with other variants or future socket experiments.
