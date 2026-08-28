# C-VAL 2 media comment-reaction overlay

Date: 2026-08-26

## Trial

- **Participant situation:** an installation viewer sees the existing
  execution-change video field while a sharp market move also reaches them as
  one large spoken reaction.
- **Changed variable:** the media screen receives an optional absolute layer at
  `components/screen/media/comment-reaction/`. It still renders only the newest
  large reaction, without the legacy screen's archive, but its comment path is
  now the same as `comments-legacy`: a 0.75% active-move threshold; a
  direction-and-magnitude bucket signature; the same 100–720ms admission gate;
  deterministic voice/style/arousal selection; 0.96–1.42× playback rate; and
  the same `씨발` → `**` text and audio censor treatment.
- **Visibility/audio coupling:** a committed reaction immediately requests the
  legacy audio path. The media text hides outside `active`; already-started
  legacy audio is not cancelled, compressed, detuned, or capped by the current
  comments screen's shared source pool. Its censor beep uses the same shared
  70% runtime gain trim, 12ms envelope, and 2.5% downward glide as the current
  comments screen.
- **Audio/cadence trial:** this layer no longer warms a separate selection pool
  or follows the current comments screen's social cadence. Each incoming
  snapshot is admitted by the exact legacy gate: the first valid pulse is
  immediate; later entries require at least 100ms and otherwise wait according
  to the legacy pulse intensity.
- **Retained invariants:** media video selection, tile count, canvas timing,
  QR waiting state, market snapshot, socket protocol, and all
  standalone comments routes are unchanged. The layer accepts no pointer input
  and adds neither a background nor a market-derived visual to the video field.
- **Paused-market behavior:** when the market leaves `active` for
  `closing-auction`, its last execution-derived video segment keeps looping in
  place while its reaction layer clears its text. Previously started legacy
  audio follows the legacy audio lifecycle. The `waiting` entry state remains
  unchanged. Only this media screen changes in this trial.
- **Removal:** set `ENABLE_MEDIA_COMMENT_REACTION` to `false` or remove the
  single overlay render in `media/index.tsx`; the feature is otherwise confined
  to this folder and can be deleted as one unit.
- **Observed result:** not browser-observed in this change. Static type checking
  and the five `comments-legacy` presenter tests pass; the media layer imports
  those tested admission, selection, censor, and playback functions directly.
- **Unresolved question:** assess at installation distance whether the large
  text competes with the video rather than making the same execution change
  more immediate, and whether the independent browser audio context needs a
  participant gesture before the first reaction is audible.
