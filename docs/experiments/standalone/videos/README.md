# Videos

`videos` is a standalone family of full-viewport media fields. Every cell keeps
a mobile-video `9:16` frame while the field changes the number, scale, source,
playback rate, and phase of those cells.

## Artwork and interface contract

### Participant situation

A participant encounters one installation-scale screen, ideally `1920 × 1080`,
filled by a collection of portrait moving-image fragments. This first family is
observational rather than controller-driven.

### Primary parameter

The primary parameter is temporal difference: each cell has an independent
`playbackRate` and normalized starting `phase`.

### Perceptual job

The participant should perceive repetition as unstable. The same clip can
briefly align, drift apart, and form accidental rhythms; mixed clips turn that
temporal field into an aggregation of meme, hype, and digital-culture gestures.

### Interaction job

There is no visible interaction in this experiment. Browser visibility is
the only lifecycle input: hidden pages pause playback and visible pages resume
it. Controls or a live parameter source can be added later without changing the
cell renderer.

### Wrapper justification

The portrait grid is not a themed social-media dashboard. `9:16` is the
recognizable material format of contemporary mobile video, while the removal of
feed chrome, authorship labels, engagement counts, ranking, and scrolling
isolates aggregation and temporal circulation as the artwork's operation.

### System family

The experiment uses:

- a full-viewport field with no explanatory chrome;
- exact `9:16` cells using `object-fit: cover`;
- local, silent, looping media;
- stable cell IDs;
- one reusable renderer driven by a variant registry;
- no captions, badges, simulated live state, or ornamental interface elements.

### Removal test

Only the cells and the empty field around them remain. Removing the cells,
portrait ratio, or rate/phase difference would remove the work's perceptible
relation. Text, controls, borders, metadata, and navigation are absent because
they are unnecessary inside an active variant.

## Structure

```text
app/(standalone)/videos/
  page.tsx
  [experiment]/page.tsx

components/standalone/videos/
  experiments.ts
  model/
    field.ts
    media.ts
  media/
    index.ts
    video-cell.tsx
  screen/
    index.tsx
    video-field.module.css
```

`experiments.ts` is the main editing surface. A variant specifies:

- `columns` and `rows`;
- `gap` and `background`;
- cell `count`;
- the sequence of media sources;
- the playback-rate sequence;
- `phaseStep`, which distributes starting positions through each clip.

`model/media.ts` is the media manifest. The renderer also accepts an image
record with `kind: "image"`, so still images can enter the same field without a
new component.

## Registered experiment

- `/videos/1`: 80 mixed clips in a gapless `16 × 5` field with broad rate and
  phase variation.

The grid uses cover sizing rather than contain sizing. Its width is the larger
of the viewport width and the width required to cover the viewport height. It
therefore fills every responsive viewport without exposing empty space on any
edge; when the viewport and grid ratios differ, the centered outer portion of
the grid is cropped. Cells remain exact portrait frames at every resolution.

## Performance diagnosis

The experiment now uses 80 independently timed cells to fill the installation
display. Multiple independently timed videos have a real cost. Different
playback rates require independent `HTMLVideoElement` playback pipelines even
when several cells share the same URL; browser caching saves network transfer,
not necessarily decode work.

The local test clips are deliberately:

- H.264 MP4 for broad hardware-decoding support;
- `360 × 640`, matching the displayed portrait ratio;
- 24 fps;
- silent;
- 2.5–12 seconds long;
- approximately 28 KB–567 KB each, 1.39 MB total.

The implementation also uses `preload="metadata"`, muted inline autoplay, and
pauses videos when the document is hidden. It does not draw every cell through
an additional animation-frame canvas loop.

Practical limits still depend on the exact computer, browser, codec hardware,
and display pipeline. Eighty simultaneous playback elements are substantially
more demanding than the earlier 24-cell ceiling and must be measured on the
installation machine before performance can be guaranteed. If it is too heavy,
the next architecture should be a small number of decoded videos composited
through WebGL/WebGPU. That approach is especially appropriate when repeated
cells may share time; it is less straightforward when every cell needs a
genuinely independent playback head.

No browser performance claim is made from static inspection alone. Repository
rules prohibit runtime browser checks unless explicitly requested.

## Local test-media ledger

The files below were sourced from Wikimedia Commons on 2026-07-25 and converted
to silent `360 × 640`, 24 fps H.264 MP4 test derivatives. Landscape sources are
center-cropped to the portrait frame. The source pages remain the authority for
attribution and license terms.

| Local file | Source and author | License | Conversion |
| --- | --- | --- | --- |
| `67-dance.mp4` | [67 dance](https://commons.wikimedia.org/wiki/File:67_dance.webm), RowanJ LP | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Full 2.54 s clip, scaled to portrait |
| `facepalm.mp4` | [Facepalm](https://commons.wikimedia.org/wiki/File:Facepalm.webm), Rattyexalt | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Full source, center-cropped |
| `youtube-poop.mp4` | [YouTube Poop – Guns Fucking Rule!](https://commons.wikimedia.org/wiki/File:YouTube_Poop_-_Guns_Fucking_Rule!.webm), RockosModernLifeFan848 | Public domain per source page | First 12 s, center-cropped |
| `cat-jump.mp4` | [Cat jumping backwards](https://commons.wikimedia.org/wiki/File:Cat_jumping_backwards.webm), Mary Qin | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | First 12 s, center-cropped |
| `cat-on-bed.mp4` | [Cat-on-bed](https://commons.wikimedia.org/wiki/File:Cat-on-bed.webm), Sora/OpenAI | Public domain per source page; marked AI-generated | Full 8.54 s source, center-cropped |

The CC BY-SA derivatives must retain attribution and ShareAlike terms when
redistributed. These files are testing material, not a final curatorial claim.
Replace or expand them through `model/media.ts` after checking rights,
provenance, and the conceptual role of each clip.
