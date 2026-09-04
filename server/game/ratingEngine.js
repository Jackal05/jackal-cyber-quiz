import { BATTLE_CONFIG, RANK_TIERS } from "../config.js";

export const ratingEngine = {
  getRankTier(rating) {
    const tier = RANK_TIERS.find((t) => rating >= t.minRating && rating <= t.maxRating) || RANK_TIERS[0];
    
    // Subdivisions (III, II, I) within tier
    const range = tier.maxRating - tier.minRating + 1;
    let division = "";
    if (tier.id !== "elite") {
      const step = range / 3;
      const offset = rating - tier.minRating;
      if (offset < step) division = "III";
      else if (offset < step * 2) division = "II";
      else division = "I";
    }

    return {
      id: tier.id,
      name: tier.name,
      division,
      displayName: division ? `${tier.name} ${division}` : tier.name,
      color: tier.color,
      minRating: tier.minRating,
      maxRating: tier.maxRating,
    };
  },

  getKFactor(rating, battlesPlayed = 0) {
    if (battlesPlayed < 10) return 40; // Placement matches
    if (rating >= 2000) return 16;
    if (rating >= 1600) return 24;
    return BATTLE_CONFIG.K_FACTOR; // 32
  },

  calculateElo({ playerRating, opponentRating, outcome, battlesPlayed = 0 }) {
    // outcome: 1 for win, 0.5 for draw, 0 for loss
    const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const k = this.getKFactor(playerRating, battlesPlayed);
    const delta = Math.round(k * (outcome - expected));
    const newRating = Math.max(100, playerRating + delta);

    return {
      newRating,
      delta,
      expected: Number(expected.toFixed(3)),
    };
  },

  calculateMatchRatings({ p1Rating, p2Rating, outcome, p1Battles = 0, p2Battles = 0 }) {
    // outcome: 'p1', 'p2', or 'draw'
    const p1Score = outcome === "p1" ? 1 : outcome === "draw" ? 0.5 : 0;
    const p2Score = outcome === "p2" ? 1 : outcome === "draw" ? 0.5 : 0;

    const p1Result = this.calculateElo({
      playerRating: p1Rating,
      opponentRating: p2Rating,
      outcome: p1Score,
      battlesPlayed: p1Battles,
    });

    const p2Result = this.calculateElo({
      playerRating: p2Rating,
      opponentRating: p1Rating,
      outcome: p2Score,
      battlesPlayed: p2Battles,
    });

    return {
      player1: p1Result,
      player2: p2Result,
    };
  },
};
