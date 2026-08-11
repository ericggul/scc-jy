# C-VAL 2 comments screen

Date: 2026-08-11

Route: `/c-val/2/screen/comments`

## Accepted trial

The comments screen is a standalone surrounding consequence of the C-VAL 2
market. It makes a rapid realized movement legible as a short human reaction:
one context-minimal Korean comment appears while the matching original Cedar or
Marin performance plays. The source WAV remains unchanged; only the performed
`씨발` interval is muted and replaced by the accepted broadcast beep at runtime.

This trial changes one relation:

```text
actual one-second execution-price move
  -> bounded rapid-move pulse
  -> direction-compatible text and performance
  -> visible comment + censored original speech
```

It does not change mobile input, V/A/L, agents, matching, market calibration,
snapshot transport, controller behavior, or the active `rollercoaster` / `news`
/ `media` whole-screen set.

## Admission and cadence

- The screen reads `market.oneSecondMovePercent`, because C-VAL treats one
  second as its immediate market-day window.
- Absolute moves below `0.75%` remain quiet.
- Above the threshold, magnitude is quantized in `0.75`-point buckets. Direction
  or bucket changes admit the next available reaction; a sustained bucket keeps
  emitting additional reactions. No transition bypasses the 100 ms floor.
- Sustained-reaction spacing contracts continuously from `720 ms` to `100 ms` as
  the absolute move intensifies. The gate uses snapshot `serverTime`, not an
  independent animation timer.
- Visual history is bounded to twenty-four stable-ID records.
- Every admitted performance starts independently. Performances intentionally
  overlap instead of waiting for a speech queue, so stronger movement produces
  a crowd of simultaneous voices.
- Playback rate rises continuously from `0.96` to `1.42` with absolute movement
  intensity. The censorship interval is divided by that exact rate so the beep
  stays locked to the accelerated profanity.

These are presentation decisions only. The server still owns no comment,
selection, audio, color, size, or animation state.

## Corpus selection

The runtime index contains all 1,248 existing performances:

- two voices: Cedar and Marin;
- eight regional dialect directions per voice;
- 78 context-minimal utterances;
- thirteen sensory performance styles;
- 1,239 accepted profanity intervals and nine explicit source omissions.

Voices alternate by admitted sequence. Within that voice, selection is a stable
hash of run, direction, movement bucket, and sequence. Upward pulses admit
positive or ambiguous styles such as delighted disbelief and relief rebound.
Downward pulses admit negative or ambiguous styles such as panic impact, angry
rejection, helpless collapse, and fragile plea. High-intensity pulses prefer
the higher-arousal performances. The text itself never receives invented stock,
money, company, user, platform, username, or timestamp context.

Run this after source manifests or timestamp sidecars change:

```sh
node scripts/build-c-val-comments-index.mjs
```

It rebuilds
`public/audio/c-val/exclamations/comments-index.json` as a compact browser index.
It does not edit or duplicate any WAV.

## Censored playback

The implementation follows [the accepted beep contract](./beep-censoring.md):

- one `AudioContext` clock for source and oscillator;
- 1000 Hz sine;
- peak Web Audio gain `0.175`;
- 6 ms attack and release;
- source mute and beep restricted to each voice's own `start` / `end` interval.

The nine `missing-in-source-audio` records play unchanged because there is no
performed profanity to cover. Sound has no off state or activation UI: the
screen attempts playback from the first admitted reaction. If a browser-level
autoplay restriction suspends the audio context, the first ordinary pointer or
key interaction resumes it invisibly and the latest pending speech continues.

## Visual contract

The selected Bloomberg wrapper profile is `typographicField`, not a workstation
or simulated community application. The screen is one uninterrupted black field.
The newest comment occupies the perceptual center; older admitted comments
remain as fading spatial residue. Green means upward movement and red means
downward movement. Every visible `씨발` token is rendered as `**`; the unmasked
text remains internal only for selecting and playing its source performance.
There are no cards, handles, avatars, fake post times,
platform logos, market metrics, headers, badges, decorative rules, or sound
controls.

Entry motion happens only when an actual comment is admitted and is removed for
reduced-motion users. Stable event IDs, never mutable display text, are React
keys.

## Verification boundary

Pure tests cover the waiting and threshold gates, directional buckets,
intensity-dependent admission and playback speed, alternating voices, and
direction-compatible style selection.
The generated index is audited for its 1,248 entries, two voices, eight dialects,
thirteen styles, 1,239 intervals, nine source omissions, and accepted beep
constants.

Static checks cannot judge whether the chosen threshold feels sufficiently
responsive or whether a particular performance reads naturally against a live
price path. Those remain listening and real-runtime questions; changing either
must be a bounded follow-up trial rather than a market or screen redesign.
