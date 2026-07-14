# Video Player Experiment

Routes:

- `/video-player`
- `/video-player/1`

Files:

- `app/video-player/page.tsx`
- `app/video-player/[experiment]/page.tsx`
- `components/video-player/experiments.ts`
- `components/video-player/1/index.tsx`
- `components/video-player/1/video-player.module.css`

## Interface basis

1. **Participant situation:** one person encounters a full-screen stack of
   video transport controls on a mouse, pen, or touch device.
2. **Primary parameter:** each row's current playback position.
3. **Perceptual job:** the participant must see the current position and
   play/pause state of every row while scanning vertically, while video imagery
   remains hidden.
4. **Interaction job:** tapping seeks immediately; holding and skating across
   one or many rows continuously updates every crossed playhead before release.
5. **Wrapper justification:** horizontal transport strips make time the longest
   axis and let a single gesture cross independently stateful rows. This is the
   native geometry of the parameter, not a visual costume for “video.”
6. **System family:** all rows share the same monochrome play/pause, timeline,
   and elapsed/total-time grammar. Only transport state differs.
7. **Removal test:** video imagery, row titles, badges, headers, captions, and
   decorative metadata were removed because they do not improve seeking.

Variant 1 displays no video imagery. It mounts the media off-screen solely for
real playback and audio, then divides the visible viewport into fifteen equal
control rows. The initial black screen contains one `Start` button. That user
gesture starts every media element with sound on; any later play action also
explicitly unmutes the target before playback. The viewport is filled without
scrolling or partially clipped rows, and controls adapt to narrow and short
screens.

The controls apply the repository's finger-skating interaction pattern. One
pointer-down captures the pointer at the page surface. Every mouse, pen, or
touch sample is resolved with `document.elementFromPoint()` against stable row
and action identifiers, including coalesced samples when available. Timelines
seek continuously, while every play button crossed by one held pointer toggles
once on entry. Gaps preserve state, hover does nothing, and pointer-up,
pointer-cancel, or lost capture ends the gesture. Each timeline remains a
keyboard-focusable slider with arrow, Page Up/Down, Home, and End controls.
