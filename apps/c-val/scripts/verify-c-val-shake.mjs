#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
function usage() {
  return `Usage: pnpm --filter @scc/c-val test:shake -- [options]

Options:
  --trace <path>        Replay a recorded trace instead of generating one
  --seed <integer>      Synthetic gesture seed (default: 12648430)
  --market-seed <int>   Reproduce one market path instead of the 5-seed suite
  --json                Print the machine-readable report
  --help                Show this help

The command runs the production C-VAL model in-process. It never starts a
server, opens a browser, or mutates the shared socket market.`;
}

function parseInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${flag} requires a safe integer`);
  }
  return parsed;
}

function parseArguments(argv) {
  const options = {
    tracePath: null,
    seed: 0xc0ffee,
    marketSeed: null,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--trace") {
      const value = argv[++index];
      if (!value) throw new Error("--trace requires a file path");
      options.tracePath = value;
    } else if (argument === "--seed") {
      options.seed = parseInteger(argv[++index], "--seed");
    } else if (argument === "--market-seed") {
      options.marketSeed = parseInteger(
        argv[++index],
        "--market-seed",
      );
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--help") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
}

async function loadTrace(options, traceModule) {
  if (!options.tracePath) {
    return traceModule.generateCValShakeTrace({ seed: options.seed });
  }
  const absolutePath = resolve(process.cwd(), options.tracePath);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read trace ${absolutePath}: ${error.message}`);
  }
  return traceModule.validateCValOrientationTrace(parsed);
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
  } else {
    const harness = await import(
      "../socket/experiments/shake-harness.mjs"
    );
    const traceModule = await import(
      "../socket/experiments/shake-trace.mjs"
    );
    const trace = await loadTrace(options, traceModule);
    const report =
      options.marketSeed === null
        ? harness.runCValShakeRobustnessSuite(trace)
        : harness.runCValShakeHarness(trace, {
            marketSeed: options.marketSeed,
          });
    console.log(
      options.json
        ? JSON.stringify(report, null, 2)
        : options.marketSeed === null
          ? harness.formatCValShakeRobustnessSuiteReport(report)
          : harness.formatCValShakeHarnessReport(report),
    );
    if (!report.ok) process.exitCode = 1;
  }
} catch (error) {
  console.error(`C-VAL SHAKE HARNESS ERROR\n${error.message}`);
  process.exitCode = 2;
}
