import { meditationContents } from "../../model/content-catalog";
import { readingScript } from "../../model/reading-script";
import GradientShell from "../../surface/gradient-shell";
import { baselineAccumulationProfile } from "./organic-liquid-background/profiles";
import ReadingPage from "./reading-page";

const dummyContent = meditationContents[0];
const durationMs = dummyContent.durationSeconds * 1000;

export default function DummyMeditationContent() {
  return (
    <GradientShell>
      <ReadingPage
        accumulationProfile={baselineAccumulationProfile}
        lines={readingScript}
        totalMs={durationMs}
      />
    </GradientShell>
  );
}
