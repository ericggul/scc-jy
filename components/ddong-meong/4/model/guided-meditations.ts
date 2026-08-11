import { celebrityApplauseScript } from "./scripts/celebrity-applause";
import { emergencyChillScript } from "./scripts/emergency-chill";
import { morningUrgentScript } from "./scripts/morning-urgent";
import { constipationDialogueScript } from "./scripts/constipation-dialogue";
import { thickPoopImaginationScript } from "./scripts/thick-poop-imagination";

export const guidedMeditations = [
  {
    slug: "morning-urgent",
    title: "모닝똥이 급한데",
    description: "출근 전, 아이스커피와 사원증을 두고 뛰어든 아침 4분 33초.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/4/meditations/morning-urgent.png",
    lines: morningUrgentScript,
  },
  {
    slug: "emergency-chill",
    title: "급똥 싸고 칠링하기",
    description: "한 칸을 발견한 직후, 몸과 화장실이 맺는 평화협정.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/4/meditations/emergency-chill.png",
    lines: emergencyChillScript,
  },
  {
    slug: "celebrity-applause",
    title: "유명해지면 똥을 싸도 박수쳐준다",
    description: "플래시 세례를 상상하며 혼자 치는 가장 사적인 박수.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/4/meditations/celebrity-applause.png",
    lines: celebrityApplauseScript,
  },
  {
    slug: "thick-poop-imagination",
    title: "굵은 똥이 나오는 상상",
    description: "아직 나오지 않은 오늘의 거대한 후보를 기다리는 시간.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/4/meditations/thick-poop-imagination.png",
    lines: thickPoopImaginationScript,
  },
  {
    slug: "constipation-dialogue",
    title: "변비와의 긴 대화",
    description: "자두 주스와 천장 타일이 참관하는 아주 느린 협상.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/ddong-meong/4/meditations/constipation-dialogue.png",
    lines: constipationDialogueScript,
  },
] as const;

export type GuidedMeditationSlug =
  (typeof guidedMeditations)[number]["slug"];

export function findGuidedMeditation(slug: GuidedMeditationSlug) {
  return guidedMeditations.find((meditation) => meditation.slug === slug)!;
}
