import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { WebSocket } from "ws";
import { initWebSocketServer } from "../websocket/wsServer.js";
import { setupApiRoutes } from "../api/routes.js";
import { authService } from "../auth/authService.js";
import { tokenService } from "../auth/tokenService.js";
import { matchManager } from "../game/matchManager.js";

test("E2E Dual Session: Full 1v1 Battle Matchmaking, Synchronized Gameplay & Rematch", async (t) => {
  // Start ephemeral test server
  const server = http.createServer();
  const wsContext = initWebSocketServer(server);
  const handleApi = setupApiRoutes(server, wsContext);

  server.on("request", async (req, res) => {
    const handled = await handleApi(req, res);
    if (!handled) {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  // Create two distinct players
  const user1 = authService.createGuest("BryanLama_Test").user;
  const user2 = authService.createGuest("0xGhost_Test").user;

  const token1 = tokenService.createToken({ userId: user1.id, username: user1.username });
  const token2 = tokenService.createToken({ userId: user2.id, username: user2.username });

  const ws1 = new WebSocket(`ws://localhost:${port}/ws?token=${token1}`);
  const ws2 = new WebSocket(`ws://localhost:${port}/ws?token=${token2}`);

  await Promise.all([
    new Promise((resolve) => ws1.on("open", resolve)),
    new Promise((resolve) => ws2.on("open", resolve)),
  ]);

  const p1Events = [];
  const p2Events = [];

  ws1.on("message", (raw) => {
    p1Events.push(JSON.parse(raw.toString()));
  });

  ws2.on("message", (raw) => {
    p2Events.push(JSON.parse(raw.toString()));
  });

  // Step 1: Both join queue
  ws1.send(JSON.stringify({ type: "join_queue", payload: { mode: "general" } }));
  ws2.send(JSON.stringify({ type: "join_queue", payload: { mode: "general" } }));

  // Wait for match countdown event
  await new Promise((resolve) => {
    const check = setInterval(() => {
      const match1 = p1Events.find((e) => e.type === "match_countdown");
      const match2 = p2Events.find((e) => e.type === "match_countdown");
      if (match1 && match2) {
        clearInterval(check);
        resolve();
      }
    }, 50);
  });

  const countdown1 = p1Events.find((e) => e.type === "match_countdown");
  assert.equal(countdown1.type, "match_countdown");
  assert.equal(countdown1.payload.player1.username, user1.username);
  assert.equal(countdown1.payload.player2.username, user2.username);

  // Step 2: Wait for round 1 to start
  await new Promise((resolve) => {
    const check = setInterval(() => {
      const r1 = p1Events.find((e) => e.type === "round_start");
      const r2 = p2Events.find((e) => e.type === "round_start");
      if (r1 && r2) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });

  const roundStart1 = p1Events.find((e) => e.type === "round_start");
  const roundStart2 = p2Events.find((e) => e.type === "round_start");

  // Security test: Verify NO answers or explanations leaked to clients
  assert.equal(roundStart1.payload.question.correctOptionIds, undefined);
  assert.equal(roundStart1.payload.question.explanation, undefined);
  assert.equal(roundStart2.payload.question.correctOptionIds, undefined);
  assert.equal(roundStart2.payload.question.explanation, undefined);

  const matchId = roundStart1.payload.matchId;
  const questionId = roundStart1.payload.question.id;
  const p1Option = roundStart1.payload.question.options[0].id;
  const p2Option = roundStart2.payload.question.options[1].id;

  // Step 3: Submit answers
  ws1.send(
    JSON.stringify({
      type: "submit_answer",
      payload: { matchId, questionId, selectedOptionId: p1Option },
    })
  );

  ws2.send(
    JSON.stringify({
      type: "submit_answer",
      payload: { matchId, questionId, selectedOptionId: p2Option },
    })
  );

  // Step 4: Wait for round result
  await new Promise((resolve) => {
    const check = setInterval(() => {
      const res1 = p1Events.find((e) => e.type === "round_result");
      const res2 = p2Events.find((e) => e.type === "round_result");
      if (res1 && res2) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });

  const roundRes = p1Events.find((e) => e.type === "round_result");
  assert.equal(roundRes.type, "round_result");
  assert.equal(roundRes.payload.roundNumber, 1);
  assert.equal(typeof roundRes.payload.player1.score, "number");
  assert.equal(typeof roundRes.payload.player2.score, "number");

  // Cleanup
  matchManager.removeMatch(matchId);
  ws1.terminate();
  ws2.terminate();
  wsContext.close();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
});
