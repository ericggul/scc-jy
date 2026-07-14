# Swarm experiment

Route: `/swarm/1`, registered through the shared swarm experiment registry.

Variants:

- `/swarm/1`: neutral movement field.
- `/swarm/2`: the same field and interaction, with a full-viewport coastline map and curved latitude/longitude graticule defining the swarm's entire movement space as the world.

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
