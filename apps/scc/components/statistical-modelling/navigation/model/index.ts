import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type StatisticalModellingExperiment = Readonly<{
  id: string;
  href: string;
  group: string;
  groupLabel: string;
  slug: string;
  summary?: string;
}>;

type ArchiveRoots = Readonly<{
  app: string;
  components: string;
  docs: string;
}>;

const naturalOrder = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function isSafeSegment(value: string) {
  return /^[a-z0-9][a-z0-9-]*$/i.test(value);
}

function asLabel(value: string) {
  return value.replaceAll("-", " ");
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
    const components = path.join(candidate, "components", "statistical-modelling");
    if (!(await isDirectory(components))) continue;

    return {
      app: path.join(candidate, "app", "(statistical-modelling)"),
      components,
      docs: path.join(candidate, "docs", "experiments", "statistical-modelling"),
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
  const heading = markdown.match(
    new RegExp(`^##\\s+[^\\n]*/${slug}\\s*$`, "im"),
  );
  if (heading?.index === undefined) return undefined;

  const section = markdown.slice(heading.index);
  const nextHeading = section.slice(1).search(/^##\s+/m);
  const excerpt = nextHeading < 0 ? section : section.slice(0, nextHeading + 1);
  const match = excerpt.match(
    /\*\*Perceptual job:\*\*\s*([\s\S]*?)(?=\n\d+\.\s|\n\n|$)/i,
  );
  return match?.[1]?.replace(/\s+/g, " ").trim();
}

export async function getStatisticalModellingExperiments(): Promise<
  StatisticalModellingExperiment[]
> {
  const roots = await findArchiveRoots();
  if (!roots) return [];

  const entries = await readdir(roots.components, { withFileTypes: true });
  const groups = entries
    .filter((entry) => entry.isDirectory() && isSafeSegment(entry.name))
    .map((entry) => entry.name)
    .sort(naturalOrder.compare);

  const results = await Promise.all(groups.map(async (group) => {
    const groupRoot = path.join(roots.components, group);
    const publicRoute = path.join(roots.app, group, "[experiment]", "page.tsx");
    const registryPath = path.join(groupRoot, "experiments.ts");
    if (!(await isFile(publicRoute)) || !(await isFile(registryPath))) return [];

    const [registry, documentation] = await Promise.all([
      readFile(registryPath, "utf8"),
      readFile(path.join(roots.docs, group, "README.md"), "utf8").catch(() => ""),
    ]);
    const groupLabel = asLabel(group);

    return Promise.all(registeredSlugs(registry).map(async (slug) => {
      const hasEntry = await isFile(path.join(groupRoot, slug, "index.tsx"));
      if (!hasEntry) return null;

      const experiment: StatisticalModellingExperiment = {
        id: `${group}/${slug}`,
        href: `/${group}/${slug}`,
        group,
        groupLabel,
        slug,
      };
      const summary = getPerceptualSummary(documentation, slug);
      return summary ? { ...experiment, summary } : experiment;
    }));
  }));

  return results
    .flat()
    .filter((experiment): experiment is StatisticalModellingExperiment => experiment !== null)
    .sort((first, second) => naturalOrder.compare(first.id, second.id));
}
