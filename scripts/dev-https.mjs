import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

const root = process.cwd();
const certDir = join(root, "certificates");
const hostnameFile = join(certDir, ".hostname");
const appPort = Number.parseInt(process.env.PORT || "3000", 10);
const socketPort = Number.parseInt(process.env.SOCKET_PORT || "3001", 10);

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

function canBind(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });
}

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
    },
  });
}

const nextProcess = spawnNext();
const children = [nextProcess];

if (await canBind(socketPort)) {
  children.push(spawnSocket());
} else {
  console.log(
    `> Socket relay not started: port ${socketPort} is already in use.`,
  );
}

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
