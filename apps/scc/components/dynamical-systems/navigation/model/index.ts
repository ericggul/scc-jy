import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type DynamicalSystemExperiment = {
  id: string;
  href: string;
  group: string;
  groupLabel: string;
  slug: string;
  summary?: string;
};

type ArchiveRoots = {
  app: string;
  components: string;
  docs: string;
};

const naturalOrder = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function asLabel(value: string) {
  return value.replaceAll("-", " ");
}

function isSafeSegment(value: string) {
  return /^[a-z0-9][a-z0-9-]*$/i.test(value);
}

async function isFile(target: string) {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(target: string) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function findArchiveRoots(): Promise<ArchiveRoots | null> {
  const workingDirectory = process.cwd();
  const candidates = [
    workingDirectory,
    path.join(workingDirectory, "apps", "scc"),
  ];

  for (const candidate of candidates) {
    const components = path.join(candidate, "components", "dynamical-systems");
    if (!(await isDirectory(components))) continue;

    return {
      app: path.join(candidate, "app", "(dynamical-systems)"),
      components,
      docs: path.join(candidate, "docs", "experiments", "dynamical-systems"),
    };
  }

  return null;
}

function registeredSlugs(registry: string) {
  const slugs = new Set<string>();
  const slugPattern = /\bslug\s*:\s*["']([^"']+)["']/g;

  for (const match of registry.matchAll(slugPattern)) {
    const slug = match[1];
    if (slug && isSafeSegment(slug)) slugs.add(slug);
  }

  return [...slugs].sort(naturalOrder.compare);
}

function getPerceptualSummary(markdown: string, slug: string) {
  const variantHeading = new RegExp(
    `^##\\s+[^\\n]*/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "im",
  );
  const heading = markdown.match(variantHeading);
  const start = heading?.index ?? markdown.search(/^##\s+Interface premise\s*$/im);
  if (start < 0) return undefined;

  const section = markdown.slice(start);
  const nextHeading = section.slice(1).search(/^##\s+/m);
  const excerpt = nextHeading < 0 ? section : section.slice(0, nextHeading + 1);
  const match = excerpt.match(
    /\*\*Perceptual job:\*\*\s*([\s\S]*?)(?=\n\d+\.\s|\n\n|$)/i,
  );
  return match?.[1]?.replace(/\s+/g, " ").trim();
}

async function readSummary(docsRoot: string, group: string, slug: string) {
  try {
    const markdown = await readFile(
      path.join(docsRoot, group, "README.md"),
      "utf8",
    );
    return getPerceptualSummary(markdown, slug);
  } catch {
    return undefined;
  }
}

async function hasRunnableEntry(groupRoot: string, slug: string) {
  return (
    (await isFile(path.join(groupRoot, slug, "index.tsx"))) ||
    (await isFile(path.join(groupRoot, slug, "index.ts")))
  );
}

async function hasPublicExperimentRoute(appRoot: string, group: string) {
  return (
    (await isFile(path.join(appRoot, group, "[experiment]", "page.tsx"))) ||
    (await isFile(path.join(appRoot, group, "[experiment]", "page.ts")))
  );
}

export async function getDynamicalSystemExperiments(): Promise<
  DynamicalSystemExperiment[]
> {
  const roots = await findArchiveRoots();
  if (!roots) return [];

  const entries = await readdir(roots.components, { withFileTypes: true });
  const groups = entries
    .filter((entry) => entry.isDirectory() && isSafeSegment(entry.name))
    .map((entry) => entry.name)
    .sort(naturalOrder.compare);

  const experiments = await Promise.all(groups.map(async (group) => {
    if (!(await hasPublicExperimentRoute(roots.app, group))) return [];

    const groupRoot = path.join(roots.components, group);
    const registryPath = path.join(groupRoot, "experiments.ts");
    if (!(await isFile(registryPath))) return [];

    const registry = await readFile(registryPath, "utf8");
    const slugs = registeredSlugs(registry);
    return Promise.all(slugs.map(async (slug) => {
      if (!(await hasRunnableEntry(groupRoot, slug))) return null;
      const groupLabel = asLabel(group);
      const experiment: DynamicalSystemExperiment = {
        id: `${group}/${slug}`,
        href: `/${group}/${slug}`,
        group,
        groupLabel,
        slug,
      };
      const summary = await readSummary(roots.docs, group, slug);
      if (summary) experiment.summary = summary;
      return experiment;
    }));
  }));

  return experiments
    .flat()
    .filter((experiment): experiment is DynamicalSystemExperiment => experiment !== null)
    .sort((first, second) => naturalOrder.compare(first.id, second.id));
}
