# Bastille Day

## First-pass interface decision

- **Participant situation:** A visitor encounters thirty full-viewport web images stacked in the same browser viewport.
- **Primary parameter:** A sixty-image sequence gathered with French-language terms across recent Paris parades, the French Revolution, the storming of the Bastille, and “Vive la France.”
- **Perceptual job:** Notice the rapidly changing image stream at the interval configured by `IMAGE_CHANGE_INTERVAL_MS`.
- **Interaction job:** The first click anywhere only authorizes a looping performance of “La Marseillaise.” Images and files never navigate, open, download, or expose clickable controls.
- **Wrapper justification:** Every successfully loaded image occupies `100vw × 100svh` at the same origin. Locally stored low-resolution derivatives are decoded strictly one at a time; failed or not-yet-loaded images never enter the visible sequence, and the visible image advances according to the module-level `IMAGE_CHANGE_INTERVAL_MS` value.
- **System family:** Every record uses the same cropping, focus, source-link, and overlap rules.
- **Removal test:** Titles, counters, badges, captions, navigation, and decorative French motifs are omitted because none are needed to inspect the image field.

## Source policy

The sixty records are gathered from Wikimedia Commons using `Fête nationale`, `Défilé du 14 juillet à Paris`, `Révolution française`, `Prise de la Bastille`, and `Vive la France`, with recent parade material prioritized from 2025, 2024, and 2023. Each 640-pixel derivative is stored under `public/images/bastille-day/`, while `components/bastille-day/1/images.ts` retains the corresponding Commons description page so licensing and attribution remain reachable.
