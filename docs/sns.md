# SNS Experiment

Routes:

- `/sns`
- `/sns/1`

Files:

- `app/sns/page.tsx`
- `app/sns/[experiment]/page.tsx`
- `components/sns/experiments.ts`
- `components/sns/1/index.tsx`
- `components/sns/1/data.ts`

Intent:

`/sns/1` is a mobile-first Instagram-style feed clone. It uses 100
deterministic predefined posts and wraps through them as the vertical feed
extends, giving the interaction model of an infinite feed without fetching live
content.

Interaction:

- Vertical scroll extends the feed in batches and wraps through the 100-post
  dataset.
- Each post has a horizontally snapping media carousel with two to five images.
- The active media index is tracked per carousel and shown as progress dots.
- Like, save, comment, send, story rail, top bar, and bottom nav are present as
  direct feed controls.
- Double-clicking media triggers a heart burst and likes the post.

Rules:

- Keep `app/sns/[experiment]/page.tsx` as a route switch only.
- Keep generated feed data in `components/sns/[experiment]/data.ts`.
- Keep interaction logic in `components/sns/[experiment]/index.tsx`.
- Do not add API calls or live social-network dependencies.
