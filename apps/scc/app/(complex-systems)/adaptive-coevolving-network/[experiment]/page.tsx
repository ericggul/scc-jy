import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import AdaptiveCoevolvingNetworkOne from "@/components/complex-systems/adaptive-coevolving-network/1";
import HumanRelations from "@/components/complex-systems/adaptive-coevolving-network/human-relations";
import PeerToPeerNetwork from "@/components/complex-systems/adaptive-coevolving-network/p2p";
import PollingEcology from "@/components/complex-systems/adaptive-coevolving-network/polling-ecology";
import {
  adaptiveCoevolvingNetworkExperiments,
  isAdaptiveCoevolvingNetworkExperimentSlug,
  type AdaptiveCoevolvingNetworkExperimentSlug,
} from "@/components/complex-systems/adaptive-coevolving-network/experiments";

const components: Record<AdaptiveCoevolvingNetworkExperimentSlug, ComponentType> = {
  "1": AdaptiveCoevolvingNetworkOne,
  "human-relations": HumanRelations,
  p2p: PeerToPeerNetwork,
  "polling-ecology": PollingEcology,
};

const descriptions: Record<AdaptiveCoevolvingNetworkExperimentSlug, string> = {
  "1": "A bounded-confidence network whose disagreement rewires its relations.",
  "human-relations": "A network of people and accounts whose trust and relations adapt together.",
  p2p: "A peer-to-peer network whose devices and communication links adapt together.",
  "polling-ecology": "A synthetic polling field where blue and white stance cells reproduce, switch, and decay through rotating issues.",
};

export function generateStaticParams() {
  return adaptiveCoevolvingNetworkExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `adaptive coevolving network: ${experiment}`,
    description: isAdaptiveCoevolvingNetworkExperimentSlug(experiment)
      ? descriptions[experiment]
      : "Adaptive coevolving network simulation.",
  };
}

export default async function AdaptiveCoevolvingNetworkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isAdaptiveCoevolvingNetworkExperimentSlug(experiment)) notFound();

  const Component = components[experiment];
  return <Component />;
}
