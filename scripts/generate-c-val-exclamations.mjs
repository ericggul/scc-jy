import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = process.cwd();
const defaultConfigPath = path.join(
  root,
  "scripts/collections/c-val-exclamations.json",
);

function printHelp() {
  process.stdout.write(`Generate iterative C-VAL voice takes with the OpenAI speech API.

Usage:
  pnpm audio:c-val -- [options]

Options:
  --run <name>          Stable name for this run (default: UTC timestamp)
  --preset <ids>        Comma-separated preset IDs (default: all)
  --dialect <ids>       Comma-separated dialect IDs or "all"
  --takes <number>      Takes per preset (default: config value)
  --text <text>         Override the spoken text
  --voice <voice>       Override the configured voice
  --model <model>       Override the configured model
  --format <format>     wav, mp3, flac, aac, opus, or pcm
  --concurrency <n>     Simultaneous requests (default: config value)
  --suffix <direction>  Append one experimental direction to every prompt
  --config <path>       Use a different JSON configuration
  --corpus <path>       Use a validated styles/candidates corpus as presets
  --keep-raw            Preserve untouched API responses under raw/
  --no-postprocess      Keep generated audio untouched
  --dry-run             Print the request plan without calling the API
  --help                Show this help

Example:
  pnpm audio:c-val -- --run anger-v03 --preset anger --takes 8 \\
    --suffix "Make the first word quieter and the last word more explosive."
`);
}

function parseArguments(argv) {
  const options = {};
  const valueOptions = new Set([
    "run",
    "preset",
    "dialect",
    "takes",
    "text",
    "voice",
    "model",
    "format",
    "concurrency",
    "suffix",
    "config",
    "corpus",
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const key = argument.slice(2);
    if (
      key === "help" ||
      key === "dry-run" ||
      key === "keep-raw" ||
      key === "no-postprocess"
    ) {
      options[key] = true;
      continue;
    }
    if (!valueOptions.has(key)) {
      throw new Error(`Unknown option: --${key}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key] = value;
    index += 1;
  }

  return options;
}

function positiveInteger(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function makeRunName() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function validateRunName(runName) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runName)) {
    throw new Error(
      "--run may contain only letters, numbers, periods, underscores, and hyphens.",
    );
  }
}

function validateConfig(config) {
  const formats = new Set(["wav", "mp3", "flac", "aac", "opus", "pcm"]);
  if (!config.model || !config.voice || !config.text || !config.baseInstructions) {
    throw new Error("Config requires model, voice, text, and baseInstructions.");
  }
  if (!formats.has(config.format)) {
    throw new Error(`Unsupported format in config: ${config.format}`);
  }
  if (!Array.isArray(config.presets) || config.presets.length === 0) {
    throw new Error("Config requires at least one preset.");
  }
  if (!Array.isArray(config.dialects) || config.dialects.length === 0) {
    throw new Error("Config requires at least one dialect.");
  }

  const dialectIds = new Set();
  for (const dialect of config.dialects) {
    if (!dialect.id || !dialect.label || !dialect.instructions) {
      throw new Error("Every dialect requires id, label, and instructions.");
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(dialect.id)) {
      throw new Error(`Invalid dialect id: ${dialect.id}`);
    }
    if (dialectIds.has(dialect.id)) {
      throw new Error(`Duplicate dialect id: ${dialect.id}`);
    }
    dialectIds.add(dialect.id);
  }
  for (const id of config.defaultDialects ?? []) {
    if (!dialectIds.has(id)) {
      throw new Error(`Unknown default dialect: ${id}`);
    }
  }

  const ids = new Set();
  for (const preset of config.presets) {
    if (!preset.id || !preset.label || !preset.instructions) {
      throw new Error("Every preset requires id, label, and instructions.");
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(preset.id)) {
      throw new Error(`Invalid preset id: ${preset.id}`);
    }
    if (ids.has(preset.id)) {
      throw new Error(`Duplicate preset id: ${preset.id}`);
    }
    ids.add(preset.id);
    if (preset.tempo !== undefined && (preset.tempo < 0.5 || preset.tempo > 2)) {
      throw new Error(`Preset tempo must be between 0.5 and 2: ${preset.id}`);
    }
  }

  if (config.postprocess?.enabled) {
    const tempo = config.postprocess.defaultTempo;
    if (tempo !== undefined && (tempo < 0.5 || tempo > 2)) {
      throw new Error("postprocess.defaultTempo must be between 0.5 and 2.");
    }
  }
}

async function loadApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;

  const envPath = path.join(root, ".env");
  try {
    const source = await readFile(envPath, "utf8");
    const line = source
      .split(/\r?\n/)
      .find((candidate) => /^\s*(?:export\s+)?OPENAI_API_KEY\s*=/.test(candidate));
    if (!line) return null;

    const rawValue = line.replace(/^\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*/, "").trim();
    return rawValue.replace(/^(["'])(.*)\1$/, "$2");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function composeInstructions(config, preset, dialect, suffix) {
  return [
    config.baseInstructions.trim(),
    dialect.instructions.trim(),
    preset.instructions.trim(),
    suffix?.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function requestSpeech({ apiKey, model, voice, text, instructions, format }) {
  const maximumAttempts = 5;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          voice,
          input: text,
          instructions,
          response_format: format,
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      if (attempt === maximumAttempts) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * 2 ** (attempt - 1)),
      );
      continue;
    }

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }

    const responseText = await response.text();
    let detail = responseText;
    try {
      detail = JSON.parse(responseText).error?.message ?? responseText;
    } catch {
      // Preserve the plain response when the server did not return JSON.
    }
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === maximumAttempts) {
      throw new Error(`Speech API ${response.status}: ${detail}`);
    }
    await new Promise((resolve) =>
      setTimeout(resolve, 500 * 2 ** (attempt - 1)),
    );
  }
  throw new Error("Speech API request exhausted all retry attempts.");
}

const styleTempo = {
  fast: 1.12,
  "medium-fast": 1.08,
  slow: 0.96,
  medium: 1.02,
  "medium-slow": 0.98,
  "quiet-medium": 1,
  "broken-medium": 1,
};

function presetsFromCorpus(corpus) {
  if (!corpus.validation?.passed) {
    throw new Error("Corpus validation.passed must be true before generation.");
  }
  if (!Array.isArray(corpus.styles) || !Array.isArray(corpus.candidates)) {
    throw new Error("Corpus requires styles and candidates arrays.");
  }

  const styles = new Map(corpus.styles.map((style) => [style.id, style]));
  const ids = new Set();
  return corpus.candidates.map((candidate) => {
    const style = styles.get(candidate.style);
    if (!style) throw new Error(`Unknown corpus style: ${candidate.style}`);
    if (ids.has(candidate.id)) {
      throw new Error(`Duplicate corpus candidate id: ${candidate.id}`);
    }
    ids.add(candidate.id);
    return {
      id: candidate.id,
      label: candidate.text,
      text: candidate.text,
      tempo: styleTempo[style.tempo] ?? 1,
      instructions: style.actingCue,
      styleId: style.id,
      profanityPosition: candidate.profanityPosition,
    };
  });
}

async function postprocessAudio({ sourcePath, targetPath, tempo, settings }) {
  const threshold = settings.trimThresholdDb ?? -48;
  const duration = settings.trimDurationSeconds ?? 0.025;
  const silenceTrim = [
    `silenceremove=start_periods=1:start_duration=${duration}:start_threshold=${threshold}dB`,
    "areverse",
    `silenceremove=start_periods=1:start_duration=${duration}:start_threshold=${threshold}dB`,
    "areverse",
  ].join(",");
  const filter = `${silenceTrim},atempo=${tempo},afade=t=in:d=0.006,areverse,afade=t=in:d=0.006,areverse`;

  await execFileAsync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    sourcePath,
    "-af",
    filter,
    targetPath,
  ]);
}

async function runWithConcurrency(tasks, concurrency, worker) {
  let nextIndex = 0;
  let failure = null;
  const results = new Array(tasks.length);

  async function consume() {
    while (nextIndex < tasks.length && !failure) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        results[currentIndex] = await worker(tasks[currentIndex], currentIndex);
      } catch (error) {
        failure ??= error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => consume()),
  );
  if (failure) throw failure;
  return results;
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const configPath = path.resolve(root, options.config ?? defaultConfigPath);
const config = JSON.parse(await readFile(configPath, "utf8"));
const corpusPath = options.corpus ? path.resolve(root, options.corpus) : null;
if (corpusPath) {
  const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
  config.presets = presetsFromCorpus(corpus);
  config.defaultTakes = 1;
}

if (options.voice) config.voice = options.voice;
if (options.model) config.model = options.model;
if (options.text) config.text = options.text;
if (options.format) config.format = options.format;
validateConfig(config);

const runName = options.run ?? makeRunName();
validateRunName(runName);
const takes = positiveInteger(options.takes ?? config.defaultTakes, "--takes");
const concurrency = positiveInteger(
  options.concurrency ?? config.concurrency,
  "--concurrency",
);
const requestedPresetIds = options.preset
  ? new Set(options.preset.split(",").map((id) => id.trim()).filter(Boolean))
  : null;
const presets = requestedPresetIds
  ? config.presets.filter((preset) => requestedPresetIds.has(preset.id))
  : config.presets;

const requestedDialectIds = options.dialect
  ? options.dialect === "all"
    ? new Set(config.dialects.map((dialect) => dialect.id))
    : new Set(options.dialect.split(",").map((id) => id.trim()).filter(Boolean))
  : new Set(config.defaultDialects ?? [config.dialects[0].id]);
const knownDialectIds = new Set(config.dialects.map((dialect) => dialect.id));
const unknownDialectIds = [...requestedDialectIds].filter(
  (id) => !knownDialectIds.has(id),
);
if (unknownDialectIds.length > 0) {
  throw new Error(`Unknown dialect(s): ${unknownDialectIds.join(", ")}`);
}
const dialects = config.dialects.filter((dialect) =>
  requestedDialectIds.has(dialect.id),
);

if (requestedPresetIds) {
  const knownIds = new Set(config.presets.map((preset) => preset.id));
  const unknownIds = [...requestedPresetIds].filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) {
    throw new Error(`Unknown preset(s): ${unknownIds.join(", ")}`);
  }
}

const outputRoot = path.resolve(root, config.outputRoot);
const outputDirectory = path.join(outputRoot, runName);
const postprocessEnabled =
  config.postprocess?.enabled === true && !options["no-postprocess"];
const keepRaw = postprocessEnabled && options["keep-raw"] === true;
const tasks = dialects.flatMap((dialect) =>
  presets.flatMap((preset) =>
    Array.from({ length: takes }, (_, index) => {
      const take = index + 1;
      const takeId = String(take).padStart(2, "0");
      return {
        id: `${dialect.id}-${preset.id}-take-${takeId}`,
        dialectId: dialect.id,
        dialectLabel: dialect.label,
        presetId: preset.id,
        styleId: preset.styleId ?? null,
        profanityPosition: preset.profanityPosition ?? null,
        label: preset.label,
        take,
        text: options.text ?? preset.text ?? config.text,
        tempo: preset.tempo ?? config.postprocess?.defaultTempo ?? 1,
        fileName: `${dialect.id}-${preset.id}-take-${takeId}.${config.format}`,
        instructions: composeInstructions(
          config,
          preset,
          dialect,
          options.suffix,
        ),
      };
    }),
  ),
);

process.stdout.write(
  `${options["dry-run"] ? "planning" : "generating"} ${tasks.length} take(s) in ${path.relative(root, outputDirectory)}\n`,
);
process.stdout.write(
  `model=${config.model} voice=${config.voice} format=${config.format} postprocess=${postprocessEnabled}\n`,
);

if (options["dry-run"]) {
  for (const task of tasks) {
    process.stdout.write(
      `- ${task.fileName}: ${task.dialectLabel} / ${task.label} / take ${task.take} / tempo ${task.tempo} / ${JSON.stringify(task.text)}\n`,
    );
  }
  process.exit(0);
}

if (await pathExists(outputDirectory)) {
  throw new Error(
    `Run already exists: ${path.relative(root, outputDirectory)}. Choose another --run name.`,
  );
}

const apiKey = await loadApiKey();
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is required in the environment or repository .env file.");
}

await mkdir(outputDirectory, { recursive: true });
const manifestPath = path.join(outputDirectory, "manifest.json");
const manifest = {
  schemaVersion: 1,
  status: "generating",
  generatedAt: new Date().toISOString(),
  run: runName,
  config: path.relative(root, configPath),
  corpus: corpusPath ? path.relative(root, corpusPath) : null,
  model: config.model,
  voice: config.voice,
  format: config.format,
  text: config.text,
  suffix: options.suffix ?? null,
  postprocess: postprocessEnabled ? config.postprocess : null,
  keepRaw,
  takesPerPreset: takes,
  dialects: dialects.map(({ id, label }) => ({ id, label })),
  files: [],
};

async function writeManifest() {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

await writeManifest();
const temporarySourceDirectory =
  postprocessEnabled && !keepRaw
    ? await mkdtemp(path.join(os.tmpdir(), "scc-cval-audio-source-"))
    : null;

try {
  await runWithConcurrency(tasks, concurrency, async (task) => {
    const targetPath = path.join(outputDirectory, task.fileName);
    const extension = path.extname(targetPath);
    const partialPath = `${targetPath.slice(0, -extension.length)}.partial${extension}`;
    const rawDirectory = keepRaw
      ? path.join(outputDirectory, "raw")
      : temporarySourceDirectory;
    const rawPath = path.join(rawDirectory, task.fileName);
    const audio = await requestSpeech({
      apiKey,
      model: config.model,
      voice: config.voice,
      text: task.text,
      instructions: task.instructions,
      format: config.format,
    });

    if (postprocessEnabled) {
      if (keepRaw) await mkdir(rawDirectory, { recursive: true });
      await writeFile(rawPath, audio);
      await postprocessAudio({
        sourcePath: rawPath,
        targetPath: partialPath,
        tempo: task.tempo,
        settings: config.postprocess,
      });
      await rename(partialPath, targetPath);
    } else {
      await writeFile(partialPath, audio);
      await rename(partialPath, targetPath);
    }

    const finalAudio = await readFile(targetPath);

    const record = {
      ...task,
      src: `/${path.relative(path.join(root, "public"), targetPath)}`,
      ...(keepRaw
        ? {
            rawSrc: `/${path.relative(path.join(root, "public"), rawPath)}`,
            rawBytes: audio.byteLength,
          }
        : {}),
      bytes: finalAudio.byteLength,
    };
    manifest.files.push(record);
    manifest.files.sort((a, b) => a.id.localeCompare(b.id));
    await writeManifest();
    process.stdout.write(`generated ${task.fileName} (${finalAudio.byteLength} bytes)\n`);
    return record;
  });
  manifest.status = "complete";
  manifest.completedAt = new Date().toISOString();
  await writeManifest();
  process.stdout.write(`complete: ${path.relative(root, outputDirectory)}\n`);
} catch (error) {
  manifest.status = "failed";
  manifest.failedAt = new Date().toISOString();
  manifest.error = error.message;
  await writeManifest();
  throw error;
} finally {
  if (temporarySourceDirectory) {
    await rm(temporarySourceDirectory, { recursive: true, force: true });
  }
}
