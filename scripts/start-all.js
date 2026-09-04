import { spawn } from "node:child_process";

console.log("Starting Jackal full-stack competitive environment...");

const server = spawn("node", ["server/index.js"], {
  stdio: "inherit",
  shell: true,
});

const vite = spawn("npx", ["vite"], {
  stdio: "inherit",
  shell: true,
});

function cleanup() {
  server.kill();
  vite.kill();
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
