import { questionRepository } from "./questionRepository.js";
import { dbService } from "../db/index.js";
import { battleQuestionPlanner } from "./battleQuestionPlanner.js";

/**
 * Smart Question Selector & Fair Battle Matchmaker
 * Enforces:
 * - Anti-repetition cooldown per player (configurable, default 30-90 days)
 * - 2-player intersection for 1v1 duels (neither player has seen the question)
 * - Progressive difficulty ladder for 5-round battle:
 *     Round 1: easy / medium
 *     Round 2: medium
 *     Round 3: medium / hard
 *     Round 4: hard
 *     Round 5: hard / expert
 * - Sudden Death: hard / expert
 */

function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class QuestionSelector {
  constructor(daysCooldown = 30) {
    this.daysCooldown = daysCooldown;
  }

  /**
   * Retrieves all available approved questions from unified question repository
   */
  getAvailableQuestionPool() {
    return questionRepository.getAllQuestions({
      availableOnly: true,
      battleOnly: true,
      minFairnessScore: 0.7,
    });
  }

  /**
   * Selects an optimal 5-question ladder for a 1v1 battle between two players
   * @param {string} player1Id
   * @param {string} player2Id
   * @param {Object} options
   * @returns {Array<Object>} 5 questions progressively ordered
   */
  selectBattleQuestions(player1Id, player2Id, { category = null } = {}) {
    // 1. Get 90-day history for both players
    const p1Seen = player1Id ? dbService.getUserRecentQuestionIds(player1Id, this.daysCooldown) : new Set();
    const p2Seen = player2Id ? dbService.getUserRecentQuestionIds(player2Id, this.daysCooldown) : new Set();

    let pool = this.getAvailableQuestionPool();

    if (category && category !== "general") {
      pool = pool.filter((q) => q.categorySlug === category || q.category === category);
    }

    // 2. Strict 2-player intersection (neither player has seen the question in 90 days)
    let candidatePool = pool.filter((q) => !p1Seen.has(q.id) && !p2Seen.has(q.id));

    // Fallback: If pool is smaller than 10, relax to union or full pool
    if (candidatePool.length < 10) {
      candidatePool = pool.filter((q) => !p1Seen.has(q.id) || !p2Seen.has(q.id));
      if (candidatePool.length < 10) {
        candidatePool = pool;
      }
    }

    // 3. Progressive Difficulty Ladders
    // Round 1: easy / medium / beginner
    // Round 2: medium / intermediate
    // Round 3: medium / hard / intermediate / dificil
    // Round 4: hard / dificil / advanced
    // Round 5: hard / expert / extraDificil
    const targetDifficulties = [
      ["facil", "easy", "beginner", "medio", "medium", "intermediate"],
      ["medio", "medium", "intermediate"],
      ["medio", "medium", "intermediate", "dificil", "hard", "advanced"],
      ["dificil", "hard", "advanced"],
      ["dificil", "hard", "advanced", "extraDificil", "expert"],
    ];

    const selectedQuestions = [];
    const usedIds = new Set();

    for (let roundIdx = 0; roundIdx < 5; roundIdx++) {
      const allowedDiffs = targetDifficulties[roundIdx];
      const matching = candidatePool.filter(
        (q) => !usedIds.has(q.id) && allowedDiffs.includes(q.difficulty?.toLowerCase())
      );

      let picked;
      if (matching.length > 0) {
        picked = shuffle(matching)[0];
      } else {
        // Fallback to any unused question in candidate pool
        const remaining = candidatePool.filter((q) => !usedIds.has(q.id));
        picked = remaining.length > 0 ? shuffle(remaining)[0] : shuffle(pool)[0];
      }

      if (picked) {
        usedIds.add(picked.id);
        selectedQuestions.push(picked);
      }
    }

    return selectedQuestions;
  }

  /**
   * Selects a high-difficulty question for sudden death round
   */
  selectSuddenDeathQuestion(player1Id, player2Id, excludeIds = []) {
    const p1Seen = player1Id ? dbService.getUserRecentQuestionIds(player1Id, this.daysCooldown) : new Set();
    const p2Seen = player2Id ? dbService.getUserRecentQuestionIds(player2Id, this.daysCooldown) : new Set();

    const pool = this.getAvailableQuestionPool();
    const hardDiffs = ["dificil", "hard", "advanced", "extraDificil", "expert"];

    const candidates = pool.filter(
      (q) =>
        !excludeIds.includes(q.id) &&
        !p1Seen.has(q.id) &&
        !p2Seen.has(q.id) &&
        hardDiffs.includes(q.difficulty?.toLowerCase())
    );

    if (candidates.length > 0) {
      return shuffle(candidates)[0];
    }

    // Fallback
    const fallback = pool.filter((q) => !excludeIds.includes(q.id) && hardDiffs.includes(q.difficulty?.toLowerCase()));
    return fallback.length > 0 ? shuffle(fallback)[0] : pool[0];
  }

  /**
   * Records that questions were served to players during a match
   */
  recordMatchQuestions(matchId, questions, playerResults = []) {
    for (const res of playerResults) {
      const { userId, questionId, wasCorrect, responseTimeMs } = res;
      dbService.recordUserQuestionHistory({
        userId,
        questionId,
        matchId,
        mode: "battle",
        wasCorrect,
        responseTimeMs,
      });
    }
  }
}

export const questionSelector = new QuestionSelector();
