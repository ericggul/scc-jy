export type CareerLevel = "early" | "established" | "senior";

export type CvFormatId =
  | "ats-resume"
  | "executive-resume"
  | "academic-cv"
  | "europass-cv";

export type CvStyleId =
  | "harvard-compact"
  | "banking-classic"
  | "legal-brief"
  | "consulting-impact"
  | "academic-dossier"
  | "lab-cv"
  | "europass-clean"
  | "nhs-clinical"
  | "teacher-portfolio"
  | "engineer-spec"
  | "product-casebook"
  | "design-minimal"
  | "architecture-plate"
  | "editorial-resume"
  | "executive-board"
  | "nonprofit-grants"
  | "government-ksas"
  | "rirekisho-lite"
  | "startup-operator"
  | "plain-ats";

export type FutureDimensionId =
  | "country"
  | "qualificationSystem"
  | "formatPreference"
  | "language"
  | "evidenceDensity";

export type IndustryProfile = {
  id: string;
  label: string;
  field: string;
  titleTracks: Record<CareerLevel, readonly string[]>;
  employers: readonly string[];
  degreeFields: readonly string[];
  competencies: readonly string[];
  tools: readonly string[];
  metrics: readonly string[];
  bodies: readonly string[];
};

export type GeneratorParameters = {
  yearsOfExperience: number;
  industryIndex: number;
  entropy: number;
  xRatio: number;
  yRatio: number;
};

export type Person = {
  id: string;
  name: string;
  city: string;
  email: string;
  phone: string;
  profileUrl: string;
};

export type Bullet = {
  id: string;
  text: string;
};

export type Role = {
  id: string;
  title: string;
  employer: string;
  city: string;
  start: string;
  end: string;
  context: string;
  bullets: Bullet[];
};

export type Education = {
  id: string;
  degree: string;
  institution: string;
  city: string;
  year: string;
  details: string;
};

export type Publication = {
  id: string;
  citation: string;
};

export type Project = {
  id: string;
  label: string;
  text: string;
};

export type SkillGroup = {
  id: string;
  label: string;
  items: string[];
};

export type Award = {
  id: string;
  text: string;
};

export type CvDocument = {
  id: string;
  format: CvFormatId;
  styleId: CvStyleId;
  styleIndex: number;
  level: CareerLevel;
  yearsOfExperience: number;
  industry: IndustryProfile;
  person: Person;
  targetTitle: string;
  profile: string;
  roles: Role[];
  education: Education[];
  publications: Publication[];
  projects: Project[];
  skillGroups: SkillGroup[];
  credentials: string[];
  awards: Award[];
  service: string[];
  languages: string[];
  dimensions: Record<FutureDimensionId, string>;
};
