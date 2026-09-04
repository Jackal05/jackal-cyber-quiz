import http from "node:http";
import { BATTLE_CONFIG } from "./config.js";
import { initWebSocketServer } from "./websocket/wsServer.js";
import { setupApiRoutes } from "./api/routes.js";
import { dbService } from "./db/index.js";
import { authService } from "./auth/authService.js";

const server = http.createServer();

// Initialize WebSocket server
const wsContext = initWebSocketServer(server);

// Initialize REST API routes
const handleApi = setupApiRoutes(server, wsContext);

server.on("request", async (req, res) => {
  const handled = await handleApi(req, res);
  if (!handled && !res.writableEnded) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

// Seed default accounts if database is fresh
function seedInitialData() {
  try {
    const existing = dbService.getUserByUsername("0xGhost");
    if (!existing) {
      console.log("Seeding initial benchmark profiles...");
      authService.register({ username: "0xGhost", password: "password123" });
      const ghost = dbService.getUserByUsername("0xGhost");
      dbService.updateProfilePostMatch(ghost.id, {
        rating: 1520,
        xpGain: 1200,
        newLevel: 4,
        isWin: true,
        isLoss: false,
        isDraw: false,
        currentStreak: 3,
        correctCount: 18,
        questionCount: 20,
        responseTimeMs: 38000,
      });

      authService.register({ username: "PacketHunter", password: "password123" });
      const hunter = dbService.getUserByUsername("PacketHunter");
      dbService.updateProfilePostMatch(hunter.id, {
        rating: 1390,
        xpGain: 850,
        newLevel: 3,
        isWin: true,
        isLoss: false,
        isDraw: false,
        currentStreak: 2,
        correctCount: 14,
        questionCount: 20,
        responseTimeMs: 42000,
      });

      authService.register({ username: "RootKernel", password: "password123" });
      const kernel = dbService.getUserByUsername("RootKernel");
      dbService.updateProfilePostMatch(kernel.id, {
        rating: 1680,
        xpGain: 2100,
        newLevel: 5,
        isWin: true,
        isLoss: false,
        isDraw: false,
        currentStreak: 5,
        correctCount: 24,
        questionCount: 25,
        responseTimeMs: 31000,
      });
    }
  } catch (err) {
    console.warn("Seed data note:", err?.message);
  }
}

seedInitialData();

const PORT = BATTLE_CONFIG.PORT;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ JACKAL Competitive Cybersecurity Training Engine ⚡`);
  console.log(`📡 HTTP Server & REST API listening on port ${PORT}`);
  console.log(`🔌 WebSocket real-time gateway live at ws://localhost:${PORT}/ws`);
  console.log(`======================================================\n`);
});
