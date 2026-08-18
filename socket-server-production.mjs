import { createServer } from "node:http";
import {
  createExperimentSocketServer,
  handleSocketHealth,
} from "./socket/create-socket-server.mjs";

const scope = process.env.SCC_SOCKET_SCOPE;
const registries = {
  "c-val": async () => (await import("./apps/c-val/socket/experiments/index.mjs")).cValExperiments,
  "ddong-meong": async () =>
    (await import("./apps/ddong-meong/socket/experiments/index.mjs"))
      .ddongMeongExperiments,
  goldfishes: async () =>
    (await import("./apps/goldfishes/socket/experiments/index.mjs"))
      .goldfishesExperiments,
  scc: async () => (await import("./apps/scc/socket/experiments/index.mjs")).sccExperiments,
};

if (!scope || !Object.hasOwn(registries, scope)) {
  throw new Error(
    'SCC_SOCKET_SCOPE must be one of "c-val", "ddong-meong", "goldfishes", or "scc" in production.',
  );
}

const allowedOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  throw new Error(
    "SOCKET_ALLOWED_ORIGINS must contain the deployed app origin for this relay.",
  );
}
if (allowedOrigins.includes("*")) {
  throw new Error("SOCKET_ALLOWED_ORIGINS must not use \"*\" in production.");
}

const experiments = await registries[scope]();
const hostname = process.env.SOCKET_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PORT || process.env.SOCKET_PORT || "4000", 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT/SOCKET_PORT must be an integer between 1 and 65535.");
}
let handleExperimentRequest;

const httpServer = createServer((request, response) => {
  if (request.url === "/cert") {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Production TLS is provided by the reverse proxy.\n");
    return;
  }
  if (handleSocketHealth(request, response, undefined, experiments)) return;
  if (handleExperimentRequest?.(request, response)) return;
  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found\n");
});

({ handleExperimentRequest } = createExperimentSocketServer(
  httpServer,
  experiments,
  { allowedOrigins },
));

httpServer.listen(port, hostname, () => {
  console.log(`> SCC Socket.IO relay (${scope}) ready on http://${hostname}:${port}`);
});
