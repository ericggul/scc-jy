export type DdongDitationRole = "mobile" | "screen";

export type DdongDitationPhase =
  | "arriving"
  | "breathing"
  | "releasing"
  | "complete";

export type DdongDitationSession = {
  id: string;
  participantId: string;
  startedAt: number;
  updatedAt: number;
  phase: Exclude<DdongDitationPhase, "complete">;
  cycleCount: number;
};

export type DdongDitationArchiveEntry = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  cycleCount: number;
  outcome: "completed" | "left";
};

export type DdongDitationPresence = {
  experimentId: "ddong-ditation-2";
  variantId: "2";
  total: number;
  mobiles: number;
  screens: number;
  serverTime: number;
};

export type DdongDitationSnapshot = {
  activeSessions: DdongDitationSession[];
  archive: DdongDitationArchiveEntry[];
  presence: DdongDitationPresence;
};
