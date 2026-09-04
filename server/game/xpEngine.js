import { XP_CONFIG } from "../config.js";

export const xpEngine = {
  calculateMatchXp({ isWin, isDraw, correctAnswers = 0, totalRounds = 5 }) {
    let xp = XP_CONFIG.MATCH_COMPLETION;
    if (isWin) {
      xp += XP_CONFIG.VICTORY_BONUS;
    } else if (isDraw) {
      xp += XP_CONFIG.DRAW_BONUS;
    }

    xp += correctAnswers * XP_CONFIG.CORRECT_ANSWER_BONUS;

    if (correctAnswers === totalRounds && totalRounds > 0) {
      xp += XP_CONFIG.PERFECT_GAME_BONUS;
    }

    return xp;
  },

  getLevelFromXp(xp) {
    if (xp <= 0) return 1;
    // Level 1: 0-99 XP
    // Level 2: 100-399 XP
    // Level 3: 400-899 XP
    // Level L: requires (L-1)^2 * 100 XP
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  },

  getXpForLevel(level) {
    if (level <= 1) return 0;
    return Math.pow(level - 1, 2) * 100;
  },

  getLevelProgress(xp) {
    const currentLevel = this.getLevelFromXp(xp);
    const currentLevelXp = this.getXpForLevel(currentLevel);
    const nextLevelXp = this.getXpForLevel(currentLevel + 1);
    const xpInLevel = xp - currentLevelXp;
    const needed = nextLevelXp - currentLevelXp;
    const percentage = Math.min(100, Math.max(0, Math.round((xpInLevel / needed) * 100)));

    return {
      level: currentLevel,
      currentXp: xp,
      xpInLevel,
      neededForNext: needed,
      percentage,
      nextLevelXp,
    };
  },
};
