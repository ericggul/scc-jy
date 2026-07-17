# Swarm experiment

Routes: `/swarm/1`, `/swarm/2`, `/swarm/3`, `/swarm/4`, and `/swarm/5`, registered through the shared swarm experiment registry.

Variants:

- `/swarm/1`: neutral movement field.
- `/swarm/2`: the same field and interaction, with a full-viewport coastline map and curved latitude/longitude graticule defining the swarm's entire movement space as the world.
- `/swarm/3`: the world field becomes a launch field. Every valid map click is a missile origin: it sends a twenty-missile salvo toward twenty distinct, randomly selected countries, while the immigrant flock treats every origin as a persistent local danger and steers away from it.
- `/swarm/4`: a 200-cursor field with larger marks and cells around persistently selected forbidden cells.
- `/swarm/5`: the denser 1000-cursor, half-scale counterpart of `swarm/4`.

## Interface premise

1. **Participant situation:** one person observes a self-organising flock on a single screen and can alter its local rules.
2. **Primary parameter:** the relative strength of separation, alignment, and cohesion.
3. **Perceptual job:** notice how a small change in one local rule changes the flock's collective direction and density.
4. **Interaction job:** adjust any rule and form an expectation about the resulting motion; every field click adds a persistent attention target. Stable boid IDs distribute the flock evenly across all targets, allowing the swarm to split across several locations until the points are cleared.
5. **Wrapper justification:** an uninterrupted field makes positions, headings, neighbourhoods, and emergent paths legible without translating them into charts or metrics.
6. **System family:** neutral paper, dark linework, plain language, hairline controls, and no simulated system metadata.
7. **Removal test:** the title sentence can be removed without losing operation. The field, boids, three rule controls, pause, and reset cannot.

## Visual direction

- Palette: paper `#f0f1ec`, ink `#181916`, quiet ink `#74756e`.
- Type: Arial carries the compact functional controls; no title or explanatory overlay occupies the simulation field.
- Layout: the simulation occupies the viewport. The three rules live in a bottom control panel that is collapsed by default.
- Signature: each boid is a two-stroke open mark. Their fading paths make collective turns visible without adding a separate visualization.

The implementation follows the reference model's three local rules—separation, alignment, and cohesion—and keeps each boid's stable identity in the model layer. Five hundred boids use a perception-radius spatial hash for local neighbour lookup and render as one batched canvas path per frame.

`swarm/2` uses Natural Earth 1:110m public-domain land and country GeoJSON. Coastlines, the closed world outline, and graticule share one Robinson projection and are fit to the viewport without changing the projection's aspect ratio. The projection outline is also the simulation boundary: boids are corrected back to the nearest edge and their outward velocity is reflected inward, while clicks beyond the outline are ignored. The 100 largest countries by estimated population retain their ISO ID, name, label longitude/latitude, and polygon geometry. Every attention point resolves and stores its country identity when it is created, ready for a later country-facing interface.

Country clicks activate a `M×GA` campaign derived from the country's slogan keyword—for example `MAGA`, `MKGA`, or `MEGA`. Ocean clicks activate `MFGA`, “Make Fishes Great Again.” Only the four-letter campaign code is centered horizontally and vertically on its exact attention coordinate, with no dot marker. The unlabeled campaign ledger occupies a shallow three-column strip at the bottom. Every campaign fits on one row—code, full name, and assigned `immigrants` count—and repeated clicks are grouped by campaign. `swarm/2` owns its model, map, styles, and interaction component independently; these features do not enter the `swarm/1` module graph.

Each of the 177 countries plus the ocean campaign has a dedicated mono AAC/M4A voice file under `public/audio/swarm-campaigns/`. Clicking a campaign point stops the previous voice and immediately plays its corresponding “Make ___ Great Again” recording. The generated manifest records the voice, campaign identity, path, and encoded byte size; the generator is retained at `scripts/generate-swarm-campaign-audio.mjs` for deterministic regeneration.

## Swarm/3 interface premise

1. **Participant situation:** one person marks a location on a world map and observes a rapid outward salvo alongside the collective movement it displaces.
2. **Primary parameter:** the launch origin's position, which is simultaneously the source of twenty directed trajectories and a repulsion field for the flock.
3. **Perceptual job:** make the relation between a local act, geographically distributed destinations, and nearby collective avoidance immediately visible.
4. **Interaction job:** click anywhere inside the Robinson world outline to create a launch. A land click excludes the origin country from the twenty distinct destinations; an ocean click draws from all countries. `clear launches` removes both the visible origins and their avoidance fields.
5. **Wrapper justification:** the established full-world field is retained because source, destination, path, and avoidance need a common spatial surface; the muted rust trajectory is reserved for the new directed act, while the swarm remains the existing open dark mark.
6. **System family:** the paper ground, line map, viewport canvas, three swarm controls, pause/reset actions, and compact hairline panel are shared with `swarm/2`; there are no dashboards, campaign metadata, labels, or destination lists competing with the map.
7. **Removal test:** the launch crosshair, arrival impact burst, persistent destroyed-target mark, directed trajectories, and the flock's origin avoidance are necessary. Country labels, counts, a target ledger, impact statistics, and simulated command metadata are omitted because they would not make the interaction more legible.

## Swarm/4 interface premise

1. **Participant situation:** one person encounters a full-screen field and designates multiple locations by clicking or press-dragging through them.
2. **Primary parameter:** the persistent set of selected grid cells, each represented only by a high-contrast fill; in `swarm/4`, cursor count and inter-cursor collision prevention are direct secondary parameters.
3. **Perceptual job:** notice cursor groups tightening around every selected cell while each selected square remains empty, compare the field's density with and without enforced cursor spacing, and view the same relations against light or dark contrast.
4. **Interaction job:** every click adds another implied cell without removing prior selections; press-drag selects every crossed cell as one continuous trace. Stable cursor IDs distribute the groups across the complete target list. Enter or Space adds the central cell, and Escape clears every selection. Both variants begin in dark mode and have a persistent bottom theme toggle; `swarm/4` also changes cursor count in 50-agent steps and toggles only cursor-to-cursor collision prevention.
5. **Wrapper justification:** small plus marks make the discrete cells perceptible without turning the surface into a drawn grid. A single hairline bottom bar gives the directly manipulable parameters a stable place without obscuring the field. Dark mode inverts paper, cursor, grid, and selected-cell contrast together; black-cell exclusion remains a hard spatial constraint in either collision mode.
6. **System family:** full-viewport field, neutral paper, dark marks, canvas motion, and direct clicking remain shared with the other swarm experiments.
7. **Removal test:** visible grid lines, labels, and legends are absent because none help locate or operate the selected cells. The cross marks, cursor agents, selected cells, exclusion constraint, and the bottom parameter controls remain necessary.

`swarm/4` uses 200 stable cursor-agent IDs, 40–60px cells, full-scale cursor glyphs, a 16px cursor-spacing target, and a 6px black-cell exclusion clearance. It starts in dark mode; its bottom bar starts with cursor-to-cursor collision prevention off, can toggle it on, can change the active count from 50 to 1000 in 50-agent steps, and can switch to light mode. `swarm/5` also starts in dark mode, keeps collision prevention on, and uses 1000 IDs, 20–30px cells, half-scale glyphs, an 8px spacing target, and a 3px clearance; its bottom bar exposes the same theme toggle. Both variants use the same spatial-neighbour, separation, alignment, cohesion, edge, and arrival rules as `swarm/1` and `swarm/2`, changing only the glyph, density, and target boundary. Every selected cell is retained as an attention target; each cursor is assigned by `id % targetCount` and receives a moving perimeter destination around that cell. Each group fills outward perimeter bands, so a dense target remains legible rather than collapsing into one mark. The cursor glyph's arrow tip is rotated to the current velocity vector.

## Swarm/5 interface premise

`swarm/5` preserves `swarm/4`'s movement, cell-selection, and theme-control language, while omitting its density and collision controls. It exists only as the denser performance variant: the smaller cell and glyph scale maintain the same relative spacing while allowing one thousand cursor agents to remain distinct.
