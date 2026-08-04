# Goldfishes 0804/music-sheet

Date: 2026-08-04

Route: `/goldfishes/0804/music-sheet`

Short description: **Mahler score data inside the established latent music-sheet interaction.**

## Experiment contract

- **Baseline:** preserve the pre-Mahler Beethoven `music-sheet` implementation.
  The black floor, permanently visible white five-line staffs, white Three.js
  note instances, responsive score reflow, local reveal, fish attraction,
  collision pulse and Tone.js signal chain are invariants.
- **Only mutation:** replace the Beethoven source events with a denser Mahler
  movement-IV reduction containing literal chord events.
- **Reveal:** a click is resolved to the nearest staff. Only pre-defined events
  inside the local horizontal radius on that staff become visible. It never
  reveals the same time position on the other staffs.
- **Sound:** a fish collision plays only the pitches belonging to the visible
  local event it hit. A displayed chord therefore sounds its own literal notes;
  hidden voices and unrelated events are never added to it.

## Ontological relation to node-edge

As in `0804/node-edge`, the complete structure exists before interaction and
the participant changes its visible/active subset rather than authoring new
objects. The relation remains local:

```text
fixed score events
  -> responsive legacy staff layout
  -> nearest-staff + local-radius hit test
  -> visible local event
  -> fish target + that event's own pitches
```

`show all` exposes the complete latent score. `Escape` and `clear reveal`
remove the active subset without regenerating the source.

## Score source and local encoding

The replacement data is derived from Gustav Mahler's *Symphony No. 1 in D
major*, movement IV. IMSLP catalogues the public-domain 1906 Universal Edition
complete score as file `#17070`. The machine-readable performance source is
Jean-François Lucarelli's 35-track movement-IV MIDI published by
GustavMahler.com.

- https://imslp.org/wiki/Symphony_No.1%2C_GMW_11_%28Mahler%2C_Gustav%29
- https://ks15.imslp.org/files/imglnks/usimg/d/dd/IMSLP17070-Mahler-Symph1fs.pdf
- https://gustavmahler.com/midi.html
- https://gustavmahler.com/site/midi/symphony1/set1/4th-movement-Sturmisch-bewegt.midi

The local excerpt begins at source tick 51,840 and spans 480 ticks at 120 PPQ.
“Sequencer bar 109” is only an internal MIDI location, not a claim about printed
measure numbering. The reduction stores 38 stable events and 82 note heads,
including 3- and 4-note chord events, sixteenth/eighth/quarter/dotted-quarter/
half/whole duration values, and explicit silent events. This is 2.34 times the
previous Beethoven trial's 35 note heads.

This is a traceable concert-pitch interaction reduction, not a facsimile or a
new critical edition. No score data is fetched at runtime.

## Visual and performance boundary

The established renderer remains unchanged:

- the black score canvas directly strokes every staff line in white;
- note heads, stems and ledger lines are white instanced Three.js meshes with
  no contrasting outline;
- the score canvas remains the Three.js floor texture;
- only revealed local events are passed to both the fish model and note meshes;
- note pulses and the original Tone.js synth/reverb/compressor settings are
  preserved;
- score drawing occurs on resize/reveal, while the animation loop updates the
  existing instanced fish and note pulse matrices.

Static verification: `pnpm exec tsc --noEmit`, `pnpm lint`, and
`git diff --check`. Browser interaction was not run because repository policy
requires explicit user authorization for runtime browser testing.
