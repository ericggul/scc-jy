import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Server } from "socket.io";
import { experiments } from "./experiments/index.mjs";

export function handleSocketHealth(req, res, certDir = join(process.cwd(), "certificates")) {
  if (req.url === "/cert") {
    res.writeHead(200, { "content-type": "application/x-x509-ca-cert" });
    res.end(readFileSync(join(certDir, "rootCA.pem")));
    return true;
  }

  if (req.url === "/socket") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "scc-socket",
        secure: true,
        experiments: experiments.map((experiment) => experiment.id),
      }),
    );
    return true;
  }

  return false;
}

export function createExperimentSocketServer(httpServer) {
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

  return io;
}
