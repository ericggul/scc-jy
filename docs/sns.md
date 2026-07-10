# SNS Experiment

Routes:

- `/sns`
- `/sns/feed/1`
- `/sns/navigation/1`

Files:

- `app/sns/page.tsx`
- `app/sns/[category]/[experiment]/page.tsx`
- `components/sns/experiments.ts`
- `components/sns/feed/1/index.tsx`
- `components/sns/feed/1/data.ts`
- `components/sns/navigation/1/index.tsx`

Intent:

`/sns/feed/1` is a mobile-first Instagram-style feed clone. It uses 100
deterministic predefined posts and wraps through them as the vertical feed
extends, giving the interaction model of an infinite feed without fetching live
content.

`/sns/navigation/1` only implements the current iPhone Instagram bottom
navigation test: Home, Reels, Messages, Search, and Profile. It intentionally
does not clone the feed or center interface. The bar uses the newer floating
translucent iOS-style treatment rather than the older flat white strip. Tapping
a tab moves the active glass highlight. Finger skating lets one uninterrupted
pointer gesture continuously select tabs across both columns and independently
stateful navigation rows.

Interaction:

- Vertical scroll extends the feed in batches and wraps through the 100-post
  dataset.
- Each post has a horizontally snapping media carousel with two to five images.
- The active media index is tracked per carousel and shown as progress dots.
- Like, save, comment, and send are present as direct feed controls.
- `/sns/navigation/1` adds the fixed five-tab bottom navigation.
- `/sns/navigation/1` uses the shared finger-skating behavior defined in
  `docs/finger-skating.md`.
- Double-clicking media triggers a heart burst and likes the post.

Rules:

- Keep `app/sns/[category]/[experiment]/page.tsx` as a route switch only.
- Keep generated feed data in `components/sns/[category]/[experiment]/data.ts`.
- Keep interaction logic in `components/sns/[category]/[experiment]/index.tsx`.
- Do not add API calls or live social-network dependencies.
