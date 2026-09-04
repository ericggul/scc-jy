export type SubscribeButtonRecord = {
  id: string;
  channelNumber: number;
};

export function getSubscribeButtonRecords(
  count: number,
): readonly SubscribeButtonRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `subscribe-button-${index + 1}`,
    channelNumber: index + 1,
  }));
}
