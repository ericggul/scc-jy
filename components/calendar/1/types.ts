export type ProfileSex = "female" | "male";

export type LifeProfile = {
  id: string;
  name: string;
  sex: ProfileSex;
  birthDate: string;
  deathDate: string;
};

export type LifeEventKind = "birth" | "birthday" | "death" | "memorial";

export type LifeEventRule =
  | {
      type: "once";
      date: string;
    }
  | {
      type: "annual";
      month: number;
      day: number;
      startYear: number;
    };

export type LifeEventDefinition = {
  id: string;
  profileId: string;
  kind: LifeEventKind;
  rule: LifeEventRule;
};

export type MaterializedLifeEvent = {
  id: string;
  profileId: string;
  name: string;
  kind: LifeEventKind;
  date: string;
};

export type CalendarViewport = {
  row: number;
  column: number;
  rows: number;
  columns: number;
};

export type CalendarSelection = {
  experimentId: "calendar";
  variantId: "1";
  profileIds: string[];
  viewport: CalendarViewport;
  revision: number;
  sentAt: number;
};
