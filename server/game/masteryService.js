import { dbService } from "../db/index.js";

/**
 * User Topic Mastery & Skill Profile Engine
 * Separates:
 * - XP (Progression / Engagement)
 * - Mastery (0-100% Knowledge Depth)
 * - Rating (Competitive Elo in Battle 1v1)
 */

const DIFFICULTY_WEIGHTS = {
  easy: 0.85,
  facil: 0.85,
  beginner: 0.85,
  medium: 1.0,
  medio: 1.0,
  intermediate: 1.0,
  hard: 1.15,
  dificil: 1.15,
  advanced: 1.15,
  expert: 1.3,
  extraDificil: 1.3,
};

export class MasteryService {
  constructor(options = {}) {
    this.trainingWeight = options.trainingWeight ?? 0.4; // 40% weight to training
    this.battleWeight = options.battleWeight ?? 0.6;     // 60% weight to battle pressure
    this.recencyHalfLifeDays = options.recencyHalfLifeDays ?? 90;
  }

  /**
   * Calculates deterministic mastery score (0.0 to 100.0)
   */
  calculateMasteryScore({
    trainingAccuracy = 0,
    battleAccuracy = 0,
    trainingCount = 0,
    battleCount = 0,
    difficulty = "medium",
    averageResponseMs = 12000,
    targetDurationSec = 20,
    lastPracticedAt = Date.now(),
  }) {
    // 1. Blended Accuracy based on mode weights
    let blendedAccuracy = 0;
    if (trainingCount > 0 && battleCount > 0) {
      blendedAccuracy = trainingAccuracy * this.trainingWeight + battleAccuracy * this.battleWeight;
    } else if (battleCount > 0) {
      blendedAccuracy = battleAccuracy;
    } else if (trainingCount > 0) {
      blendedAccuracy = trainingAccuracy;
    } else {
      return 0; // Cold start
    }

    // 2. Difficulty Multiplier (higher difficulty yields higher ceiling)
    const diffMultiplier = DIFFICULTY_WEIGHTS[difficulty?.toLowerCase()] || 1.0;

    // 3. Response Speed Efficiency Factor
    const targetMs = targetDurationSec * 1000;
    let speedFactor = 1.0;
    if (averageResponseMs > 0 && targetMs > 0) {
      const ratio = averageResponseMs / targetMs;
      if (ratio <= 0.5) speedFactor = 1.10;      // Fast & confident
      else if (ratio <= 0.8) speedFactor = 1.05; // Normal paced
      else if (ratio > 1.0) speedFactor = 0.90;  // Hesitant / near timeout
    }

    // 4. Sample Size Confidence Curve (Bayesian regressed)
    const totalAttempts = trainingCount + battleCount;
    const confidence = Math.min(1.0, 0.5 + 0.5 * (totalAttempts / 4));

    // 5. Recency Decay (Gradual decay if unpracticed for > 60 days)
    const daysSince = Math.max(0, (Date.now() - lastPracticedAt) / (24 * 60 * 60 * 1000));
    let recencyFactor = 1.0;
    if (daysSince > 60) {
      recencyFactor = Math.max(0.75, 1.0 - (daysSince - 60) * 0.003);
    }

    const rawMastery = blendedAccuracy * diffMultiplier * speedFactor * recencyFactor * confidence;
    return Math.max(0, Math.min(100, parseFloat(rawMastery.toFixed(1))));
  }

  /**
   * Updates user skill profile after any answer in Training or Battle
   */
  updateMasteryOnAnswer({
    userId,
    domain,
    category,
    subcategory = "",
    conceptId,
    isCorrect,
    mode = "training",
    responseTimeMs = 12000,
    difficulty = "medium",
    spacedRepetitionData = {},
  }) {
    if (!userId || !conceptId) return null;

    const existing = dbService.getUserConceptSkill(userId, conceptId) || {
      user_id: userId,
      domain,
      category,
      subcategory,
      concept_id: conceptId,
      mastery_score: 0,
      training_accuracy: 0,
      battle_accuracy: 0,
      total_answers: 0,
      correct_answers: 0,
      average_response_ms: 0,
      interval_days: 1,
      ease_factor: 2.5,
      streak_correct: 0,
      last_practiced_at: Date.now(),
      next_review_at: Date.now(),
    };

    const newTotal = (existing.total_answers || 0) + 1;
    const newCorrect = (existing.correct_answers || 0) + (isCorrect ? 1 : 0);
    const newStreak = isCorrect ? (existing.streak_correct || 0) + 1 : 0;

    // Running average response time
    const prevAvg = existing.average_response_ms || responseTimeMs;
    const newAvgTime = Math.round((prevAvg * (newTotal - 1) + responseTimeMs) / newTotal);

    // Compute training vs battle specific accuracies
    let trainingAcc = existing.training_accuracy ?? 0;
    let battleAcc = existing.battle_accuracy ?? 0;

    // Exact mode-specific counts
    const prevTrainingAnswers = existing.training_answers || (existing.total_answers && !existing.battle_answers ? existing.total_answers : 0);
    const prevBattleAnswers = existing.battle_answers || 0;
    const trainingCount = prevTrainingAnswers + (mode === "training" ? 1 : 0);
    const battleCount = prevBattleAnswers + (mode === "battle" ? 1 : 0);

    if (mode === "training") {
      if (prevTrainingAnswers === 0 || !existing.training_accuracy) {
        trainingAcc = isCorrect ? 100 : 0;
      } else {
        trainingAcc = isCorrect ? Math.min(100, trainingAcc + (100 - trainingAcc) * 0.25) : Math.max(0, trainingAcc * 0.75);
      }
    } else if (mode === "battle") {
      if (prevBattleAnswers === 0 || !existing.battle_accuracy) {
        battleAcc = isCorrect ? 100 : 0;
      } else {
        battleAcc = isCorrect ? Math.min(100, battleAcc + (100 - battleAcc) * 0.3) : Math.max(0, battleAcc * 0.7);
      }
    }

    const calculatedMastery = this.calculateMasteryScore({
      trainingAccuracy: trainingAcc,
      battleAccuracy: battleAcc,
      trainingCount,
      battleCount,
      difficulty,
      averageResponseMs: newAvgTime,
      lastPracticedAt: Date.now(),
    });

    const updatedProfile = {
      ...existing,
      domain: domain || existing.domain,
      category: category || existing.category,
      subcategory: subcategory || existing.subcategory,
      concept_id: conceptId,
      mastery_score: calculatedMastery,
      training_accuracy: parseFloat(trainingAcc.toFixed(1)),
      battle_accuracy: parseFloat(battleAcc.toFixed(1)),
      total_answers: newTotal,
      training_answers: trainingCount,
      battle_answers: battleCount,
      correct_answers: newCorrect,
      average_response_ms: newAvgTime,
      last_practiced_at: Date.now(),
      streak_correct: newStreak,
      ...spacedRepetitionData,
    };

    dbService.upsertUserSkillProfile(updatedProfile);
    return updatedProfile;
  }

  /**
   * Retrieves high-level domain & category mastery breakdown for the user
   */
  getUserMasterySummary(userId) {
    const profiles = dbService.getUserSkillProfiles(userId);
    if (!profiles || profiles.length === 0) {
      return {
        overallMastery: 0,
        domains: {},
        categories: {},
        weakestTopics: [],
        strongestTopics: [],
        totalConceptsPracticed: 0,
      };
    }

    const domainGroups = {};
    const categoryGroups = {};

    for (const p of profiles) {
      const d = p.domain || "General Cybersecurity";
      const c = p.category || d;

      if (!domainGroups[d]) domainGroups[d] = { totalMastery: 0, count: 0, correct: 0, answers: 0 };
      domainGroups[d].totalMastery += p.mastery_score;
      domainGroups[d].count += 1;
      domainGroups[d].correct += p.correct_answers;
      domainGroups[d].answers += p.total_answers;

      if (!categoryGroups[c]) categoryGroups[c] = { domain: d, totalMastery: 0, count: 0, correct: 0, answers: 0 };
      categoryGroups[c].totalMastery += p.mastery_score;
      categoryGroups[c].count += 1;
      categoryGroups[c].correct += p.correct_answers;
      categoryGroups[c].answers += p.total_answers;
    }

    const domainsSummary = {};
    for (const [d, stat] of Object.entries(domainGroups)) {
      domainsSummary[d] = {
        mastery: Math.round(stat.totalMastery / stat.count),
        conceptsPracticed: stat.count,
        accuracy: stat.answers > 0 ? Math.round((stat.correct / stat.answers) * 100) : 0,
      };
    }

    const categoriesSummary = {};
    for (const [c, stat] of Object.entries(categoryGroups)) {
      categoriesSummary[c] = {
        domain: stat.domain,
        mastery: Math.round(stat.totalMastery / stat.count),
        conceptsPracticed: stat.count,
        accuracy: stat.answers > 0 ? Math.round((stat.correct / stat.answers) * 100) : 0,
      };
    }

    // Sort weakest and strongest
    const sorted = [...profiles].sort((a, b) => a.mastery_score - b.mastery_score);
    const weakestTopics = sorted.slice(0, 3).map((p) => ({
      concept_id: p.concept_id,
      conceptId: p.concept_id,
      name: p.concept_id,
      category: p.category,
      domain: p.domain,
      mastery: p.mastery_score,
      accuracy: p.total_answers > 0 ? Math.round((p.correct_answers / p.total_answers) * 100) : 0,
    }));

    const strongestTopics = [...profiles]
      .filter((p) => p.total_answers >= 3)
      .sort((a, b) => b.mastery_score - a.mastery_score)
      .slice(0, 3)
      .map((p) => ({
        concept_id: p.concept_id,
        conceptId: p.concept_id,
        name: p.concept_id,
        category: p.category,
        domain: p.domain,
        mastery: p.mastery_score,
      }));

    const overallMastery = Math.round(
      profiles.reduce((acc, p) => acc + p.mastery_score, 0) / profiles.length
    );

    return {
      overallMastery,
      domains: domainsSummary,
      categories: categoriesSummary,
      weakestTopics,
      strongestTopics,
      totalConceptsPracticed: profiles.length,
    };
  }

  /**
   * Returns top weakest topics for a player (used for Battle -> Training bridge)
   */
  getWeakestTopics(userId, limit = 3) {
    const profiles = dbService.getUserSkillProfiles(userId);
    return profiles
      .filter((p) => p.total_answers >= 1)
      .sort((a, b) => a.mastery_score - b.mastery_score)
      .slice(0, limit);
  }
}

export const masteryService = new MasteryService();
