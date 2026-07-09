export const calendarExperiments = [
  { slug: "1", label: "calendar/1" },
] as const;

export type CalendarExperimentSlug =
  (typeof calendarExperiments)[number]["slug"];

export function isCalendarExperimentSlug(
  value: string,
): value is CalendarExperimentSlug {
  return calendarExperiments.some((experiment) => experiment.slug === value);
}
