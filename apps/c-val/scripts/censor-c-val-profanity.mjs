import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function usage() {
  process.stdout.write(`Replace one known profanity interval in a WAV file with a broadcast beep.

Usage:
  node apps/c-val/scripts/censor-c-val-profanity.mjs \\
    --input <wav> --output <wav> --start <seconds> --end <seconds>

Optional:
  --frequency <hz>   Beep frequency (default: 1000)
  --level <factor>   Sine amplitude multiplier (default: 1.4)
`);
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      options.help = true;
      continue;
    }
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  usage();
  process.exit(0);
}

if (!options.input || !options.output || !options.start || !options.end) {
  usage();
  throw new Error("--input, --output, --start, and --end are required.");
}

const start = Number(options.start);
const end = Number(options.end);
const frequency = Number(options.frequency ?? 1000);
const level = Number(options.level ?? 1.4);
if (![start, end, frequency, level].every(Number.isFinite) || start < 0 || end <= start) {
  throw new Error("Invalid timing, frequency, or level.");
}

const input = path.resolve(options.input);
const output = path.resolve(options.output);
const duration = end - start;
const fade = Math.min(0.006, duration / 4);
const delayMilliseconds = Math.round(start * 1000);
const filter = [
  `[0:a]volume=eval=frame:volume='if(between(t,${start},${end}),0,1)'[voice]`,
  `sine=frequency=${frequency}:sample_rate=24000:duration=${duration},volume=${level},afade=t=in:st=0:d=${fade},afade=t=out:st=${duration - fade}:d=${fade},adelay=${delayMilliseconds}[beep]`,
  `[voice][beep]amix=inputs=2:duration=first:normalize=0[out]`,
].join(";");

await mkdir(path.dirname(output), { recursive: true });
await execFileAsync("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  input,
  "-filter_complex",
  filter,
  "-map",
  "[out]",
  "-c:a",
  "pcm_s16le",
  "-ar",
  "24000",
  "-ac",
  "1",
  "-y",
  output,
]);

process.stdout.write(`${output}\n`);
