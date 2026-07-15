import { execFile } from "node:child_process";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const API_URL = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "SCC-Bastille-Experiment/2.0 (local art research)";
const ROOT = process.cwd();
const execFileAsync = promisify(execFile);

const goodTopics = [
  ["Défilés du 14 juillet", "défilé du 14 juillet Paris 2025"],
  ["Fête nationale française", "fête nationale française 14 juillet"],
  ["Feux d’artifice", "feu d'artifice 14 juillet Paris"],
  ["Patrouille de France", "Patrouille de France 14 juillet"],
  ["Prise de la Bastille", "prise de la Bastille peinture"],
  ["Révolution française", "Révolution française peinture foule"],
];

const darkTopics = [
  ["Gilets jaunes", "Gilets jaunes France"],
  ["Réforme des retraites", "réforme retraites 2023 France"],
  ["Grèves SNCF", "grève SNCF France"],
  ["Grève des éboueurs", "grève éboueurs Paris 2023"],
  ["Conditions migratoires à Calais", "Jungle de Calais migrants"],
  ["Violences urbaines de 2023", "Nahel France 2023"],
  ["Sans-abrisme", "sans-abri Paris"],
  ["Canicules 2025–2026", "canicule Paris"],
  ["Incendies et sécheresse", "incendie forêt France"],
  ["Inondations", "inondation France"],
  ["Police et manifestations", "manifestation police France"],
  ["Mobilisations de 2025", "manifestation France 2025"],
  ["Hôpital public", "grève hôpital France"],
  ["Grèves RER", "RER Paris grève"],
  ["Traversées de la Manche", "migrants Manche Calais"],
  ["Climatisation et fortes chaleurs", "climatisation France canicule"],
  ["Campements de migrants à Paris", "camp migrants Paris"],
];

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function searchCommons(query) {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "30",
    gsrsearch: query,
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "640",
  }).toString();

  const { stdout } = await execFileAsync("curl", [
    "--max-time",
    "90",
    "--retry",
    "5",
    "--retry-all-errors",
    "--retry-delay",
    "2",
    "--silent",
    "--show-error",
    "-H",
    `User-Agent: ${USER_AGENT}`,
    url.toString(),
  ], { maxBuffer: 5_000_000 });
  const payload = JSON.parse(stdout);
  const pages = Object.values(payload.query?.pages ?? {});

  return pages
    .sort((a, b) => a.index - b.index)
    .flatMap((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || info.mime !== "image/jpeg") return [];
      const title = page.title.replace(/^File:/, "");
      return [{
        title,
        remoteUrl: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(title)}?width=640`,
        sourceUrl: info.descriptionurl,
      }];
    });
}

async function downloadPool({
  topics,
  perTopic,
  outputDirectory,
  publicPrefix,
  initialRecords = [],
}) {
  await mkdir(outputDirectory, { recursive: true });
  const records = [...initialRecords];
  const usedSources = new Set(records.map((record) => record.sourceUrl));

  for (const [topic, query] of topics) {
    const candidates = await searchCommons(query);
    let accepted = 0;

    for (const candidate of candidates) {
      if (accepted >= perTopic) break;
      if (usedSources.has(candidate.sourceUrl)) continue;

      try {
        const number = String(records.length + 1).padStart(3, "0");
        const fileName = `${number}.jpg`;
        const targetPath = path.join(outputDirectory, fileName);
        await execFileAsync("curl", [
          "-L",
          "--fail",
          "--silent",
          "--show-error",
          "--max-time",
          "90",
          "--retry",
          "4",
          "--retry-all-errors",
          "--retry-delay",
          "2",
          "--remove-on-error",
          "-A",
          USER_AGENT,
          "-o",
          targetPath,
          candidate.remoteUrl,
        ]);

        const fileStats = await stat(targetPath);
        if (fileStats.size < 5000) {
          await unlink(targetPath);
          continue;
        }

        records.push({
          id: `${publicPrefix.replaceAll("/", "-")}-${number}`,
          topic,
          title: candidate.title.replace(/\.[^.]+$/, ""),
          imageUrl: `${publicPrefix}/${fileName}`,
          sourceUrl: candidate.sourceUrl,
          searchTerm: query,
        });
        usedSources.add(candidate.sourceUrl);
        accepted += 1;
        process.stdout.write(`${topic}: ${accepted}/${perTopic} (${records.length} total)\n`);
      } catch (error) {
        process.stderr.write(`Skipped ${candidate.title}: ${error.message}\n`);
      }

      await wait(1000);
    }

    process.stdout.write(`${topic}: accepted ${accepted}/${perTopic}\n`);
    await wait(1600);
  }

  return records;
}

const goodDirectory = path.join(ROOT, "public/images/bastille-day-2-good");
const darkDirectory = path.join(ROOT, "public/images/bastille-day-2-dark");
const componentDirectory = path.join(ROOT, "components/standalone/bastille-day/2");
await mkdir(componentDirectory, { recursive: true });

let goodRecords;
try {
  goodRecords = JSON.parse(
    await readFile(path.join(componentDirectory, "good-sources.json"), "utf8"),
  );
  goodRecords = goodRecords.map((record) => ({
    ...record,
    topic: record.topic === "Défilé du 14 juillet 2025"
      ? "Défilés du 14 juillet"
      : record.topic,
  }));
  process.stdout.write(`Reusing good=${goodRecords.length}\n`);
} catch {
  goodRecords = await downloadPool({
    topics: goodTopics,
    perTopic: 5,
    outputDirectory: goodDirectory,
    publicPrefix: "/images/bastille-day-2-good",
  });
}

let existingDarkRecords = [];
try {
  existingDarkRecords = JSON.parse(
    await readFile(path.join(componentDirectory, "dark-sources.json"), "utf8"),
  );
} catch {
  // The first successful run creates the ledger.
}

const existingDarkTopics = new Set(
  existingDarkRecords.map((record) => record.topic),
);
const missingDarkTopics = darkTopics.filter(
  ([topic]) => !existingDarkTopics.has(topic),
);
const darkRecords = missingDarkTopics.length > 0
  ? await downloadPool({
      topics: missingDarkTopics,
      perTopic: 5,
      outputDirectory: darkDirectory,
      publicPrefix: "/images/bastille-day-2-dark",
      initialRecords: existingDarkRecords,
    })
  : existingDarkRecords;

await writeFile(
  path.join(componentDirectory, "good-sources.json"),
  `${JSON.stringify(goodRecords, null, 2)}\n`,
);
await writeFile(
  path.join(componentDirectory, "dark-sources.json"),
  `${JSON.stringify(darkRecords, null, 2)}\n`,
);

process.stdout.write(`DONE good=${goodRecords.length} dark=${darkRecords.length}\n`);
