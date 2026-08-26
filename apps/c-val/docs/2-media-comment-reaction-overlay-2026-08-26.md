# C-VAL 2 media comment-reaction overlay

Date: 2026-08-26

## Trial

- **Participant situation:** an installation viewer sees the existing
  execution-change video field while a sharp market move also reaches them as
  one large spoken reaction.
- **Changed variable:** the media screen receives an optional absolute layer at
  `components/screen/media/comment-reaction/`. It preserves the
  current `comments` screen's voice threshold, selection, warm-up, and cadence,
  but renders only the newest large reaction; it does not carry that screen's
  chat archive. Its audio adapter reuses that screen's compressor, directional
  playback pace, pitch detune, and pitch-matched censor beep. Visible profanity
  is rendered as `**`. Within that
  shared voice selection, the overlay first prefers positive corpus entries for
  an upward move and negative entries for a downward move, then falls back to
  the exact current-screen selector when that narrower pool has no match.
- **Visibility/audio coupling:** a reaction is committed before its matching
  audio is requested. The audio request is keyed to that one reaction ID and
  is cancelled if that ID is no longer visible; when its source ends, only the
  matching visible reaction clears. No stale last line remains.
- **Audio/cadence trial:** delayed audio re-checks the latest same-direction
  pulse before starting. Its gain follows the current one-second move at
  0%/0%, 4%/35%, 8%/58%, 15%/80%, and 30%/100%; the shared audio pool permits
  one, two, or three simultaneous sources as that gain crosses 40% and 75%.
  When censor audition is enabled, its whole mute/beep window is currently
  offset by 0.3 source seconds, divided by effective playback speed.
  The shared social cadence passes exactly through 0%/400ms, 4%/300ms,
  8%/200ms, 15%/100ms, and 30%/30ms, with a shape-preserving monotone cubic
  in log time between them rather than linear segments.
- **Retained invariants:** media video selection, tile count, canvas timing,
  QR waiting state, market snapshot, socket protocol, and all
  standalone comments routes are unchanged. The layer accepts no pointer input
  and adds neither a background nor a market-derived visual to the video field.
- **Paused-market behavior:** when the market leaves `active` for
  `closing-auction` (or any other non-active phase), the hidden source video is
  paused in place and its reaction layer clears its text, pending audio, and
  active reaction audio. Only this media screen changes in this trial.
- **Removal:** set `ENABLE_MEDIA_COMMENT_REACTION` to `false` or remove the
  single overlay render in `media/index.tsx`; the feature is otherwise confined
  to this folder and can be deleted as one unit.
- **Observed result:** not browser-observed in this change. Static type and
  presenter tests establish the existing selection and audio inputs only.
- **Unresolved question:** assess at installation distance whether the large
  text competes with the video rather than making the same execution change
  more immediate, and whether the independent browser audio context needs a
  participant gesture before the first reaction is audible.
