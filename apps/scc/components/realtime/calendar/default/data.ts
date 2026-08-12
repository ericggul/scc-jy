export type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  time: string;
  tone: "blue" | "green" | "amber" | "violet" | "rose" | "ink";
};

export const calendarEvents: readonly CalendarEvent[] = [
  {
    id: "event-product-review",
    date: "2026-07-02",
    title: "Product review",
    time: "10:00",
    tone: "blue",
  },
  {
    id: "event-studio-sync",
    date: "2026-07-06",
    title: "Studio sync",
    time: "09:30",
    tone: "green",
  },
  {
    id: "event-design-crit",
    date: "2026-07-08",
    title: "Design crit",
    time: "14:00",
    tone: "violet",
  },
  {
    id: "event-launch-notes",
    date: "2026-07-09",
    title: "Launch notes",
    time: "11:00",
    tone: "ink",
  },
  {
    id: "event-calendar-pass",
    date: "2026-07-09",
    title: "Calendar pass",
    time: "16:30",
    tone: "blue",
  },
  {
    id: "event-roadmap",
    date: "2026-07-13",
    title: "Roadmap",
    time: "13:00",
    tone: "amber",
  },
  {
    id: "event-office-hours",
    date: "2026-07-15",
    title: "Office hours",
    time: "12:00",
    tone: "green",
  },
  {
    id: "event-prototype",
    date: "2026-07-17",
    title: "Prototype",
    time: "15:00",
    tone: "rose",
  },
  {
    id: "event-research",
    date: "2026-07-21",
    title: "Research review",
    time: "10:30",
    tone: "violet",
  },
  {
    id: "event-finance",
    date: "2026-07-24",
    title: "Finance",
    time: "09:00",
    tone: "amber",
  },
  {
    id: "event-planning",
    date: "2026-07-28",
    title: "Planning",
    time: "14:30",
    tone: "blue",
  },
  {
    id: "event-retro",
    date: "2026-07-31",
    title: "Retro",
    time: "16:00",
    tone: "ink",
  },
];
