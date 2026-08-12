import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(appRoot, "../..");
const componentRoot = join(appRoot, "components");
const publicRoot = join(appRoot, "public");
const sourceExtensions = new Set([".css", ".json", ".ts", ".tsx"]);
const localAssetPattern = /["'`](\/(?:assets|images)\/[^"'`\s)]+)/g;
const references = new Map();

function visit(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      visit(path);
      continue;
    }
    if (!sourceExtensions.has(extname(path))) continue;

    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(localAssetPattern)) {
      const assetPath = match[1];
      if (assetPath.includes("${number}")) {
        for (let index = 1; index <= 75; index += 1) {
          const expanded = assetPath.replace("${number}", String(index).padStart(3, "0"));
          references.set(expanded, relative(repositoryRoot, path));
        }
        continue;
      }
      if (!assetPath.includes("${")) {
        references.set(assetPath, relative(repositoryRoot, path));
      }
    }
  }
}

visit(componentRoot);

const missing = [...references]
  .filter(([assetPath]) => !existsSync(join(publicRoot, assetPath)))
  .map(([assetPath, source]) => ({ assetPath, source }));

if (missing.length > 0) {
  console.error(JSON.stringify({ checked: references.size, missing }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify({ checked: references.size, missing: 0, app: "goldfishes" }),
);
