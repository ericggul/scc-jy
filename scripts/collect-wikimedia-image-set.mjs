import { execFile } from "node:child_process";
import { access, mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const configArgument = process.argv[2];

if (!configArgument) {
  throw new Error(
    "Usage: node scripts/collect-wikimedia-image-set.mjs <collection-config.json>",
  );
}

const configPath = path.resolve(root, configArgument);
const config = JSON.parse(await readFile(configPath, "utf8"));
const requiredConfigFields = [
  "collectionId",
  "targetCount",
  "thumbnailWidth",
  "userAgent",
  "outputDirectory",
  "publicPrefix",
  "ledgerPath",
  "queries",
];

for (const field of requiredConfigFields) {
  if (!config[field]) throw new Error(`Missing collection config field: ${field}`);
}

if (config.queries.length !== config.targetCount) {
  throw new Error(
    `Expected exactly ${config.targetCount} queries; found ${config.queries.length}`,
  );
}

const outputDirectory = path.resolve(root, config.outputDirectory);
const ledgerPath = path.resolve(root, config.ledgerPath);
const partialLedgerPath = `${ledgerPath}.partial`;
const thumbnailWidth = String(config.thumbnailWidth);
const delayMs = Number.isFinite(config.delayMs) ? config.delayMs : 350;
const minimumBytes = Number.isFinite(config.minimumBytes)
  ? config.minimumBytes
  : 4_000;
const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

await mkdir(outputDirectory, { recursive: true });
await mkdir(path.dirname(ledgerPath), { recursive: true });

const existingImages = (await readdir(outputDirectory)).filter((fileName) =>
  /^\d+\.jpg$/i.test(fileName),
);
let existingLedger = false;
try {
  await access(ledgerPath);
  existingLedger = true;
} catch {
  // A new collection has no ledger yet.
}

if (existingLedger) {
  throw new Error(
    `Refusing to overwrite existing collection ${config.collectionId}. ` +
      "Choose a new output/ledger path or review and remove the partial collection first.",
  );
}

let records = [];
let nextQueryIndex = 0;
try {
  const checkpoint = JSON.parse(await readFile(partialLedgerPath, "utf8"));
  if (checkpoint.collectionId !== config.collectionId) {
    throw new Error(`Checkpoint does not belong to ${config.collectionId}`);
  }
  if (!Array.isArray(checkpoint.records) || !Number.isInteger(checkpoint.nextQueryIndex)) {
    throw new Error("Checkpoint has an invalid shape");
  }
  if (checkpoint.records.length !== existingImages.length) {
    throw new Error(
      `Checkpoint has ${checkpoint.records.length} records but image directory has ${existingImages.length} files`,
    );
  }
  records = checkpoint.records;
  nextQueryIndex = checkpoint.nextQueryIndex;
  process.stdout.write(`Resuming ${config.collectionId} at ${records.length}/${config.targetCount}.\n`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  if (existingImages.length > 0) {
    throw new Error(
      `Found ${existingImages.length} images without a checkpoint for ${config.collectionId}. ` +
        "Review or remove them before starting a new collection.",
    );
  }
}

async function writeCheckpoint() {
  await writeFile(
    partialLedgerPath,
    `${JSON.stringify({
      collectionId: config.collectionId,
      records,
      nextQueryIndex,
    }, null, 2)}\n`,
  );
}

async function searchCommons(searchTerm) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "20",
    gsrsearch: searchTerm,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: thumbnailWidth,
  }).toString();

  const { stdout } = await execFileAsync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--fail",
      "--max-time",
      "90",
      "--retry",
      "4",
      "--retry-all-errors",
      "--retry-delay",
      "5",
      "-H",
      `User-Agent: ${config.userAgent}`,
      url.toString(),
    ],
    { maxBuffer: 5_000_000 },
  );
  const payload = JSON.parse(stdout);

  return Object.values(payload.query?.pages ?? {})
    .sort((left, right) => left.index - right.index)
    .flatMap((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || info.mime !== "image/jpeg") return [];
      return [{
        title: page.title.replace(/^File:/, ""),
        thumbnailUrl: info.thumburl,
        sourceUrl: info.descriptionurl,
        license: info.extmetadata?.LicenseShortName?.value ?? null,
        author: info.extmetadata?.Artist?.value ?? null,
      }];
    });
}

function normalized(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function titleMatchesQuery(title, query) {
  const configuredTerms = query.matchTerms ?? [];
  const derivedTerms = query.searchTerm
    .replace(/\b(portrait|official|photograph|photo)\b/gi, "")
    .split(/\s+/)
    .filter((term) => term.length >= 3);
  const requiredTerms = configuredTerms.length > 0
    ? configuredTerms
    : derivedTerms;

  if (requiredTerms.length === 0) return true;
  const normalizedTitle = normalized(title);
  return requiredTerms.some((term) => normalizedTitle.includes(normalized(term)));
}

const usedSources = new Set(records.map((record) => record.sourceUrl));

for (; nextQueryIndex < config.queries.length; nextQueryIndex += 1) {
  const query = config.queries[nextQueryIndex];
  const candidates = await searchCommons(
    query.searchTerm.replace(/\bportrait\b/gi, "").trim(),
  );
  let accepted = false;

  for (const candidate of candidates) {
    if (usedSources.has(candidate.sourceUrl)) continue;
    if (!titleMatchesQuery(candidate.title, query)) continue;

    const number = String(records.length + 1).padStart(3, "0");
    const fileName = `${number}.jpg`;
    const targetPath = path.join(outputDirectory, fileName);

    try {
      await execFileAsync("curl", [
        "-L",
        "--silent",
        "--show-error",
        "--fail",
        "--max-time",
        "90",
        "--retry",
        "4",
        "--retry-all-errors",
        "--retry-delay",
        "5",
        "--remove-on-error",
        "-A",
        config.userAgent,
        "-o",
        targetPath,
        candidate.thumbnailUrl,
      ]);
      if ((await stat(targetPath)).size < minimumBytes) {
        await unlink(targetPath);
        continue;
      }

      records.push({
        id: `${config.collectionId}-${number}`,
        topic: query.topic,
        country: query.country,
        title: candidate.title.replace(/\.[^.]+$/, ""),
        imageUrl: `${config.publicPrefix}/${fileName}`,
        sourceUrl: candidate.sourceUrl,
        searchTerm: query.searchTerm,
        license: candidate.license,
        author: candidate.author,
      });
      usedSources.add(candidate.sourceUrl);
      accepted = true;
      nextQueryIndex += 1;
      await writeCheckpoint();
      nextQueryIndex -= 1;
      process.stdout.write(
        `${records.length}/${config.targetCount} ${query.country}: ${candidate.title}\n`,
      );
      break;
    } catch (error) {
      await unlink(targetPath).catch(() => {});
      process.stderr.write(`Skipped ${candidate.title}: ${error.message}\n`);
    }
  }

  if (!accepted) {
    throw new Error(
      `No usable JPEG found for ${query.country}: ${query.searchTerm}. ` +
        "No ledger was written; review the partial image directory before retrying.",
    );
  }
  await wait(delayMs);
}

if (records.length !== config.targetCount) {
  throw new Error(`Expected ${config.targetCount} records; wrote ${records.length}`);
}

await writeFile(ledgerPath, `${JSON.stringify(records, null, 2)}\n`);
await unlink(partialLedgerPath).catch((error) => {
  if (error.code !== "ENOENT") throw error;
});
process.stdout.write(
  `Collected ${records.length} local images for ${config.collectionId}.\n`,
);
