import { guidedMeditations } from "./guided-meditations";

export const meditationContents = [
  {
    slug: "dummy",
    title: "보내는 연습",
    description: "몸의 긴장을 내려놓고 천천히 보내는 명상.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/1/misty-lake.jpg",
  },
  ...guidedMeditations.map(
    ({ slug, title, description, durationSeconds, imagePath }) => ({
      slug,
      title,
      description,
      durationSeconds,
      imagePath,
    }),
  ),
] as const;

export type MeditationContentSlug =
  (typeof meditationContents)[number]["slug"];

export function isMeditationContentSlug(
  value: string,
): value is MeditationContentSlug {
  return meditationContents.some((content) => content.slug === value);
}
