import { MatchDO } from "./matchDO.js";

export { MatchDO };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route websocket connections to MatchDO instance
    if (url.pathname.startsWith("/ws/match/")) {
      const matchId = url.pathname.replace("/ws/match/", "");
      const id = env.MATCH_DO.idFromName(matchId);
      const stub = env.MATCH_DO.get(id);
      return stub.fetch(request);
    }

    // Static assets fallback
    return env.ASSETS.fetch(request);
  },
};
