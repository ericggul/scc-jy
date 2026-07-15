import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const countryDataPath = path.join(root, "components/standalone/swarm/2/countries.json");
const outputDirectory = path.join(root, "public/audio/swarm-campaigns");
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "scc-swarm-campaign-audio-"),
);

const CAMPAIGN_KEYWORDS = {
  USA: "America",
  GBR: "Britain",
  KOR: "Korea",
  PRK: "Korea",
  ARE: "Emirates",
  COD: "Congo",
  COG: "Congo",
  CZE: "Czechia",
};

const countryData = JSON.parse(fs.readFileSync(countryDataPath, "utf8"));
const campaigns = countryData.countries.map((country) => {
  const keyword = CAMPAIGN_KEYWORDS[country.id] ?? country.name;
  const initial = keyword.match(/[A-Za-z]/)?.[0]?.toUpperCase() ?? "X";

  return {
    id: country.id,
    countryName: country.name,
    campaignCode: `M${initial}GA`,
    campaignName: `Make ${keyword} Great Again`,
  };
});

campaigns.push({
  id: "OCEAN",
  countryName: "Ocean",
  campaignCode: "MFGA",
  campaignName: "Make Fishes Great Again",
});

fs.mkdirSync(outputDirectory, { recursive: true });

const manifest = [];

try {
  for (const [index, campaign] of campaigns.entries()) {
    const fileStem = campaign.id.toLowerCase();
    const sourcePath = path.join(temporaryDirectory, `${fileStem}.aiff`);
    const outputPath = path.join(outputDirectory, `${fileStem}.m4a`);

    const speech = spawnSync(
      "/usr/bin/say",
      [
        "-v",
        "Samantha",
        "-r",
        "165",
        "-o",
        sourcePath,
        campaign.campaignName,
      ],
      { encoding: "utf8" },
    );

    if (speech.status !== 0) {
      throw new Error(`say failed for ${campaign.id}: ${speech.stderr}`);
    }

    const encode = spawnSync(
      "/opt/homebrew/bin/ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-i",
        sourcePath,
        "-ac",
        "1",
        "-ar",
        "24000",
        "-c:a",
        "aac",
        "-b:a",
        "48k",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { encoding: "utf8" },
    );

    if (encode.status !== 0) {
      throw new Error(`ffmpeg failed for ${campaign.id}: ${encode.stderr}`);
    }

    manifest.push({
      ...campaign,
      src: `/audio/swarm-campaigns/${fileStem}.m4a`,
      bytes: fs.statSync(outputPath).size,
    });

    if ((index + 1) % 10 === 0 || index === campaigns.length - 1) {
      process.stdout.write(`generated ${index + 1}/${campaigns.length}\n`);
    }
  }

  fs.writeFileSync(
    path.join(outputDirectory, "manifest.json"),
    `${JSON.stringify({ voice: "Samantha", format: "aac", campaigns: manifest })}\n`,
  );
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
