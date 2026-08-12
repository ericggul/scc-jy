export type DdongMeongRole = "mobile" | "screen";

export type DdongMeongPhase =
  | "arriving"
  | "breathing"
  | "releasing"
  | "complete";

export type DdongMeongSession = {
  id: string;
  participantId: string;
  startedAt: number;
  updatedAt: number;
  phase: Exclude<DdongMeongPhase, "complete">;
  cycleCount: number;
};

export type DdongMeongArchiveEntry = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  cycleCount: number;
  outcome: "completed" | "left";
};

export type DdongMeongPresence = {
  experimentId: "ddong-meong-2";
  variantId: "2";
  total: number;
  mobiles: number;
  screens: number;
  serverTime: number;
};

export type DdongMeongSnapshot = {
  activeSessions: DdongMeongSession[];
  archive: DdongMeongArchiveEntry[];
  presence: DdongMeongPresence;
};
