export const BATTLE_CONFIG = {
  ROUNDS: 5,
  QUESTION_DURATION_SEC: 20,
  ROUND_COOLDOWN_SEC: 4,
  COUNTDOWN_DURATION_SEC: 3,
  SCORE_BASE: 100,
  SPEED_BONUS_MAX: 50,
  RECONNECT_GRACE_PERIOD_SEC: 15,
  REMATCH_TIMEOUT_SEC: 20,
  INITIAL_RATING: 1200,
  K_FACTOR: 32,
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || "jackal_secret_key_2026_dev",
  DATA_DIR: "./server/data",
};

export const RANK_TIERS = [
  { id: "bronze", name: "Bronze", minRating: 0, maxRating: 1099, color: "#cd7f32" },
  { id: "silver", name: "Silver", minRating: 1100, maxRating: 1299, color: "#a8a8b2" },
  { id: "gold", name: "Gold", minRating: 1300, maxRating: 1499, color: "#facc15" },
  { id: "platinum", name: "Platinum", minRating: 1500, maxRating: 1699, color: "#38bdf8" },
  { id: "diamond", name: "Diamond", minRating: 1700, maxRating: 1899, color: "#a855f7" },
  { id: "master", name: "Master", minRating: 1900, maxRating: 2099, color: "#f43f5e" },
  { id: "elite", name: "Elite", minRating: 2100, maxRating: 9999, color: "#34d399" },
];

export const MATCHMAKING_EXPANSION = [
  { maxSeconds: 10, radius: 100 },
  { maxSeconds: 20, radius: 200 },
  { maxSeconds: 30, radius: 350 },
  { maxSeconds: 60, radius: 500 },
  { maxSeconds: Infinity, radius: 1000 },
];

export const XP_CONFIG = {
  MATCH_COMPLETION: 50,
  VICTORY_BONUS: 100,
  DRAW_BONUS: 25,
  CORRECT_ANSWER_BONUS: 20,
  PERFECT_GAME_BONUS: 150,
};
