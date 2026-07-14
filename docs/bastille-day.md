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

## Experiment 2

- **Participant situation:** A visitor encounters two simultaneous 20 ms image sequences spanning overlapping two-thirds of a full-height viewport.
- **Primary relation:** 85 images of national celebration and revolutionary memory on the left are placed against 77 images of contemporary social tension on the right.
- **Perceptual job:** Notice the unresolved simultaneity between national mythology and present-day conflict without captions steering each individual image.
- **Interaction job:** A minimal French intro remains visible while both image pools decode at least eight local images. Once ready, selecting `Entrer` removes the intro and starts both image sequences and the looping background audio in the same user gesture. A top-right `Pause` / `Reprendre` control freezes and resumes both canvases and the audio at their current positions. No image or file is clickable.
- **Wrapper justification:** The left sequence is anchored to the left edge at two-thirds viewport width and the right sequence is anchored to the right edge at two-thirds viewport width. Their shared central third is produced by `mix-blend-mode: difference`; a black isolated stage keeps the non-overlapping right third visually unaltered.
- **Loading rule:** Each side decodes local images sequentially and adds only successful decodes to its animation pool. The previous frame stays painted until the next decoded image is drawn.
- **Source ledger:** `good-sources.json` records the 25-image supplement to experiment 1’s 60-image pool. `dark-sources.json` records 77 images across Gilets jaunes, pensions, SNCF and RER strikes, sanitation strikes, Calais migration conditions, 2023 urban unrest, homelessness, heat and air-conditioning, fires, floods, police–protester conflict, 2025 mobilizations, public hospitals, and Paris migrant camps. Every record retains its French search phrase and Commons source page.
