import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { join } from "node:path";
import {
  createExperimentSocketServer,
  handleSocketHealth,
} from "./socket/create-socket-server.mjs";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const hostname = process.env.SOCKET_HOST || "0.0.0.0";
const port = Number.parseInt(process.env.SOCKET_PORT || process.env.PORT || "4000", 10);
const certDir = join(process.cwd(), "certificates");

const serverOptions = {
  key: readFileSync(join(certDir, "server.key")),
  cert: readFileSync(join(certDir, "server.pem")),
  ca: readFileSync(join(certDir, "rootCA.pem")),
};

let handleExperimentRequest;

const httpServer = createServer(serverOptions, (req, res) => {
  if (handleSocketHealth(req, res, certDir)) return;
  if (handleExperimentRequest?.(req, res)) return;
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found\n");
});

({ handleExperimentRequest } = createExperimentSocketServer(httpServer));

httpServer.listen(port, hostname, () => {
  console.log(`> SCC Socket.IO relay ready on https://${hostname}:${port}`);
});
