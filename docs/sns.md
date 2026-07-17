# SNS Experiment

Routes:

- `/sns`
- `/sns/feed/1`
- `/sns/navigation/default`
- `/sns/navigation/1`
- `/sns/youtube/1`
- `/sns/youtube/2`

Files:

- `app/sns/page.tsx`
- `app/sns/[category]/[experiment]/page.tsx`
- `components/sns/experiments.ts`
- `components/sns/feed/1/index.tsx`
- `components/sns/feed/1/data.ts`
- `components/sns/navigation/default/index.tsx`
- `components/sns/navigation/1/index.tsx`
- `components/sns/youtube/1/`
- `components/sns/youtube/2/`
- `docs/sns-youtube.md`
- `docs/sns-youtube-2.md`

Intent:

`/sns/feed/1` is a mobile-first Instagram-style feed clone. It uses 100
deterministic predefined posts and wraps through them as the vertical feed
extends, giving the interaction model of an infinite feed without fetching live
content.

`/sns/navigation/default` preserves the iPhone Instagram bottom
navigation test: Home, Reels, Messages, Search, and Profile. It intentionally
does not clone the feed or center interface. The bar uses the newer floating
translucent iOS-style treatment rather than the older flat white strip. Tapping
a tab moves the active glass highlight. Finger skating lets one uninterrupted
pointer gesture continuously select tabs across both columns and independently
stateful navigation rows.

`/sns/navigation/1` compares two five-part cycles. `24h` compresses a modern
worker's day to bed, commute, work, meal, and phone reels. `Life` compresses a
modern worker's lifetime to birth, education, work, hospital, and death. Its
bottom-left `24h / Life` switch preserves separate interaction state for both
timescales so they can be compared without leaving the route.

`/sns/youtube/1` is a mobile-first long-form video platform experiment. It
uses YouTube's navigation and viewing grammar across discovery, search, watch,
comments, channel, library, queue, and account states while avoiding a
short-video-only interaction. Its model, interaction map, and visual rationale
are documented in `docs/sns-youtube.md`.

`/sns/youtube/2` is an independent current-pattern YouTube reconstruction.
It preserves the supplied dark mobile viewing grammar, adds a separate desktop
guide/search/watch-next composition, and documents its 56-source research
ledger in `docs/sns-youtube-2.md`.

The icon system must communicate these cycles without visible explanatory
text. At the rendered 28-pixel size, prefer established universal pictograms
and reduce each stage to its strongest recognition cue: a baby bottle, open
book, monitor, medical cross, and gravestone. Do not invent bespoke symbolic
silhouettes or add details that make the primary object harder to recognize.

The bottom-left visual toggle compares three experimental selected states:
`Stroke` colors the icon outline, `Fill` colors its primary body, and `Halo`
keeps the icon monochrome while applying a light object-referential tint,
border, and shadow to the selected pill. Unselected icons remain monochrome.

Interaction:

- Vertical scroll extends the feed in batches and wraps through the 100-post
  dataset.
- Every `/sns` route uses the nested `app/sns/layout.tsx` viewport policy:
  `maximumScale: 1`, `userScalable: false`, and a `touch-action: pan-x pan-y`
  wrapper prevent two-finger page zoom without changing routes outside SNS.
- Each post has a horizontally snapping media carousel with two to five images.
- The active media index is tracked per carousel and shown as progress dots.
- Like, save, comment, and send are present as direct feed controls.
- `/sns/navigation/default` and `/sns/navigation/1` use the shared
  finger-skating behavior defined in `docs/finger-skating.md`.
- Double-clicking media triggers a heart burst and likes the post.

Rules:

- Keep `app/sns/[category]/[experiment]/page.tsx` as a route switch only.
- Keep generated feed data in `components/sns/[category]/[experiment]/data.ts`.
- Keep interaction logic in `components/sns/[category]/[experiment]/index.tsx`.
- Do not add API calls or live social-network dependencies.
