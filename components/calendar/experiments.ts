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

export const calendarDirectRoutes = ["default", "1"] as const;
export type CalendarDirectRoute = (typeof calendarDirectRoutes)[number];

export function isCalendarDirectRoute(value: string): value is CalendarDirectRoute {
  return calendarDirectRoutes.some((route) => route === value);
}
