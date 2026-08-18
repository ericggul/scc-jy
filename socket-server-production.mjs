import { createServer } from "node:http";
import {
  createExperimentSocketServer,
  handleSocketHealth,
} from "./socket/create-socket-server.mjs";
import { cValExperiments } from "./apps/c-val/socket/experiments/index.mjs";
import { ddongMeongExperiments } from "./apps/ddong-meong/socket/experiments/index.mjs";

const experiments = Object.freeze([
  ...cValExperiments,
  ...ddongMeongExperiments,
]);

const configuredOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : ["https://c-val.vercel.app", "https://ddong-meong.vercel.app"];

if (allowedOrigins.includes("*")) {
  throw new Error("SOCKET_ALLOWED_ORIGINS must not use \"*\" in production.");
}

const hostname = process.env.SOCKET_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PORT || process.env.SOCKET_PORT || "4001", 10);
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
  console.log(`> SCC Socket.IO relay ready on http://${hostname}:${port}`);
});
