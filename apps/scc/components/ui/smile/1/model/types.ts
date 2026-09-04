export type SmileResponse = "satisfied" | "neutral" | "dissatisfied";

export type SmileVote = {
  id: string;
  response: SmileResponse;
  label: string;
};

export type SmileAutomaton = Readonly<{
  columns: number;
  rows: number;
  cells: Uint8Array;
  generation: number;
  randomState: number;
}>;
