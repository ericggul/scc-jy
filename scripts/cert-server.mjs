import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

const hostname = process.env.CERT_HOST || "0.0.0.0";
const port = Number.parseInt(process.env.CERT_PORT || "4080", 10);
const certPath = join(process.cwd(), "certificates", "rootCA.pem");

const server = createServer((req, res) => {
  if (req.url === "/cert") {
    res.writeHead(200, {
      "content-type": "application/x-x509-ca-cert",
      "content-disposition": 'attachment; filename="scc-rootCA.pem"',
    });
    res.end(readFileSync(certPath));
    return;
  }

  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("SCC local Root CA: open /cert to download.\n");
});

server.listen(port, hostname, () => {
  console.log(`> SCC Root CA download ready at http://${hostname}:${port}/cert`);
});
