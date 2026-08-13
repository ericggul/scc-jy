export const concepts = [
  { id: "water", label: "water" },
  { id: "fire", label: "fire" },
  { id: "path", label: "path" },
  { id: "night", label: "night" },
  { id: "shelter", label: "shelter" },
  { id: "food", label: "food" },
] as const;

export type ConceptId = (typeof concepts)[number]["id"];

export type Lexeme = {
  form: string;
  strength: number;
  uses: number;
};

export type Speaker = {
  id: string;
  x: number;
  y: number;
  community: number;
  lexicon: Record<ConceptId, Lexeme[]>;
};

export type LanguageTie = {
  id: string;
  source: string;
  target: string;
  affinity: number;
  uses: number;
  agreements: number;
};

export type InteractionOutcome = "echo" | "adoption" | "mutation";

export type LanguageInteraction = {
  id: string;
  source: string;
  target: string;
  concept: ConceptId;
  sent: string;
  received: string;
  outcome: InteractionOutcome;
};

export type LanguageField = {
  speakers: Speaker[];
  ties: LanguageTie[];
  interactionCount: number;
  randomSeed: number;
  lastInteraction: LanguageInteraction | null;
};

export type WordVariant = {
  form: string;
  speakers: number;
  share: number;
};

type RandomResult = {
  value: number;
  seed: number;
};

type FormResult = {
  form: string;
  seed: number;
};

const onsets = ["m", "n", "p", "t", "k", "s", "l", "r", "v", "h"];
const vowels = ["a", "e", "i", "o", "u"];
const codas = ["", "", "m", "n", "s", "l"];

function nextRandom(seed: number): RandomResult {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { value: next / 4294967296, seed: next };
}

function takeIndex(seed: number, length: number) {
  const random = nextRandom(seed);
  return { index: Math.floor(random.value * length), seed: random.seed };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function makeForm(seed: number): FormResult {
  let nextSeed = seed;
  let form = "";
  const syllableCount = takeIndex(nextSeed, 3);
  nextSeed = syllableCount.seed;
  const total = syllableCount.index === 0 ? 2 : syllableCount.index + 1;

  for (let index = 0; index < total; index += 1) {
    const onset = takeIndex(nextSeed, onsets.length);
    nextSeed = onset.seed;
    const vowel = takeIndex(nextSeed, vowels.length);
    nextSeed = vowel.seed;
    const coda = takeIndex(nextSeed, codas.length);
    nextSeed = coda.seed;
    form += `${onsets[onset.index]}${vowels[vowel.index]}${codas[coda.index]}`;
  }

  return { form, seed: nextSeed };
}

function mutateForm(form: string, seed: number): FormResult {
  const indexChoice = takeIndex(seed, form.length);
  const position = indexChoice.index;
  const current = form[position];
  const replacements = vowels.includes(current as (typeof vowels)[number])
    ? vowels
    : onsets;
  const replacement = takeIndex(indexChoice.seed, replacements.length);
  const nextCharacter = replacements[replacement.index] === current
    ? replacements[(replacement.index + 1) % replacements.length]
    : replacements[replacement.index];
  return {
    form: `${form.slice(0, position)}${nextCharacter}${form.slice(position + 1)}`,
    seed: replacement.seed,
  };
}

function strongestLexeme(lexicon: Lexeme[]) {
  return [...lexicon].sort(
    (left, right) => right.strength - left.strength || right.uses - left.uses,
  )[0];
}

function reinforceLexeme(lexicon: Lexeme[], form: string) {
  const existing = lexicon.find((lexeme) => lexeme.form === form);
  if (!existing) return lexicon;
  return lexicon.map((lexeme) =>
    lexeme.form === form
      ? {
          ...lexeme,
          strength: clamp(lexeme.strength + 0.12, 0, 1),
          uses: lexeme.uses + 1,
        }
      : { ...lexeme, strength: clamp(lexeme.strength * 0.985, 0, 1) },
  );
}

function learnLexeme(lexicon: Lexeme[], form: string) {
  const existing = lexicon.find((lexeme) => lexeme.form === form);
  if (existing) return reinforceLexeme(lexicon, form);
  const learned = [
    ...lexicon.map((lexeme) => ({
      ...lexeme,
      strength: clamp(lexeme.strength * 0.72, 0.08, 1),
    })),
    { form, strength: 0.58, uses: 1 },
  ];
  return learned
    .sort((left, right) => right.strength - left.strength)
    .slice(0, 3);
}

function editSpeakerLexicon(
  speaker: Speaker,
  concept: ConceptId,
  edit: (lexicon: Lexeme[]) => Lexeme[],
): Speaker {
  return {
    ...speaker,
    lexicon: { ...speaker.lexicon, [concept]: edit(speaker.lexicon[concept]) },
  };
}

function createTie(
  source: string,
  target: string,
  seed: number,
): { tie: LanguageTie; seed: number } {
  const random = nextRandom(seed);
  const [left, right] = source < target ? [source, target] : [target, source];
  return {
    tie: {
      id: `${left}:${right}`,
      source: left,
      target: right,
      affinity: 0.33 + random.value * 0.42,
      uses: 0,
      agreements: 0,
    },
    seed: random.seed,
  };
}

export function createLanguageField(seed = 298641): LanguageField {
  let nextSeed = seed;
  const communityWords = new Map<number, Record<ConceptId, string>>();
  for (let community = 0; community < 3; community += 1) {
    const lexicon = {} as Record<ConceptId, string>;
    for (const concept of concepts) {
      const generated = makeForm(nextSeed);
      nextSeed = generated.seed;
      lexicon[concept.id] = generated.form;
    }
    communityWords.set(community, lexicon);
  }

  const centres = [
    { x: 0.3, y: 0.41 },
    { x: 0.69, y: 0.41 },
    { x: 0.5, y: 0.68 },
  ];
  const speakers = Array.from({ length: 21 }, (_, index): Speaker => {
    const community = Math.floor(index / 7);
    const member = index % 7;
    const angle = (member / 7) * Math.PI * 2 - Math.PI / 2;
    const radius = 0.1 + (member % 2) * 0.016;
    const lexicon = {} as Record<ConceptId, Lexeme[]>;
    for (const concept of concepts) {
      const strength = nextRandom(nextSeed);
      nextSeed = strength.seed;
      lexicon[concept.id] = [{
        form: communityWords.get(community)![concept.id],
        strength: 0.54 + strength.value * 0.34,
        uses: 0,
      }];
    }
    return {
      id: `speaker-${index + 1}`,
      x: centres[community].x + Math.cos(angle) * radius,
      y: centres[community].y + Math.sin(angle) * radius,
      community,
      lexicon,
    };
  });

  const tiePairs: Array<[string, string]> = [];
  for (let community = 0; community < 3; community += 1) {
    const offset = community * 7;
    for (let member = 0; member < 7; member += 1) {
      tiePairs.push([
        `speaker-${offset + member + 1}`,
        `speaker-${offset + ((member + 1) % 7) + 1}`,
      ]);
    }
  }
  tiePairs.push(
    ["speaker-1", "speaker-8"],
    ["speaker-4", "speaker-15"],
    ["speaker-10", "speaker-18"],
    ["speaker-14", "speaker-20"],
    ["speaker-7", "speaker-16"],
    ["speaker-3", "speaker-12"],
  );

  const ties = tiePairs.map(([source, target]) => {
    const result = createTie(source, target, nextSeed);
    nextSeed = result.seed;
    return result.tie;
  });

  return {
    speakers,
    ties,
    interactionCount: 0,
    randomSeed: nextSeed,
    lastInteraction: null,
  };
}

function weightedTieIndex(ties: LanguageTie[], seed: number) {
  const random = nextRandom(seed);
  const total = ties.reduce((sum, tie) => sum + tie.affinity * tie.affinity, 0);
  let cursor = random.value * total;
  for (let index = 0; index < ties.length; index += 1) {
    cursor -= ties[index].affinity * ties[index].affinity;
    if (cursor <= 0) return { index, seed: random.seed };
  }
  return { index: ties.length - 1, seed: random.seed };
}

export function stepLanguageField(
  field: LanguageField,
  forcedConcept?: ConceptId,
): LanguageField {
  let nextSeed = field.randomSeed;
  const tieChoice = weightedTieIndex(field.ties, nextSeed);
  nextSeed = tieChoice.seed;
  const direction = nextRandom(nextSeed);
  nextSeed = direction.seed;
  const selectedTie = field.ties[tieChoice.index];
  const sourceId = direction.value < 0.5 ? selectedTie.source : selectedTie.target;
  const targetId = direction.value < 0.5 ? selectedTie.target : selectedTie.source;
  const conceptChoice = takeIndex(nextSeed, concepts.length);
  nextSeed = conceptChoice.seed;
  const concept = forcedConcept ?? concepts[conceptChoice.index].id;
  const source = field.speakers.find((speaker) => speaker.id === sourceId)!;
  const target = field.speakers.find((speaker) => speaker.id === targetId)!;
  const sent = strongestLexeme(source.lexicon[concept]).form;
  const known = target.lexicon[concept].some((lexeme) => lexeme.form === sent);
  const mutationChance = 0.035 + (1 - selectedTie.affinity) * 0.23;
  const mutationRoll = nextRandom(nextSeed);
  nextSeed = mutationRoll.seed;
  const shouldMutate = !known && mutationRoll.value < mutationChance;
  let received = sent;
  if (shouldMutate) {
    const mutated = mutateForm(sent, nextSeed);
    received = mutated.form;
    nextSeed = mutated.seed;
  }

  const outcome: InteractionOutcome = known
    ? "echo"
    : shouldMutate ? "mutation" : "adoption";
  const speakers = field.speakers.map((speaker) => {
    if (speaker.id === sourceId) {
      return editSpeakerLexicon(speaker, concept, (lexicon) =>
        reinforceLexeme(lexicon, sent),
      );
    }
    if (speaker.id === targetId) {
      return editSpeakerLexicon(speaker, concept, (lexicon) =>
        known ? reinforceLexeme(lexicon, sent) : learnLexeme(lexicon, received),
      );
    }
    return speaker;
  });
  const ties = field.ties.map((tie) => {
    if (tie.id !== selectedTie.id) return tie;
    const adjustment = known ? 0.028 : shouldMutate ? -0.024 : 0.007;
    return {
      ...tie,
      affinity: clamp(tie.affinity + adjustment, 0.12, 1),
      uses: tie.uses + 1,
      agreements: tie.agreements + (known ? 1 : 0),
    };
  });
  const interactionCount = field.interactionCount + 1;

  return {
    speakers,
    ties,
    interactionCount,
    randomSeed: nextSeed,
    lastInteraction: {
      id: `${interactionCount}:${sourceId}:${targetId}`,
      source: sourceId,
      target: targetId,
      concept,
      sent,
      received,
      outcome,
    },
  };
}

export function getWordVariants(
  field: LanguageField,
  concept: ConceptId,
): WordVariant[] {
  const counts = new Map<string, number>();
  for (const speaker of field.speakers) {
    const form = strongestLexeme(speaker.lexicon[concept]).form;
    counts.set(form, (counts.get(form) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([form, speakers]) => ({
      form,
      speakers,
      share: speakers / field.speakers.length,
    }))
    .sort((left, right) => right.speakers - left.speakers || left.form.localeCompare(right.form));
}

export function getConsensus(field: LanguageField, concept: ConceptId) {
  return getWordVariants(field, concept)[0]?.share ?? 0;
}

export function getSpeaker(field: LanguageField, id: string) {
  return field.speakers.find((speaker) => speaker.id === id) ?? null;
}
