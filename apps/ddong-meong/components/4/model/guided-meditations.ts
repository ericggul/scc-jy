import { beforeAfterPoopScript } from "./scripts/before-after-poop";
import { celebrityApplauseScript } from "./scripts/celebrity-applause";
import { emergencyChillScript } from "./scripts/emergency-chill";
import { morningUrgentScript } from "./scripts/morning-urgent";
import { constipationDialogueScript } from "./scripts/constipation-dialogue";
import { dogPoopRemedyScript } from "./scripts/dog-poop-remedy";
import { muddyDogHuskScript } from "./scripts/muddy-dog-husk";
import { thickPoopImaginationScript } from "./scripts/thick-poop-imagination";

export const guidedMeditations = [
  {
    slug: "morning-urgent",
    title: "모닝똥이 급한데",
    description: "출근 전, 아이스커피와 사원증을 두고 뛰어든 아침 4분 33초.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/4/meditations/morning-urgent.png",
    lines: morningUrgentScript,
  },
  {
    slug: "emergency-chill",
    title: "급똥 싸고 칠링하기",
    description: "한 칸을 발견한 직후, 몸과 화장실이 맺는 평화협정.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/4/meditations/emergency-chill.png",
    lines: emergencyChillScript,
  },
  {
    slug: "celebrity-applause",
    title: "유명해지면 똥을 싸도 박수쳐준다",
    description: "플래시 세례를 상상하며 혼자 치는 가장 사적인 박수.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/4/meditations/celebrity-applause.png",
    lines: celebrityApplauseScript,
  },
  {
    slug: "thick-poop-imagination",
    title: "굵은 똥이 나오는 상상",
    description: "아직 나오지 않은 오늘의 거대한 후보를 기다리는 시간.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/4/meditations/thick-poop-imagination.png",
    lines: thickPoopImaginationScript,
  },
  {
    slug: "constipation-dialogue",
    title: "변비와의 긴 대화",
    description: "자두 주스와 천장 타일이 참관하는 아주 느린 협상.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/4/meditations/constipation-dialogue.png",
    lines: constipationDialogueScript,
  },
  {
    slug: "dog-poop-remedy",
    title: "개똥도 약에 쓰려면 없다",
    description: "산책줄과 빈 갈색 병 앞에서, 꼭 필요한 것을 기다리는 시간.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/4/meditations/dog-poop-remedy.png",
    lines: dogPoopRemedyScript,
  },
  {
    slug: "before-after-poop",
    title: "똥 누러 갈 적 마음 다르고, 올 적 마음 다르다",
    description: "떨어진 가방과 가지런한 슬리퍼 사이, 급함이 평온으로 식는 순간.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/4/meditations/before-after-poop.png",
    lines: beforeAfterPoopScript,
  },
  {
    slug: "muddy-dog-husk",
    title: "똥 묻은 개가 겨 묻은 개 나무란다",
    description: "두 켤레의 슬리퍼와 거울 앞에서 남의 얼룩을 먼저 발견하는 시간.",
    durationSeconds: 4 * 60 + 33,
    imagePath: "/4/meditations/muddy-dog-husk.png",
    lines: muddyDogHuskScript,
  },
] as const;

export type GuidedMeditationSlug =
  (typeof guidedMeditations)[number]["slug"];

export function findGuidedMeditation(slug: GuidedMeditationSlug) {
  return guidedMeditations.find((meditation) => meditation.slug === slug)!;
}
