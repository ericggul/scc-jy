import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import DdongMeongOneDummy from "@/components/ddong-meong/1/contents/dummy";
import {
  DownwardBreathMeditation as OneDownwardBreathMeditation,
  LettingGoMeditation as OneLettingGoMeditation,
  LighterMomentMeditation as OneLighterMomentMeditation,
  PrivateRoomMeditation as OnePrivateRoomMeditation,
  WaitingBodyMeditation as OneWaitingBodyMeditation,
} from "@/components/ddong-meong/1/contents/guided-reading";
import {
  meditationContents as oneMeditationContents,
  type MeditationContentSlug as OneMeditationContentSlug,
} from "@/components/ddong-meong/1/model/content-catalog";
import DdongMeongTwoDummy from "@/components/ddong-meong/2/contents/dummy";
import {
  DownwardBreathMeditation,
  LettingGoMeditation,
  LighterMomentMeditation,
  PrivateRoomMeditation,
  WaitingBodyMeditation,
} from "@/components/ddong-meong/2/contents/guided-reading";
import {
  meditationContents as twoMeditationContents,
  type MeditationContentSlug as TwoMeditationContentSlug,
} from "@/components/ddong-meong/2/model/content-catalog";
import DdongMeongThreeContent from "@/components/ddong-meong/3/mobile/content";
import { mobileMeditationContents as threeMeditationContents } from "@/components/ddong-meong/3/mobile/content/registry";

const oneContentComponents = {
  dummy: DdongMeongOneDummy,
  "letting-go": OneLettingGoMeditation,
  "waiting-body": OneWaitingBodyMeditation,
  "downward-breath": OneDownwardBreathMeditation,
  "private-room": OnePrivateRoomMeditation,
  "lighter-moment": OneLighterMomentMeditation,
} satisfies Record<OneMeditationContentSlug, ComponentType>;

const twoContentComponents = {
  dummy: DdongMeongTwoDummy,
  "letting-go": LettingGoMeditation,
  "waiting-body": WaitingBodyMeditation,
  "downward-breath": DownwardBreathMeditation,
  "private-room": PrivateRoomMeditation,
  "lighter-moment": LighterMomentMeditation,
} satisfies Record<TwoMeditationContentSlug, ComponentType>;

const contentRoutes = [
  ...oneMeditationContents.map((meditation) => ({
    experiment: "1" as const,
    meditation,
    Content: oneContentComponents[meditation.slug],
  })),
  ...twoMeditationContents.map((meditation) => ({
    experiment: "2" as const,
    meditation,
    Content: twoContentComponents[meditation.slug],
  })),
  ...threeMeditationContents.map((meditation) => ({
    experiment: "3" as const,
    meditation,
    Content: () => <DdongMeongThreeContent slug={meditation.slug} />,
  })),
];

function findContentRoute(experiment: string, content: string) {
  return contentRoutes.find(
    (route) =>
      route.experiment === experiment && route.meditation.slug === content,
  );
}

export function generateStaticParams() {
  return contentRoutes.map(({ experiment, meditation }) => ({
    experiment,
    content: meditation.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string; content: string }>;
}): Promise<Metadata> {
  const { experiment, content } = await params;
  const route = findContentRoute(experiment, content);

  if (!route) {
    return {};
  }

  return {
    title: `${route.meditation.title} — ddong-meong ${experiment}`,
    description: route.meditation.description,
  };
}

export default async function DdongMeongContentPage({
  params,
}: {
  params: Promise<{ experiment: string; content: string }>;
}) {
  const { experiment, content } = await params;
  const route = findContentRoute(experiment, content);

  if (!route) {
    notFound();
  }

  const MeditationContent = route.Content;
  return <MeditationContent />;
}
