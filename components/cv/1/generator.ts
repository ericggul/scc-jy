import {
  cities,
  firstNames,
  industries,
  languages,
  lastNames,
  universities,
} from "./data";
import { cvStyles, getCvStyle } from "./styles";
import type {
  Award,
  Bullet,
  CareerLevel,
  CvDocument,
  CvFormatId,
  Education,
  GeneratorParameters,
  IndustryProfile,
  Project,
  Publication,
  Role,
  SkillGroup,
} from "./types";

const CURRENT_YEAR = 2026;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hash(seed: string) {
  let value = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function createRandom(seed: string) {
  let value = hash(seed);

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

function pickMany<T>(items: readonly T[], count: number, random: () => number) {
  const pool = [...items];
  const selected: T[] = [];

  while (pool.length > 0 && selected.length < count) {
    selected.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }

  return selected;
}

function levelForYears(years: number): CareerLevel {
  if (years >= 14) {
    return "senior";
  }

  if (years >= 5) {
    return "established";
  }

  return "early";
}

function formatFor(industry: IndustryProfile, years: number): CvFormatId {
  if (industry.id === "academia") {
    return "academic-cv";
  }

  if (years >= 17) {
    return "executive-resume";
  }

  if (
    industry.id === "healthcare" ||
    industry.id === "legal-policy" ||
    industry.id === "education"
  ) {
    return "europass-cv";
  }

  return "ats-resume";
}

function monthYear(year: number, random: () => number) {
  const month = pick(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
    random,
  );
  return `${month} ${year}`;
}

function createBullet(
  id: string,
  industry: IndustryProfile,
  years: number,
  random: () => number,
): Bullet {
  const verb = pick(
    [
      "Led",
      "Built",
      "Reduced",
      "Improved",
      "Launched",
      "Standardized",
      "Negotiated",
      "Designed",
      "Analyzed",
      "Delivered",
    ],
    random,
  );
  const competency = pick(industry.competencies, random);
  const metric = pick(industry.metrics, random);
  const value = years < 4 ? 8 + Math.floor(random() * 22) : 16 + Math.floor(random() * 54);
  const scope =
    years < 4
      ? pick(["pilot", "department workflow", "customer segment", "student program"], random)
      : years < 14
        ? pick(["regional program", "core product line", "operating model", "multi-market rollout"], random)
        : pick(["global portfolio", "multi-year transformation", "board-level initiative", "post-merger integration"], random);
  const method = pick(
    [
      "stakeholder interviews",
      "weekly operating reviews",
      "baseline measurement",
      "vendor governance",
      "technical documentation",
      "cross-functional workshops",
      "quality audits",
      "cohort analysis",
    ],
    random,
  );
  const audience = pick(
    [
      "senior sponsors",
      "front-line teams",
      "external partners",
      "review committees",
      "regional operators",
      "client leadership",
    ],
    random,
  );
  const cadence = pick(
    [
      "monthly review pack",
      "decision log",
      "working group",
      "readiness checklist",
      "measurement plan",
      "implementation playbook",
    ],
    random,
  );
  const template = pick(
    [
      `${verb} ${competency} for a ${scope}; used ${method} to move ${metric} by ${value}% and left a reusable ${cadence}.`,
      `Owned ${competency} with ${audience}, translating ambiguous requirements into a ${cadence} and a ${value}% gain in ${metric}.`,
      `Rebuilt the ${scope} around ${method}, clearer handoffs, and weekly evidence review; ${metric} improved by ${value}%.`,
      `Prepared analysis and operating recommendations for ${audience} on ${competency}, including risks, tradeoffs, and ${metric} follow-up.`,
    ],
    random,
  );

  return {
    id,
    text: template,
  };
}

function createRoles(
  industry: IndustryProfile,
  level: CareerLevel,
  years: number,
  seed: string,
  random: () => number,
): Role[] {
  const totalYears = Math.max(1, years);
  const roleCount = years < 3 ? 3 : clamp(Math.round(totalYears / 4) + 1, 4, 7);
  const roles: Role[] = [];
  let endYear: number | "Present" = "Present";
  let remaining = totalYears;

  for (let index = 0; index < roleCount; index += 1) {
    const duration =
      index === roleCount - 1
        ? Math.max(1, remaining)
        : clamp(1 + Math.floor(random() * 4), 1, 5);
    const numericEnd = endYear === "Present" ? CURRENT_YEAR : endYear;
    const startYear = Math.max(1996, numericEnd - duration);
    const localLevel = index === 0 ? level : levelForYears(Math.max(1, years - index * 5));
    const roleId = `${seed}-role-${index}`;
    const bullets = Array.from(
      { length: index === 0 ? 5 : index < 3 ? 4 : 3 },
      (_, bulletIndex) =>
        createBullet(`${roleId}-bullet-${bulletIndex}`, industry, years, random),
    );

    roles.push({
      id: roleId,
      title: pick(industry.titleTracks[localLevel], random),
      employer: pick(industry.employers, random),
      city: pick(cities, random),
      start: monthYear(startYear, random),
      end: endYear === "Present" ? "Present" : monthYear(endYear, random),
      context: `${pick(["Reported to", "Partnered with", "Supported"], random)} ${pick(["executive sponsors", "clinical leads", "product leadership", "regional directors", "faculty committees", "client steering groups"], random)} on ${pick(industry.competencies, random)} and ${pick(industry.metrics, random)}.`,
      bullets,
    });

    remaining -= duration;
    endYear = startYear;
  }

  return roles;
}

function createEducation(
  industry: IndustryProfile,
  years: number,
  seed: string,
  random: () => number,
): Education[] {
  const gradYear = clamp(CURRENT_YEAR - years - Math.floor(random() * 3), 1997, 2026);
  const degree =
    industry.id === "academia"
      ? "PhD"
      : years >= 12
        ? pick(["MBA", "MS", "MA"], random)
        : pick(["BA", "BS", "BSc", "MA", "MSc"], random);

  return [
    {
      id: `${seed}-edu-0`,
      degree: `${degree}, ${pick(industry.degreeFields, random)}`,
      institution: pick(universities, random),
      city: pick(cities, random),
      year: String(gradYear),
      details:
        industry.id === "academia"
          ? `Dissertation on ${pick(industry.competencies, random)} in ${industry.field}.`
          : `Coursework in ${pick(industry.competencies, random)} and ${pick(industry.tools, random)}.`,
    },
    {
      id: `${seed}-edu-1`,
      degree: `${pick(["Certificate", "Executive program", "Professional diploma"], random)}, ${pick(industry.competencies, random)}`,
      institution: pick(universities, random),
      city: pick(cities, random),
      year: String(clamp(gradYear + 2 + Math.floor(random() * 8), 2001, 2026)),
      details: `Applied portfolio covering ${pick(industry.metrics, random)} and ${pick(industry.tools, random)}.`,
    },
  ];
}

function createPublications(
  industry: IndustryProfile,
  years: number,
  seed: string,
  random: () => number,
): Publication[] {
  const count = industry.id === "academia" ? clamp(Math.floor(years / 2) + 3, 6, 14) : 4;

  return Array.from({ length: count }, (_, index) => ({
    id: `${seed}-pub-${index}`,
    citation: `${pick(lastNames, random)}, ${pick(firstNames, random)[0]}. (${CURRENT_YEAR - index}). ${pick(["Measuring", "Modeling", "Reframing", "Auditing", "Teaching"], random)} ${pick(industry.competencies, random)} in ${industry.field}. ${pick(["Journal of Applied Practice", "Proceedings of CHI", "Policy & Society", "Design Issues", "Health Systems Review"], random)}.`,
  }));
}

function createProjects(
  industry: IndustryProfile,
  seed: string,
  random: () => number,
): Project[] {
  return Array.from({ length: 7 }, (_, index) => {
    const competency = pick(industry.competencies, random);
    const phase = pick(
      ["Discovery", "Pilot", "Rollout", "Review", "Remediation", "Scale-up"],
      random,
    );
    const artifact = pick(
      [
        "briefing note",
        "field report",
        "operating model",
        "case file",
        "project register",
        "implementation memo",
      ],
      random,
    );
    const venue = pick(industry.employers, random);
    return {
      id: `${seed}-project-${index}`,
      label: `${phase}: ${competency}`,
      text: `${venue} ${artifact} covering scope, owners, evidence, and decision points; delivered with ${pick(industry.tools, random)} and tracked against ${pick(industry.metrics, random)}.`,
    };
  });
}

function createSkillGroups(
  industry: IndustryProfile,
  seed: string,
  random: () => number,
): SkillGroup[] {
  return [
    {
      id: `${seed}-skills-domain`,
      label: "Domain",
      items: pickMany(industry.competencies, 4, random),
    },
    {
      id: `${seed}-skills-tools`,
      label: "Tools",
      items: pickMany(industry.tools, 5, random),
    },
    {
      id: `${seed}-skills-evidence`,
      label: "Evidence",
      items: pickMany(industry.metrics, 4, random),
    },
  ];
}

function createAwards(
  industry: IndustryProfile,
  seed: string,
  random: () => number,
): Award[] {
  return Array.from({ length: 4 }, (_, index) => ({
    id: `${seed}-award-${index}`,
    text: `${pick(["Finalist", "Recipient", "Selected contributor", "Invited speaker"], random)}, ${pick(["industry leadership forum", "regional excellence award", "annual research showcase", "professional association convening"], random)} for work in ${pick(industry.competencies, random)}.`,
  }));
}

export function generateCv(parameters: GeneratorParameters): CvDocument {
  const industry =
    industries[clamp(parameters.industryIndex, 0, industries.length - 1)] ??
    industries[0];
  const yearsOfExperience = clamp(Math.round(parameters.yearsOfExperience), 0, 30);
  const level = levelForYears(yearsOfExperience);
  const format = formatFor(industry, yearsOfExperience);
  const styleIndex = Math.floor(
    (parameters.xRatio * 11 + parameters.yRatio * 17 + parameters.entropy / 997) %
      cvStyles.length,
  );
  const style = getCvStyle(styleIndex);
  const seed = `${industry.id}-${yearsOfExperience}-${parameters.entropy}`;
  const random = createRandom(
    `${seed}-${parameters.xRatio.toFixed(3)}-${parameters.yRatio.toFixed(3)}`,
  );
  const firstName = pick(firstNames, random);
  const lastName = pick(lastNames, random);
  const personSlug = `${firstName}.${lastName}`.toLowerCase();
  const targetTitle = pick(industry.titleTracks[level], random);

  return {
    id: seed,
    format,
    styleId: style.id,
    styleIndex,
    level,
    yearsOfExperience,
    industry,
    person: {
      id: `${seed}-person`,
      name: `${firstName} ${lastName}`,
      city: pick(cities, random),
      email: `${personSlug}@mail.example`,
      phone: `+1 ${Math.floor(200 + random() * 700)}-${Math.floor(200 + random() * 700)}-${Math.floor(1000 + random() * 8999)}`,
      profileUrl: `${personSlug}.work`,
    },
    targetTitle,
    profile:
      format === "academic-cv"
        ? `${targetTitle} working across ${industry.field}, with appointments spanning research, teaching, publications, and collaborative programs. Current work focuses on ${pick(industry.competencies, random)}, ${pick(industry.competencies, random)}, and documented methods.`
        : `${targetTitle} with ${Math.max(1, yearsOfExperience)} years of experience in ${industry.field}. Record covers ${pick(industry.competencies, random)}, ${pick(industry.competencies, random)}, operating evidence, stakeholder decisions, and follow-through from brief to measurable result.`,
    roles: createRoles(industry, level, yearsOfExperience, seed, random),
    education: createEducation(industry, yearsOfExperience, seed, random),
    publications: createPublications(industry, yearsOfExperience, seed, random),
    projects: createProjects(industry, seed, random),
    skillGroups: createSkillGroups(industry, seed, random),
    credentials: pickMany(industry.bodies, Math.min(2, industry.bodies.length), random),
    awards: createAwards(industry, seed, random),
    service: [
      `Reviewer or mentor for ${pick(["early-career practitioners", "student teams", "industry working groups", "community programs"], random)}.`,
      `Prepared internal guidance on ${pick(industry.competencies, random)} and ${pick(industry.tools, random)}.`,
      `Organized knowledge-sharing sessions for ${pick(["cross-functional teams", "department colleagues", "external partners", "graduate fellows"], random)}.`,
    ],
    languages: pickMany(languages, 3, random),
    dimensions: {
      country: "global-default",
      qualificationSystem: format === "europass-cv" ? "structured-european" : "role-evidence",
      formatPreference: style.id,
      language: "en",
      evidenceDensity: style.density,
    },
  };
}

export function parametersFromPointer(xRatio: number, yRatio: number): GeneratorParameters {
  const boundedX = clamp(xRatio, 0, 0.999999);
  const boundedY = clamp(yRatio, 0, 1);
  const industryIndex = Math.floor(boundedX * industries.length);
  const microX = boundedX * industries.length - industryIndex;

  return {
    yearsOfExperience: boundedY * 30,
    industryIndex,
    entropy: Math.round((microX * 10000 + boundedY * 777) * 10),
    xRatio: boundedX,
    yRatio: boundedY,
  };
}
