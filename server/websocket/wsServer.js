import { WebSocketServer, WebSocket } from "ws";
import { tokenService } from "../auth/tokenService.js";
import { authService } from "../auth/authService.js";
import { queueManager } from "../matchmaking/queueManager.js";
import { matchManager } from "../game/matchManager.js";

export function initWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // userId -> Set<WebSocket>
  const userSockets = new Map();
  // ws -> { userId, username, matchId }
  const socketMetadata = new Map();

  function sendJson(ws, type, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  function broadcastToUser(userId, type, payload) {
    const sockets = userSockets.get(userId);
    if (sockets) {
      for (const ws of sockets) {
        sendJson(ws, type, payload);
      }
    }
  }

  function broadcastToMatch(matchId, type, payload) {
    const match = matchManager.getMatch(matchId);
    if (!match) return;

    if (type === "round_start" && payload.forPlayer1 && payload.forPlayer2) {
      // Send personalized question to each player
      const { forPlayer1, forPlayer2, ...rest } = payload;
      broadcastToUser(match.player1.id, type, { ...rest, question: forPlayer1 });
      broadcastToUser(match.player2.id, type, { ...rest, question: forPlayer2 });
      return;
    }

    broadcastToUser(match.player1.id, type, payload);
    broadcastToUser(match.player2.id, type, payload);
  }

  function getOnlineCount() {
    return userSockets.size;
  }

  // Queue callbacks
  queueManager.start({
    onMatchFound(p1, p2) {
      const match = matchManager.createMatch({
        player1: p1.profile,
        player2: p2.profile,
        mode: p1.mode,
        broadcastFn: broadcastToMatch,
      });

      // Associate matchId with player sockets
      const p1Sockets = userSockets.get(p1.userId);
      if (p1Sockets) p1Sockets.forEach((ws) => (socketMetadata.get(ws).matchId = match.id));
      const p2Sockets = userSockets.get(p2.userId);
      if (p2Sockets) p2Sockets.forEach((ws) => (socketMetadata.get(ws).matchId = match.id));
    },
    onQueueStatus(userId, status) {
      broadcastToUser(userId, "queue_status", {
        ...status,
        onlineCount: getOnlineCount(),
      });
    },
  });

  // Handle HTTP upgrade
  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    let authUser = null;
    if (token) {
      const payload = tokenService.verifyToken(token);
      if (payload) {
        authUser = authService.getProfile(payload.userId);
      }
    }

    if (!authUser) {
      sendJson(ws, "auth_required", { message: "Valid token required." });
    } else {
      registerUserSocket(ws, authUser);
    }

    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleSocketMessage(ws, msg);
      } catch (err) {
        console.error("Invalid WS message:", err);
      }
    });

    ws.on("close", () => {
      handleSocketDisconnect(ws);
    });
  });

  function registerUserSocket(ws, user) {
    if (!userSockets.has(user.id)) {
      userSockets.set(user.id, new Set());
    }
    userSockets.get(user.id).add(ws);
    socketMetadata.set(ws, { userId: user.id, username: user.username, matchId: null });

    sendJson(ws, "authenticated", {
      user,
      onlineCount: getOnlineCount(),
    });

    // Check if player is currently in an active match
    for (const match of matchManager.activeMatches.values()) {
      if (match.player1.id === user.id || match.player2.id === user.id) {
        socketMetadata.get(ws).matchId = match.id;
        const snapshot = match.handlePlayerReconnect(user.id);
        if (snapshot) {
          sendJson(ws, "match_restored", snapshot);
        }
        break;
      }
    }
  }

  function handleSocketMessage(ws, { type, payload }) {
    const meta = socketMetadata.get(ws);

    if (type === "authenticate") {
      const token = payload?.token;
      const decoded = tokenService.verifyToken(token);
      if (!decoded) {
        sendJson(ws, "auth_error", { message: "Invalid token." });
        return;
      }
      const user = authService.getProfile(decoded.userId);
      if (!user) {
        sendJson(ws, "auth_error", { message: "User not found." });
        return;
      }
      registerUserSocket(ws, user);
      return;
    }

    if (!meta || !meta.userId) {
      sendJson(ws, "error", { message: "Unauthenticated socket." });
      return;
    }

    switch (type) {
      case "join_queue": {
        const profile = authService.getProfile(meta.userId);
        if (!profile) return;

        queueManager.enqueue({
          userId: profile.id,
          username: profile.username,
          rating: profile.rating,
          profile,
          mode: payload?.mode || "general",
          socketId: meta.userId,
        });

        sendJson(ws, "queue_joined", {
          mode: payload?.mode || "general",
          rating: profile.rating,
        });
        break;
      }

      case "cancel_queue": {
        queueManager.dequeue(meta.userId);
        sendJson(ws, "queue_cancelled", {});
        break;
      }

      case "submit_answer": {
        const { matchId, questionId, selectedOptionId } = payload || {};
        const match = matchManager.getMatch(matchId || meta.matchId);
        if (!match) {
          sendJson(ws, "error", { message: "Match not found or concluded." });
          return;
        }

        const res = match.submitAnswer({
          userId: meta.userId,
          questionId,
          selectedOptionId,
        });

        if (!res.success) {
          sendJson(ws, "submission_error", { error: res.error });
        } else {
          sendJson(ws, "answer_acknowledged", {
            questionId,
            pointsEarned: res.pointsEarned,
          });
        }
        break;
      }

      case "request_rematch": {
        const matchId = payload?.matchId || meta.matchId;
        const match = matchManager.getMatch(matchId);
        if (!match) return;

        match.requestRematch(meta.userId);
        break;
      }

      case "accept_rematch": {
        const matchId = payload?.matchId || meta.matchId;
        const match = matchManager.getMatch(matchId);
        if (!match) return;

        const result = match.acceptRematch(meta.userId);
        if (result.startNewMatch) {
          matchManager.removeMatch(matchId);
          const newMatch = matchManager.createMatch({
            player1: authService.getProfile(result.player1.id),
            player2: authService.getProfile(result.player2.id),
            mode: match.mode,
            broadcastFn: broadcastToMatch,
          });

          // Update sockets
          const p1Sockets = userSockets.get(result.player1.id);
          if (p1Sockets) p1Sockets.forEach((s) => (socketMetadata.get(s).matchId = newMatch.id));
          const p2Sockets = userSockets.get(result.player2.id);
          if (p2Sockets) p2Sockets.forEach((s) => (socketMetadata.get(s).matchId = newMatch.id));
        }
        break;
      }

      case "leave_match": {
        const matchId = payload?.matchId || meta.matchId;
        const match = matchManager.getMatch(matchId);
        if (match) {
          match.finishMatch({ forfeitUserId: meta.userId });
        }
        break;
      }

      default:
        break;
    }
  }

  function handleSocketDisconnect(ws) {
    const meta = socketMetadata.get(ws);
    if (!meta) return;

    const { userId, matchId } = meta;
    socketMetadata.delete(ws);

    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        userSockets.delete(userId);
        queueManager.dequeue(userId);

        if (matchId) {
          const match = matchManager.getMatch(matchId);
          if (match) {
            match.handlePlayerDisconnect(userId);
          }
        }
      }
    }
  }

  // Heartbeat ping/pong every 20s
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 20000);

  let isClosed = false;
  const closeServer = () => {
    if (isClosed) return;
    isClosed = true;
    clearInterval(heartbeat);
    queueManager.stop();
    try {
      wss.close();
    } catch {}
  };

  httpServer.on("close", closeServer);

  return {
    getOnlineCount,
    broadcastToUser,
    broadcastToMatch,
    close: closeServer,
  };
}
