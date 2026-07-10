import type {
  LifeEventDefinition,
  LifeEventKind,
  LifeProfile,
  MaterializedLifeEvent,
} from "./types";

export const displayedLifeEventKinds: readonly LifeEventKind[] = [
  "birth",
  "birthday",
  "death",
];

function dateParts(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

function dateToOrdinal(isoDate: string) {
  const { year, month, day } = dateParts(isoDate);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function annualDate(year: number, month: number, day: number) {
  const actualDay = month === 2 && day === 29
    ? new Date(Date.UTC(year, 2, 0)).getUTCDate()
    : day;

  return `${year}-${String(month).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
}

export function createLifeEventDefinitions(
  profiles: readonly LifeProfile[],
): LifeEventDefinition[] {
  return profiles.flatMap((profile) => {
    const birth = dateParts(profile.birthDate);
    const death = dateParts(profile.deathDate);

    return [
      {
        id: `${profile.id}:birth`,
        profileId: profile.id,
        kind: "birth",
        rule: { type: "once", date: profile.birthDate },
      },
      {
        id: `${profile.id}:birthday`,
        profileId: profile.id,
        kind: "birthday",
        rule: {
          type: "annual",
          month: birth.month,
          day: birth.day,
          startYear: birth.year + 1,
        },
      },
      {
        id: `${profile.id}:death`,
        profileId: profile.id,
        kind: "death",
        rule: { type: "once", date: profile.deathDate },
      },
      {
        id: `${profile.id}:memorial`,
        profileId: profile.id,
        kind: "memorial",
        rule: {
          type: "annual",
          month: death.month,
          day: death.day,
          startYear: death.year + 1,
        },
      },
    ] satisfies LifeEventDefinition[];
  });
}

export class LifeEventStore {
  readonly definitions: readonly LifeEventDefinition[];
  private readonly byProfileId: ReadonlyMap<string, readonly LifeEventDefinition[]>;
  private readonly profilesById: ReadonlyMap<string, LifeProfile>;

  constructor(
    definitions: readonly LifeEventDefinition[],
    profiles: readonly LifeProfile[],
  ) {
    this.definitions = definitions;
    this.profilesById = new Map(
      profiles.map((profile) => [profile.id, profile] as const),
    );
    const index = new Map<string, LifeEventDefinition[]>();

    for (const definition of definitions) {
      index.set(definition.profileId, [
        ...(index.get(definition.profileId) ?? []),
        definition,
      ]);
    }

    this.byProfileId = index;
  }

  materialize({
    profileIds,
    startDate,
    endDate,
    kinds = displayedLifeEventKinds,
  }: {
    profileIds: readonly string[];
    startDate: string;
    endDate: string;
    kinds?: readonly LifeEventKind[];
  }): MaterializedLifeEvent[] {
    const startOrdinal = dateToOrdinal(startDate);
    const endOrdinal = dateToOrdinal(endDate);
    const allowedKinds = new Set(kinds);
    const events: MaterializedLifeEvent[] = [];

    for (const profileId of profileIds) {
      const profile = this.profilesById.get(profileId);
      if (!profile) continue;

      for (const definition of this.byProfileId.get(profileId) ?? []) {
        if (!allowedKinds.has(definition.kind)) continue;

        if (definition.rule.type === "once") {
          const ordinal = dateToOrdinal(definition.rule.date);
          if (ordinal < startOrdinal || ordinal > endOrdinal) continue;
          events.push({
            id: definition.id,
            profileId,
            name: profile.name,
            kind: definition.kind,
            date: definition.rule.date,
          });
          continue;
        }

        const startYear = dateParts(startDate).year;
        const endYear = dateParts(endDate).year;

        for (let year = Math.max(startYear, definition.rule.startYear); year <= endYear; year += 1) {
          const date = annualDate(year, definition.rule.month, definition.rule.day);
          const ordinal = dateToOrdinal(date);
          if (ordinal < startOrdinal || ordinal > endOrdinal) continue;
          events.push({
            id: `${definition.id}:${year}`,
            profileId,
            name: profile.name,
            kind: definition.kind,
            date,
          });
        }
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }
}
