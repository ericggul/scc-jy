import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

const root = process.cwd();
const certDir = join(root, "certificates");
const hostnameFile = join(certDir, ".hostname");
const appPort = Number.parseInt(process.env.PORT || "3000", 10);
const socketPort = Number.parseInt(
  process.env.NEXT_PUBLIC_SOCKET_PORT || process.env.SOCKET_PORT || "4000",
  10,
);

function assertPortAvailable(port, serviceName, host) {
  return new Promise((resolve, reject) => {
    const probe = createServer();

    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `${serviceName} port ${port} is already in use on ${host}. Stop the existing development server or set a different port before running pnpm dev.`,
          ),
        );
        return;
      }

      reject(error);
    });

    probe.listen({ host, port, exclusive: true }, () => {
      probe.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });
}

if (appPort === socketPort) {
  console.error(
    `App and Socket.IO relay cannot both use port ${appPort}. Set SOCKET_PORT or NEXT_PUBLIC_SOCKET_PORT to a different port.`,
  );
  process.exit(1);
}

try {
  await assertPortAvailable(appPort, "Next.js", "0.0.0.0");
  await assertPortAvailable(appPort, "Next.js", "::");
  await assertPortAvailable(socketPort, "Socket.IO relay", "0.0.0.0");
  await assertPortAvailable(socketPort, "Socket.IO relay", "::");
} catch (error) {
  console.error(`\n> ${error.message}\n`);
  process.exit(1);
}

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
