export type DdongMeongRole = "mobile" | "screen";

export type DdongMeongPhase =
  | "arriving"
  | "breathing"
  | "releasing"
  | "complete";

export type DdongMeongSession = {
  contentSlug: string;
  contentTitle: string;
  id: string;
  interactionCount: number;
  nickname: string;
  participantId: string;
  startedAt: number;
  updatedAt: number;
  phase: Exclude<DdongMeongPhase, "complete">;
};

export type DdongMeongSessionOutcome = "completed" | "flushed" | "left";

export type DdongMeongArchiveEntry = {
  contentSlug: string;
  contentTitle: string;
  dayKey: string;
  id: string;
  interactionCount: number;
  nickname: string;
  participantId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  outcome: DdongMeongSessionOutcome;
};

export type DdongMeongPresence = {
  experimentId: "ddong-meong-3";
  variantId: "3";
  total: number;
  mobiles: number;
  screens: number;
  serverTime: number;
};

export type DdongMeongSnapshot = {
  activeSessions: DdongMeongSession[];
  archive: DdongMeongArchiveEntry[];
  presence: DdongMeongPresence;
  today: {
    completedSessions: number;
    dayKey: string;
    participantCount: number;
  };
};
