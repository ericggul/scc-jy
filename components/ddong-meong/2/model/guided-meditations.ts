import { downwardBreathScript } from "./scripts/downward-breath";
import { lettingGoScript } from "./scripts/letting-go";
import { lighterMomentScript } from "./scripts/lighter-moment";
import { privateRoomScript } from "./scripts/private-room";
import { waitingBodyScript } from "./scripts/waiting-body";

export const guidedMeditations = [
  {
    slug: "letting-go",
    title: "놓아보내는 연습",
    description: "힘으로 밀어내지 않고 몸의 움직임을 기다리는 명상.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/2/meditations/letting-go.jpg",
    lines: lettingGoScript,
  },
  {
    slug: "waiting-body",
    title: "기다리는 몸",
    description: "조급함을 내려놓고 몸이 선택한 속도에 머무는 명상.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/2/meditations/waiting-body.jpg",
    lines: waitingBodyScript,
  },
  {
    slug: "downward-breath",
    title: "아래로 흐르는 숨",
    description: "날숨을 따라 아랫배와 골반의 긴장을 이완하는 명상.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/2/meditations/downward-breath.jpg",
    lines: downwardBreathScript,
  },
  {
    slug: "private-room",
    title: "혼자 있는 방",
    description: "가까운 소리와 먼 소리 사이의 고요를 듣는 명상.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/2/meditations/private-room.jpg",
    lines: privateRoomScript,
  },
  {
    slug: "lighter-moment",
    title: "가벼워지는 순간",
    description: "몸 안의 작은 변화를 판단 없이 알아차리는 명상.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/2/meditations/lighter-moment.jpg",
    lines: lighterMomentScript,
  },
] as const;

export type GuidedMeditationSlug =
  (typeof guidedMeditations)[number]["slug"];

export function findGuidedMeditation(slug: GuidedMeditationSlug) {
  return guidedMeditations.find((meditation) => meditation.slug === slug)!;
}
