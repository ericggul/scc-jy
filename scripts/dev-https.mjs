import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const certDir = join(root, "certificates");
const hostnameFile = join(certDir, ".hostname");
const appPort = Number.parseInt(process.env.PORT || "3000", 10);
const socketPort = Number.parseInt(
  process.env.NEXT_PUBLIC_SOCKET_PORT || process.env.SOCKET_PORT || "4000",
  10,
);

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

function spawnNext() {
  return spawn(
    "pnpm",
    [
      "exec",
      "next",
      "dev",
      "--hostname",
      "0.0.0.0",
      "--port",
      String(appPort),
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
        NEXT_PUBLIC_SOCKET_PORT: String(socketPort),
      },
    },
  );
}

function spawnSocket() {
  return spawn("node", ["socket-server.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_DEV_HOSTNAME: devHostname,
      SOCKET_PORT: String(socketPort),
      PORT: String(socketPort),
    },
  });
}

const nextProcess = spawnNext();
const socketProcess = spawnSocket();
const children = [nextProcess, socketProcess];

console.log("");
console.log(`> Open app: https://${devHostname}:${appPort}`);
console.log(`> Socket relay: https://${devHostname}:${socketPort}`);
console.log(`> Root CA download for devices: https://${devHostname}:${socketPort}/cert`);
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

nextProcess.on("exit", (code, signal) => {
  stopAll(signal || "SIGTERM");
  process.exit(code ?? 0);
});

socketProcess.on("exit", (code, signal) => {
  if (code && code !== 0) {
    stopAll(signal || "SIGTERM");
    process.exit(code);
  }
});
