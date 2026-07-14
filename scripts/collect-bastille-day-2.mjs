import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_URL = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "SCC-Bastille-Experiment/2.0 (local art research)";
const ROOT = process.cwd();

const goodTopics = [
  ["Défilé du 14 juillet 2025", "défilé du 14 juillet Paris 2025"],
  ["Fête nationale française", "fête nationale française 14 juillet"],
  ["Feux d’artifice", "feu d'artifice 14 juillet Paris"],
  ["Patrouille de France", "Patrouille de France 14 juillet"],
  ["Prise de la Bastille", "prise de la Bastille peinture"],
  ["Révolution française", "Révolution française peinture foule"],
];

const darkTopics = [
  ["Mobilisations de 2025", "mouvement 10 septembre 2025 France manifestation"],
  ["Gilets jaunes", "mouvement des Gilets jaunes France manifestation"],
  ["Réforme des retraites", "manifestation réforme des retraites France 2023"],
  ["Grèves SNCF et RER", "grève SNCF RER France gare fermée"],
  ["Grève des éboueurs", "grève des éboueurs Paris 2023 déchets rue"],
  ["Conditions migratoires à Calais", "Jungle de Calais camp migrants réfugiés"],
  ["Traversées de la Manche", "migrants small boats Manche Calais France"],
  ["Violences urbaines de 2023", "émeutes Nahel violences urbaines France 2023"],
  ["Police et manifestations", "affrontements police manifestation France"],
  ["Sans-abrisme", "tente sans-abri Paris France rue"],
  ["Hôpital public", "hôpital public grève manifestation France"],
  ["Précarité alimentaire", "aide alimentaire précarité France distribution"],
  ["Mobilisations agricoles", "manifestation agriculteurs France tracteurs"],
  ["Canicules 2025–2026", "canicule France chaleur ville thermomètre"],
  ["Incendies et sécheresse", "incendie forêt sécheresse France pompiers"],
  ["Inondations", "inondation France catastrophe climatique"],
];

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url, options = {}, attempts = 6) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: { "User-Agent": USER_AGENT, ...options.headers },
      redirect: "follow",
    });

    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }

    await wait(attempt * 1500);
  }

  throw new Error(`Request failed after retries: ${url}`);
}

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

  const response = await fetchWithRetry(url);
  const payload = await response.json();
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

async function downloadPool({ topics, perTopic, outputDirectory, publicPrefix }) {
  await mkdir(outputDirectory, { recursive: true });
  const records = [];
  const usedSources = new Set();

  for (const [topic, query] of topics) {
    const candidates = await searchCommons(query);
    let accepted = 0;

    for (const candidate of candidates) {
      if (accepted >= perTopic) break;
      if (usedSources.has(candidate.sourceUrl)) continue;

      try {
        const response = await fetchWithRetry(candidate.remoteUrl, {}, 3);
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.startsWith("image/jpeg")) continue;

        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength < 5000) continue;

        const number = String(records.length + 1).padStart(3, "0");
        const fileName = `${number}.jpg`;
        await writeFile(path.join(outputDirectory, fileName), bytes);

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
const componentDirectory = path.join(ROOT, "components/bastille-day/2");
await mkdir(componentDirectory, { recursive: true });

const goodRecords = await downloadPool({
  topics: goodTopics,
  perTopic: 5,
  outputDirectory: goodDirectory,
  publicPrefix: "/images/bastille-day-2-good",
});

const darkRecords = await downloadPool({
  topics: darkTopics,
  perTopic: 5,
  outputDirectory: darkDirectory,
  publicPrefix: "/images/bastille-day-2-dark",
});

await writeFile(
  path.join(componentDirectory, "good-sources.json"),
  `${JSON.stringify(goodRecords, null, 2)}\n`,
);
await writeFile(
  path.join(componentDirectory, "dark-sources.json"),
  `${JSON.stringify(darkRecords, null, 2)}\n`,
);

process.stdout.write(`DONE good=${goodRecords.length} dark=${darkRecords.length}\n`);
