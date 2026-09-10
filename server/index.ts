import { createServer } from "node:http";
import next from "next";
import nextEnv from "@next/env";
import { createRealtime } from "./realtime";

const dev =
  !process.argv.includes("--production") &&
  process.env.NODE_ENV !== "production";
Object.assign(process.env, { NODE_ENV: dev ? "development" : "production" });
nextEnv.loadEnvConfig(process.cwd(), dev);
const portIndex = process.argv.indexOf("--port");
const port = Number(
  portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 3000,
);
const hostname = process.env.BIND_HOST || "0.0.0.0";
const allowedOrigins = (process.env.APP_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const app = next({ dev, hostname, port });
await app.prepare();
const handler = app.getRequestHandler();
const httpServer = createServer((req, res) => {
  if (req.url === "/api/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ status: "ok", ...realtime.stats() }));
    return;
  }
  handler(req, res);
});
const realtime = createRealtime(httpServer, {
  allowedOrigins,
  turnUrls: process.env.TURN_URLS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  turnSecret: process.env.TURN_SECRET,
  maxConnectionsPerIp: Number(process.env.MAX_CONNECTIONS_PER_IP || 30),
});
httpServer.listen(port, hostname, () =>
  console.log(
    `Chatruletka: http://localhost:${port} (${dev ? "development" : "production"})`,
  ),
);
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  realtime.io.disconnectSockets(true);
  realtime.io.close();
  await app.close();
  httpServer.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
