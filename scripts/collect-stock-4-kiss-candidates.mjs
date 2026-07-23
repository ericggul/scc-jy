import { execFile } from "node:child_process";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const outputDirectory = path.join(root, ".tmp/stock-4-kiss-candidates");
const ledgerPath = path.join(outputDirectory, "candidates.json");
const userAgent = "SCC-Stock-4-Kiss-Review/1.0 (local visual review)";
const categories = [
  "People_kissing_people",
  "BDSM",
  "Erotic_photography",
];
const excludedTitleTerms = [
  "wedding",
  "bride",
  "groom",
  "marriage",
  "child",
  "children",
  "boy",
  "girl",
  "painting",
  "drawing",
  "illustration",
  "sculpture",
  "statue",
  "poster",
  "print",
];

await mkdir(outputDirectory, { recursive: true });
for (const fileName of await readdir(outputDirectory)) {
  if (/^\d+\.jpg$/.test(fileName)) await unlink(path.join(outputDirectory, fileName));
}

async function fetchCategory(category) {
  const categoryUrl = `https://commons.wikimedia.org/wiki/Category:${category}`;
  const { stdout } = await execFileAsync("curl", [
    "-L",
    "--silent",
    "--show-error",
    "--fail",
    "-A",
    userAgent,
    categoryUrl,
  ], { maxBuffer: 12_000_000 });
  const boxes = [...stdout.matchAll(/<li class="gallerybox"[\s\S]*?<\/li>/g)].map((match) => match[0]);

  return boxes.flatMap((box) => {
    const href = box.match(/href="(\/wiki\/File:[^"]+)"/)?.[1];
    if (!href) return [];
    try {
      const title = decodeURIComponent(href.replace("/wiki/File:", "")).replaceAll("_", " ");
      if (!/\.(jpe?g)$/i.test(title)) return [];
      if (excludedTitleTerms.some((term) => title.toLowerCase().includes(term))) return [];
      return [{
        category,
        title,
        remoteUrl: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(title)}?width=320`,
        sourceUrl: `https://commons.wikimedia.org${href}`,
      }];
    } catch {
      return [];
    }
  });
}

const candidates = [...new Map(
  (await Promise.all(categories.map(fetchCategory))).flat().map((candidate) => [candidate.sourceUrl, candidate]),
).values()];
const records = [];

for (const candidate of candidates) {
  const number = String(records.length + 1).padStart(3, "0");
  const targetPath = path.join(outputDirectory, `${number}.jpg`);
  try {
    await execFileAsync("curl", [
      "-L",
      "--silent",
      "--show-error",
      "--fail",
      "--max-time",
      "90",
      "--retry",
      "3",
      "-A",
      userAgent,
      "-o",
      targetPath,
      candidate.remoteUrl,
    ]);
    if ((await stat(targetPath)).size < 3_000) {
      await unlink(targetPath);
      continue;
    }
    records.push({
      id: number,
      localPath: targetPath,
      ...candidate,
    });
  } catch {
    await unlink(targetPath).catch(() => {});
  }
}

await writeFile(ledgerPath, `${JSON.stringify(records, null, 2)}\n`);
process.stdout.write(`Downloaded ${records.length} review candidates.\n`);
