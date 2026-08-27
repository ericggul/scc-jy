import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const sshKey = [
  "/Users/jeongyoonchoi/Desktop/project/ydp/banpo-xism/banpo-xism-aws.pem",
  "/Users/jeongyoonchoi/Downloads/banpo-xism-aws.pem",
].find(existsSync);

if (!sshKey) {
  throw new Error("banpo-xism-aws.pem was not found in its known local locations.");
}

const remoteHost = "ubuntu@3.39.97.58";
const remoteRoot = "/home/ubuntu/scc-socket";
const sshArguments = ["-i", sshKey, "-o", "BatchMode=yes", "-o", "ConnectTimeout=10"];

function run(command, arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? "unknown"}.`));
    });
  });
}

await run("ssh", [
  ...sshArguments,
  remoteHost,
  `test -f ${remoteRoot}/socket-server-production.mjs && pm2 describe scc-io && ss -ltnp | grep ':4001'`,
]);

await run("rsync", [
  "-az",
  "--checksum",
  "--relative",
  "--exclude=.DS_Store",
  "--exclude=*.test.mjs",
  "-e",
  ["ssh", ...sshArguments].join(" "),
  "socket-server-production.mjs",
  "socket/create-socket-server.mjs",
  "apps/c-val/socket/experiments/",
  "apps/ddong-meong/socket/experiments/",
  "apps/scc/socket/experiments/",
  `${remoteHost}:${remoteRoot}/`,
]);

await run("ssh", [
  ...sshArguments,
  remoteHost,
  `cd ${remoteRoot} && node --check socket-server-production.mjs && pm2 restart scc-io && for attempt in 1 2 3 4 5 6 7 8 9 10; do curl -fsS http://127.0.0.1:4001/socket && exit 0; sleep 1; done; exit 1`,
]);
