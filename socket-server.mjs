import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { join } from "node:path";
import { Server } from "socket.io";
import { experiments } from "./socket/experiments/index.mjs";

const hostname = process.env.SOCKET_HOST || "0.0.0.0";
const port = Number.parseInt(process.env.SOCKET_PORT || "3001", 10);
const certDir = join(process.cwd(), "certificates");

const serverOptions = {
  key: readFileSync(join(certDir, "server.key")),
  cert: readFileSync(join(certDir, "server.pem")),
  ca: readFileSync(join(certDir, "rootCA.pem")),
};

const httpServer = createServer(serverOptions, (req, res) => {
  if (req.url === "/cert") {
    res.writeHead(200, { "content-type": "application/x-x509-ca-cert" });
    res.end(readFileSync(join(certDir, "rootCA.pem")));
    return;
  }

  res.writeHead(200, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      service: "scc-socket",
      secure: true,
      experiments: experiments.map((experiment) => experiment.id),
    }),
  );
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  socket.emit("socket:hello", {
    socketId: socket.id,
    experiments: experiments.map((experiment) => ({
      id: experiment.id,
      events: experiment.events,
    })),
  });

  for (const experiment of experiments) {
    experiment.register({ io, socket });
  }
});

httpServer.listen(port, hostname, () => {
  console.log(`> SCC Socket.IO relay ready on https://${hostname}:${port}`);
  console.log(
    `> Registered experiments: ${experiments
      .map((experiment) => experiment.id)
      .join(", ")}`,
  );
});
