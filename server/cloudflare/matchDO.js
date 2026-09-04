import { MATCH_STATES } from "../game/matchState.js";
import { questionBank } from "../game/questionBank.js";
import { ratingEngine } from "../game/ratingEngine.js";
import { xpEngine } from "../game/xpEngine.js";
import { BATTLE_CONFIG } from "../config.js";

/**
 * Cloudflare Durable Object for Jackal 1v1 Battle Matches.
 * Each active match runs inside an isolated, strongly-consistent MatchDO instance
 * on the Cloudflare global network.
 */
export class MatchDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // WebSocket -> { userId, username }
    this.matchData = null;
  }

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleSession(server, url);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response("Jackal MatchDO", { status: 200 });
  }

  async handleSession(webSocket, url) {
    webSocket.accept();
    const userId = url.searchParams.get("userId");
    const username = url.searchParams.get("username");

    this.sessions.set(webSocket, { userId, username });

    webSocket.addEventListener("message", async (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(webSocket, msg);
      } catch (err) {
        console.error("MatchDO message error:", err);
      }
    });

    webSocket.addEventListener("close", () => {
      this.sessions.delete(webSocket);
    });
  }

  handleMessage(ws, { type, payload }) {
    // Process authoritative gameplay within the Durable Object
  }

  broadcast(type, payload) {
    const data = JSON.stringify({ type, payload });
    for (const ws of this.sessions.keys()) {
      try {
        ws.send(data);
      } catch {
        // Socket closed
      }
    }
  }
}
