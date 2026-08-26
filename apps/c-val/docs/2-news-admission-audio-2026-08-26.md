# C-VAL 2 — News admission audio trial — 2026-08-26

- **Baseline:** the existing two-column news wire admitted market and society
  stories at its shared movement-derived cadence without sound.
- **Variable:** each row admission requests a low synthetic three-pulse phrase
  (two short forebeats, then one lower landing pulse). Its onset gate follows
  the same cadence curve as the news wire, with a 60 ms floor; missed arrivals
  are discarded rather than queued, so old news never sounds later. The single
  `C_VAL_NEWS_ADMISSION_AUDIO_ENABLED` constant disables every request without
  changing the news wire itself.
- **Retained invariants:** story generation, pending capacity, record limits,
  headline selection, column geometry, and all visual styling remain unchanged.
- **State guard:** sound is active-phase only. Browser audio begins after a
  pointer or keyboard interaction, matching browser autoplay requirements.
- **Rejected variation:** an imported authored notification one-shot was tried
  between revisions and rejected because it did not preserve the intended low
  rhythmic relation. Its asset was removed; this experiment remains fully
  synthesized and self-contained.
- **Open question:** whether the 60 ms high-speed floor gives sufficient tension
  without becoming too dense when both columns admit stories concurrently.
