import { dbService } from "../db/index.js";

/**
 * Spaced Repetition Scheduling Engine (SM-2 / FSRS inspired)
 * - Incorrect answers: reset interval to 1 day, lower ease factor
 * - Correct answers: exponential interval expansion scaled by ease factor
 */

export class SpacedRepetitionService {
  /**
   * Calculates next spaced review interval and ease factor
   * @param {Object} current - { interval_days, ease_factor, streak_correct }
   * @param {boolean} isCorrect - whether current attempt was correct
   * @param {number} responseTimeMs - time taken to respond
   * @returns {Object} { interval_days, ease_factor, next_review_at, streak_correct }
   */
  calculateNextSchedule(current = {}, isCorrect = false, responseTimeMs = 15000) {
    let intervalDays = current.interval_days || 1;
    let easeFactor = current.ease_factor || 2.5;
    let streak = current.streak_correct || 0;

    const DAY_MS = 24 * 60 * 60 * 1000;

    if (!isCorrect) {
      // Failure: reset streak and interval to 1 day
      streak = 0;
      intervalDays = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.20);
    } else {
      // Success: advance streak
      streak += 1;

      // Adjust ease factor based on speed (bonus if responded < 10s)
      if (responseTimeMs < 10000) {
        easeFactor = Math.min(3.0, easeFactor + 0.10);
      } else if (responseTimeMs > 25000) {
        easeFactor = Math.max(1.3, easeFactor - 0.05);
      }

      if (streak === 1) {
        intervalDays = 1;
      } else if (streak === 2) {
        intervalDays = 3;
      } else if (streak === 3) {
        intervalDays = 7;
      } else if (streak === 4) {
        intervalDays = 14;
      } else {
        intervalDays = Math.min(180, Math.round(intervalDays * easeFactor));
      }
    }

    const nextReviewAt = Date.now() + intervalDays * DAY_MS;

    return {
      interval_days: intervalDays,
      ease_factor: parseFloat(easeFactor.toFixed(2)),
      next_review_at: nextReviewAt,
      streak_correct: streak,
    };
  }

  /**
   * Helper alias supporting options object
   */
  calculateNextReview(options = {}) {
    const {
      wasCorrect,
      isCorrect,
      responseTimeMs = 15000,
      currentIntervalDays,
      currentEaseFactor,
      streakCorrect,
      current = {},
    } = options;

    const curr = {
      interval_days: currentIntervalDays ?? current.interval_days ?? 1,
      ease_factor: currentEaseFactor ?? current.ease_factor ?? 2.5,
      streak_correct: streakCorrect ?? current.streak_correct ?? 0,
    };

    const res = this.calculateNextSchedule(curr, wasCorrect ?? isCorrect ?? false, responseTimeMs);
    return {
      ...res,
      intervalDays: res.interval_days,
      easeFactor: res.ease_factor,
      nextReviewAt: res.next_review_at,
      streakCorrect: res.streak_correct,
    };
  }

  /**
   * Gets concepts that are currently due for spaced review for a player
   */
  getDueConcepts(userId) {
    if (!userId) return [];
    return dbService.getDueSpacedRepetitionConcepts(userId, Date.now());
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();
