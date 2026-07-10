import { mythicMarketingPhrases } from "@/components/macos/copy";
import {
  appleMenuEntries,
  createBrandMenuEntries,
  createWordMenuEntries,
  type MenuDefinition,
} from "./menu-data";

const rowAssignments = [
  { id: "northstar", brand: "Northstar", phraseId: "already-are" },
  { id: "daylight", brand: "Daylight", phraseId: "future-within" },
  { id: "pilot", brand: "Pilot", phraseId: "whats-next" },
  { id: "summit", brand: "Summit", phraseId: "beyond-limits" },
  { id: "canvas", brand: "Canvas", phraseId: "everything-possible" },
  { id: "tomorrow", brand: "Tomorrow", phraseId: "own-tomorrow" },
  { id: "luma", brand: "Luma", phraseId: "invisible-visible" },
  { id: "assembly", brand: "Assembly", phraseId: "you-revolution" },
  { id: "orbit", brand: "Orbit", phraseId: "infinite-potential" },
  { id: "switch", brand: "Switch", phraseId: "changes-everything" },
  { id: "timeline", brand: "Timeline", phraseId: "new-era" },
  { id: "common", brand: "Common", phraseId: "more-human" },
  { id: "forma", brand: "Forma", phraseId: "born-transform" },
  { id: "harbor", brand: "Harbor", phraseId: "world-waiting" },
  { id: "uplift", brand: "Uplift", phraseId: "believe-better" },
  { id: "mosaic", brand: "Mosaic", phraseId: "purpose-possibility" },
  { id: "draft", brand: "Draft", phraseId: "rewrite-rules" },
  { id: "anchor", brand: "Anchor", phraseId: "power-yours" },
  { id: "studio", brand: "Studio", phraseId: "life-imagine" },
  { id: "kite", brand: "Kite", phraseId: "future-deserve" },
  { id: "horizon", brand: "Horizon", phraseId: "beyond-ordinary" },
  { id: "pace", brand: "Pace", phraseId: "progress-you" },
  { id: "thread", brand: "Thread", phraseId: "journey-truth" },
  { id: "loop", brand: "Loop", phraseId: "no-going-back" },
  { id: "first", brand: "First", phraseId: "getting-started" },
  { id: "clearspace", brand: "Clearspace", phraseId: "change-without-change" },
  { id: "version", brand: "Version", phraseId: "more-already" },
  { id: "upgrade", brand: "Upgrade", phraseId: "better-you" },
  { id: "familiar", brand: "Familiar", phraseId: "future-familiar" },
  { id: "unlimited", brand: "Unlimited", phraseId: "terms-apply" },
  { id: "compass", brand: "Compass", phraseId: "meaning-plan" },
  { id: "persona", brand: "Persona", phraseId: "authentic-optimized" },
  { id: "freeway", brand: "Freeway", phraseId: "freedom-sizes" },
  { id: "contrast", brand: "Contrast", phraseId: "difference-explain" },
  { id: "novel", brand: "Novel", phraseId: "nothing-new" },
  { id: "today", brand: "Today", phraseId: "tomorrow-today" },
  { id: "collective", brand: "Collective", phraseId: "something-bigger" },
  { id: "transform", brand: "Transform", phraseId: "transform-nothing" },
  { id: "answer", brand: "Answer", phraseId: "answer-you" },
  { id: "same", brand: "Same", phraseId: "never-same" },
  { id: "vague", brand: "Vague", phraseId: "beautifully-vague" },
  { id: "revolt", brand: "Revolt", phraseId: "revolution-branded" },
  { id: "audience", brand: "Audience", phraseId: "target-audience" },
  { id: "renew", brand: "Renew", phraseId: "same-subscription" },
  { id: "self", brand: "Self", phraseId: "yourself-trademark" },
  { id: "launch", brand: "Launch", phraseId: "next-you-here" },
  { id: "stride", brand: "Stride", phraseId: "forward-with-self" },
  { id: "momentum", brand: "Momentum", phraseId: "intention-momentum" },
  { id: "clarity", brand: "Clarity", phraseId: "clearer-choice" },
  { id: "craft", brand: "Craft", phraseId: "life-fits" },
  { id: "near", brand: "Near", phraseId: "close-moves" },
  { id: "room", brand: "Room", phraseId: "room-more" },
  { id: "wayfinder", brand: "Wayfinder", phraseId: "way-here" },
  { id: "shape", brand: "Shape", phraseId: "no-final-form" },
  { id: "seed", brand: "Seed", phraseId: "small-larger" },
  { id: "current", brand: "Current", phraseId: "matters-moving" },
  { id: "standard", brand: "Standard", phraseId: "standard-yourself" },
  { id: "motion", brand: "Motion", phraseId: "already-motion" },
  { id: "select", brand: "Select", phraseId: "future-chooses" },
  { id: "echo", brand: "Echo", phraseId: "tomorrow-listening" },
] as const;

const phrasesById = new Map(
  mythicMarketingPhrases.map((phrase) => [phrase.id, phrase]),
);

export type MacosSloganWord = {
  id: string;
  label: string;
};

export type MacosSloganRow = {
  id: string;
  brand: string;
  phraseId: string;
  phrase: string;
  words: readonly MacosSloganWord[];
  menus: readonly MenuDefinition[];
  status: {
    batteryPercent: number;
    charging: boolean;
    wifiLevel: 0 | 1 | 2 | 3;
    timeOffsetMinutes: number;
  };
};

export const macosSloganRows: readonly MacosSloganRow[] = rowAssignments.map(
  (assignment, rowIndex) => {
    const phrase = phrasesById.get(assignment.phraseId);

    if (!phrase) {
      throw new Error(`Missing mythic marketing phrase: ${assignment.phraseId}`);
    }

    const displayPhrase = phrase.text.replace(/[.,]/g, "");
    const words = displayPhrase.split(/\s+/).map((label, index) => ({
      id: `${assignment.id}-word-${index + 1}`,
      label,
    }));
    const menus: readonly MenuDefinition[] = [
      {
        id: `${assignment.id}-apple`,
        label: "Apple",
        entries: appleMenuEntries,
      },
      {
        id: `${assignment.id}-brand`,
        label: assignment.brand,
        entries: createBrandMenuEntries(assignment.id, assignment.brand),
      },
      ...words.map((word) => ({
        id: word.id,
        label: word.label,
        entries: createWordMenuEntries(
          assignment.id,
          word.id,
          word.label,
        ),
      })),
    ];

    return {
      ...assignment,
      phrase: displayPhrase,
      words,
      menus,
      status: {
        batteryPercent: 14 + ((rowIndex * 29) % 84),
        charging: rowIndex % 4 === 1,
        wifiLevel: ((rowIndex * 3) % 4) as 0 | 1 | 2 | 3,
        timeOffsetMinutes: rowIndex * 37,
      },
    };
  },
);
