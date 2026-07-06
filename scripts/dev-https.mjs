import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const certDir = join(root, "certificates");
const hostnameFile = join(certDir, ".hostname");

const certResult = spawnSync("bash", ["scripts/generate-certs.sh"], {
  cwd: root,
  stdio: "inherit",
});

if (certResult.status !== 0) {
  process.exit(certResult.status ?? 1);
}

const devHostname = existsSync(hostnameFile)
  ? readFileSync(hostnameFile, "utf8").trim()
  : "localhost";

const children = [
  spawn(
    "pnpm",
    [
      "exec",
      "next",
      "dev",
      "--experimental-https",
      "--experimental-https-key",
      "certificates/server.key",
      "--experimental-https-cert",
      "certificates/server.pem",
      "--experimental-https-ca",
      "certificates/rootCA.pem",
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_PUBLIC_DEV_HOSTNAME: devHostname,
      },
    },
  ),
  spawn("node", ["socket-server.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_DEV_HOSTNAME: devHostname,
    },
  }),
  spawn("node", ["scripts/cert-server.mjs"], {
    cwd: root,
    stdio: "inherit",
  }),
];

console.log("");
console.log(`> Open app: https://${devHostname}:3000`);
console.log(`> Socket relay: https://${devHostname}:3001`);
console.log(`> Root CA download for devices: http://${devHostname}:4080/cert`);
console.log("");

function stopAll(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopAll(signal);
    process.exit(0);
  });
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      stopAll(signal || "SIGTERM");
      process.exit(code);
    }
  });
}
