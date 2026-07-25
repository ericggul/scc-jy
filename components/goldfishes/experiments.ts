export const goldfishExperiments = [
  { href: "/goldfishes/2d/1", label: "goldfishes/2d/1" },
  { href: "/goldfishes/2d/2", label: "goldfishes/2d/2" },
  { href: "/goldfishes/3d/1", label: "goldfishes/3d/1" },
] as const;

export const goldfish2DExperiments = [
  { slug: "1", label: "goldfishes/2d/1" },
  { slug: "2", label: "goldfishes/2d/2" },
] as const;

export type Goldfish2DExperimentSlug =
  (typeof goldfish2DExperiments)[number]["slug"];

export function isGoldfish2DExperimentSlug(
  value: string,
): value is Goldfish2DExperimentSlug {
  return goldfish2DExperiments.some(
    (experiment) => experiment.slug === value,
  );
}

export const goldfish3DExperiments = [
  { slug: "1", label: "goldfishes/3d/1" },
] as const;

export type Goldfish3DExperimentSlug =
  (typeof goldfish3DExperiments)[number]["slug"];

export function isGoldfish3DExperimentSlug(
  value: string,
): value is Goldfish3DExperimentSlug {
  return goldfish3DExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
