import { guidedMeditations } from "./guided-meditations";

export const meditationContents = guidedMeditations.map(
  ({ slug, title, description, durationSeconds, imagePath }) => ({
    slug,
    title,
    description,
    durationSeconds,
    imagePath,
  }),
);

export type MeditationContentSlug =
  (typeof meditationContents)[number]["slug"];

export function isMeditationContentSlug(
  value: string,
): value is MeditationContentSlug {
  return meditationContents.some((content) => content.slug === value);
}

export function displayMeditationContentTitle(
  slug: string,
  serverTitle: string,
) {
  return (
    meditationContents.find((content) => content.slug === slug)?.title ??
    serverTitle
  );
}
