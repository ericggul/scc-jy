# Goldfishes 0804/music-sheet

Date: 2026-08-04

Route: `/goldfishes/0804/music-sheet`

Short description: **Playable staff notation as fish attraction targets.**

## Experiment contract

- **Question:** can a score replace the inherited coordinate grid so notation
  becomes both the swarm's spatial field and a playable event surface?
- **Baseline:** `default`, retained as the behavioral and anatomical parent but
  reimplemented here as a complete standalone experiment.
- **Mutation:** the square-cell field is removed. Pointer positions quantize to
  rhythmic slots and diatonic staff steps; each resulting note is a visible
  notation glyph, a fish target, a collision region, and a Tone.js pitch.
- **Invariants:** 100 naturalistic instanced goldfish, schooling and optional
  collision prevention, exact-top orthographic initial view, full orbit,
  bounded zoom, keyboard creation and clearing, and the collapsed authoring
  surface.
- **Evidence:** the same coordinate must place the note, attract its assigned
  fish, detect entry into the note head, pulse the struck chord, and trigger its
  pitches. No hidden grid cell may perform those jobs.

## Interface premise

1. **Participant situation:** one person encounters a full-viewport blank score
   occupied by a moving school, then writes into it by clicking or dragging.
2. **Primary parameter:** the growing set of quantized pitch-and-time positions.
3. **Perceptual job:** read the initial exact-top view as sheet music and see
   the school redistribute toward authored notes.
4. **Interaction job:** place notes directly on staff positions; notes sharing
   one rhythmic slot form a chord, and a fish entering any note head sounds and
   pulses that chord.
5. **Wrapper justification:** uninterrupted five-line staffs, note heads, stems,
   and ledger lines define pitch, horizontal sequence, quantization, collision,
   and sound without clefs, meter, or barlines.
6. **System family:** the neutral full-screen field, orange naturalistic fish,
   sparse composition, orthographic camera grammar, and collapsed Leva surface
   remain recognizable as Goldfishes.
7. **Removal test:** removing the staff removes pitch placement; removing a
   note removes its attraction and sound. There are no captions, legends,
   media blocks, decorative crossings, or explanatory participant controls.

## Implementation and performance boundary

The black score and white staffs are drawn once into the same canvas texture used by the Three.js floor,
so orbit and zoom reveal it as an actual plane rather than a screen-fixed
overlay. Notes use three bounded instanced meshes for heads, stems, and ledger
lines. Fish retain eight instanced anatomical meshes. Note pulse color and scale
update within the existing animation frame; no React state is written per hit.

Tone.js is initialized only after a participant gesture, in accordance with
browser audio policy. One polyphonic synth feeds a short reverb and compressor.
Per-fish entry hysteresis and a 105 ms per-chord gate prevent continuous contact
or simultaneous arrivals from producing unbounded retriggers. Audio is muted
until gesture initialization succeeds; the visual collision still occurs.

The staff adapts its line spacing, system count, and rhythmic slot count to the
viewport. Existing anchors are reprojected to the new staff on resize. This
trial has received static TypeScript and lint verification only; visual rhythm,
audio balance, and frame cadence remain to be judged in the browser.
