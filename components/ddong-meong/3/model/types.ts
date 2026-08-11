export type DdongMeongRole = "mobile" | "screen";

export type DdongMeongPhase =
  | "arriving"
  | "breathing"
  | "releasing"
  | "complete";

export type DdongMeongEngagementState = "active" | "paused" | "idle";

export type DdongMeongDisengagementSignal =
  | "hidden"
  | "visible"
  | "leaving";

export type DdongMeongSession = {
  contentSlug: string;
  contentTitle: string;
  engagement: DdongMeongEngagementState;
  id: string;
  interactionCount: number;
  nickname: string;
  participantId: string;
  pausedAt: number | null;
  pausedDurationMs: number;
  startedAt: number;
  updatedAt: number;
  phase: Exclude<DdongMeongPhase, "complete">;
};

export type DdongMeongSessionOutcome =
  | "completed"
  | "flushed"
  | "left"
  | "backgrounded"
  | "idle";

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
