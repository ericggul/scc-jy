export type ConnectionButtonRecord = {
  id: string;
  memberNumber: number;
  tone: number;
  treatment: "outline" | "solid";
};

export function getConnectionButtonRecords(
  count: number,
): readonly ConnectionButtonRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `connection-button-${index + 1}`,
    memberNumber: index + 1,
    tone: index % 10,
    treatment: index % 2 === 0 ? "outline" : "solid",
  }));
}
