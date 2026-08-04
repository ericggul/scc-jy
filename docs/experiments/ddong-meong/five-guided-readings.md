# Five guided readings — 2026-08-04

## Trial

Add five four-minute guided readings to the working `ddong-meong/2` variant
without replacing the existing lyric dummy or changing the established reading
screen.

## Routes

- `/ddong-meong/2/letting-go`
- `/ddong-meong/2/waiting-body`
- `/ddong-meong/2/downward-breath`
- `/ddong-meong/2/private-room`
- `/ddong-meong/2/lighter-moment`

Each reading contains 27 stable, ordered lines and runs for 273 seconds. The
five scripts respectively attend to release, waiting, downward breath, nearby
and distant sound, and changes in bodily weight or pressure.

## Changed variable

The subject and attentional structure of the guided text, accompanied by a
dedicated photographic image for each meditation.

## Retained invariants

- the archived `ddong-meong/1` variant;
- the existing `/ddong-meong/2/dummy` content;
- the mobile introduction, catalogue, reading layout, timer, automatic motion,
  background, typography, spacing, and route structure;
- the serious product voice: the text does not explain the satire or the
  exhibition data system.

## Static result

All five readings are registered in the existing catalogue and dynamic content
route. They reuse the current reading component, so concurrent visual and timer
work on that component remains the single source of presentation behavior. The
five generated images respectively depict a released leaf in moving water,
still reeds, descending valley mist, a quiet room opening onto distant trees,
and dandelion seeds lifting into open air.

`pnpm lint` and `pnpm exec tsc --noEmit` pass. Runtime appearance and timing
have not been observed because browser verification was not requested.

## Unresolved question

The content-specific gestures proposed for later testing are deliberately not
part of this trial. The next decision is whether the text differences should be
tested first in one shared reading format, or whether each reading should become
a distinct interaction before evaluation.
