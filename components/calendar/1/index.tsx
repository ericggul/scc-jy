"use client";

import { useMemo, useState } from "react";
import { calendarEvents, type CalendarEvent } from "./data";

type CalendarDay = {
  id: string;
  isoDate: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});
const initialToday = new Date(2026, 6, 9);

const eventToneClasses: Record<CalendarEvent["tone"], string> = {
  amber: "border-[#e8b13f] bg-[#fff8df] text-[#7a4d00]",
  blue: "border-[#4f8df6] bg-[#eef5ff] text-[#174ea6]",
  green: "border-[#50a46f] bg-[#effaf3] text-[#137333]",
  ink: "border-[#222222] bg-[#f3f4f4] text-[#202124]",
  rose: "border-[#e67b90] bg-[#fff1f4] text-[#9b243d]",
  violet: "border-[#9871f2] bg-[#f5f0ff] text-[#5f3dc4]",
};

const darkEventToneClasses: Record<CalendarEvent["tone"], string> = {
  amber: "border-[#a46d00] bg-[#2b220d] text-[#ffd36a]",
  blue: "border-[#2f66c8] bg-[#101b2c] text-[#8ab4f8]",
  green: "border-[#2e7d4f] bg-[#102118] text-[#81c995]",
  ink: "border-[#5f6368] bg-[#202124] text-[#e8eaed]",
  rose: "border-[#9e4051] bg-[#2b141a] text-[#f6a4b5]",
  violet: "border-[#6f55c9] bg-[#1e1831] text-[#c3b4ff]",
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDays(monthDate: Date, today: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());
  const todayIso = toIsoDate(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const isoDate = toIsoDate(date);

    return {
      id: `day-${isoDate}`,
      isoDate,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: isoDate === todayIso,
    };
  });
}

function getEventsByDate(events: readonly CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((dates, event) => {
    dates[event.date] = [...(dates[event.date] ?? []), event];
    return dates;
  }, {});
}

function IconButton({
  label,
  children,
  onClick,
  isDark,
}: {
  label: string;
  children: string;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-full border text-lg leading-none transition active:scale-95 ${
        isDark
          ? "border-[#3c4043] text-[#e8eaed] hover:bg-[#202124]"
          : "border-[#dadce0] text-[#3c4043] hover:bg-[#f8fafd]"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function CalendarOne() {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialToday.getFullYear(), initialToday.getMonth(), 1),
  );
  const [isDark, setIsDark] = useState(false);
  const eventsByDate = useMemo(() => getEventsByDate(calendarEvents), []);
  const monthDays = useMemo(
    () => getMonthDays(visibleMonth, initialToday),
    [visibleMonth],
  );
  const activeMonthLabel = monthFormatter.format(visibleMonth);
  const activeEventToneClasses = isDark ? darkEventToneClasses : eventToneClasses;

  function goToMonth(offset: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function resetToToday() {
    setVisibleMonth(new Date(initialToday.getFullYear(), initialToday.getMonth(), 1));
  }

  return (
    <main
      className={`h-dvh overflow-hidden ${
        isDark ? "bg-[#0f1115] text-[#e8eaed]" : "bg-white text-[#202124]"
      }`}
    >
      <div className="flex h-full flex-col">
        <header
          className={`flex min-h-16 items-center justify-between gap-3 border-b px-3 py-3 sm:px-5 ${
            isDark ? "border-[#2b2f36]" : "border-[#dadce0]"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isDark
                  ? "border-[#3c4043] text-[#e8eaed] hover:bg-[#202124]"
                  : "border-[#dadce0] text-[#3c4043] hover:bg-[#f8fafd]"
              }`}
              onClick={resetToToday}
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <IconButton
                isDark={isDark}
                label="Previous month"
                onClick={() => goToMonth(-1)}
              >
                {"<"}
              </IconButton>
              <IconButton
                isDark={isDark}
                label="Next month"
                onClick={() => goToMonth(1)}
              >
                {">"}
              </IconButton>
            </div>
          </div>

          <h1
            className={`truncate text-[clamp(20px,4vw,32px)] font-normal leading-tight tracking-normal ${
              isDark ? "text-[#e8eaed]" : "text-[#3c4043]"
            }`}
          >
            {activeMonthLabel}
          </h1>

          <button
            type="button"
            aria-label="Toggle dark mode"
            aria-pressed={isDark}
            className={`relative h-8 w-14 rounded-full border transition ${
              isDark
                ? "border-[#5f6368] bg-[#202124]"
                : "border-[#dadce0] bg-[#f8fafd]"
            }`}
            onClick={() => setIsDark((current) => !current)}
          >
            <span
              className={`absolute top-1 grid h-6 w-6 place-items-center rounded-full transition ${
                isDark
                  ? "left-7 bg-[#8ab4f8]"
                  : "left-1 bg-white shadow-[0_1px_4px_rgba(60,64,67,0.32)]"
              }`}
            />
          </button>
        </header>

        <section className="grid min-h-0 flex-1 grid-rows-[auto_1fr]">
          <div
            className={`grid grid-cols-7 border-b ${
              isDark ? "border-[#2b2f36] bg-[#0f1115]" : "border-[#dadce0] bg-white"
            }`}
          >
            {weekdayLabels.map((weekday) => (
              <div
                key={`weekday-${weekday}`}
                className={`px-1 py-2 text-center text-[11px] font-medium uppercase tracking-normal sm:text-xs ${
                  isDark ? "text-[#9aa0a6]" : "text-[#5f6368]"
                }`}
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid min-h-0 grid-cols-7 grid-rows-6">
            {monthDays.map((day) => {
              const dayEvents = eventsByDate[day.isoDate] ?? [];

              return (
                <article
                  key={day.id}
                  className={`min-h-0 border-b border-r p-1.5 sm:p-2 ${
                    isDark ? "border-[#252a31]" : "border-[#e8eaed]"
                  } ${
                    day.isCurrentMonth
                      ? isDark
                        ? "bg-[#0f1115]"
                        : "bg-white"
                      : isDark
                        ? "bg-[#13171d]"
                        : "bg-[#fafafa]"
                  }`}
                >
                  <div className="mb-1 flex justify-center sm:justify-start">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-sm leading-none ${
                        day.isToday
                          ? "bg-[#1a73e8] font-medium text-white"
                          : day.isCurrentMonth
                            ? isDark
                              ? "text-[#e8eaed]"
                              : "text-[#3c4043]"
                            : isDark
                              ? "text-[#6f747d]"
                              : "text-[#9aa0a6]"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  <div className="grid gap-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`min-w-0 rounded border px-1.5 py-1 text-[10px] leading-tight sm:text-xs ${activeEventToneClasses[event.tone]}`}
                      >
                        <span className="hidden font-medium sm:inline">
                          {event.time}{" "}
                        </span>
                        <span className="block truncate sm:inline">
                          {event.title}
                        </span>
                      </div>
                    ))}
                    {dayEvents.length > 3 ? (
                      <div
                        className={`truncate px-1.5 text-[10px] leading-tight sm:text-xs ${
                          isDark ? "text-[#9aa0a6]" : "text-[#5f6368]"
                        }`}
                      >
                        +{dayEvents.length - 3} more
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
