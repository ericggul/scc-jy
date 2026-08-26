# C-VAL 2 — News admission audio trial — 2026-08-26

- **Baseline:** the existing two-column news wire admitted market and society
  stories at its shared movement-derived cadence without sound.
- **Variable:** each row admission now requests a restrained two-note
  synthetic broadcast cue: a soft, harmonic first note followed by its perfect
  fifth. Its onset gate follows the same cadence curve as the news wire, with
  a 60 ms floor; missed arrivals are discarded rather than queued, so old news
  never sounds later. The two notes deliberately remain consonant when fast
  admissions overlap.
- **Retained invariants:** story generation, pending capacity, record limits,
  headline selection, column geometry, and all visual styling remain unchanged.
- **State guard:** sound is active-phase only. Browser audio begins after a
  pointer or keyboard interaction, matching browser autoplay requirements.
- **Open question:** whether the 60 ms high-speed floor gives sufficient tension
  without becoming too dense when both columns admit stories concurrently.
