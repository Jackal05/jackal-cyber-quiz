import { questionRepository } from "./questionRepository.js";
import { masteryService } from "./masteryService.js";
import { spacedRepetitionService } from "./spacedRepetitionService.js";
import { dbService } from "../db/index.js";

/**
 * Adaptive Training Question Selector
 * Implements the 40/25/20/15 adaptive learning composition:
 * - 40% Weak Topics (lowest mastery)
 * - 25% New Concepts (0 exposures)
 * - 20% Spaced Review (due for repetition)
 * - 15% Strong Reinforcement (high mastery at advanced difficulty)
 */

function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class TrainingQuestionSelector {
  constructor(options = {}) {
    this.recentCooldownDays = options.recentCooldownDays ?? 30; // 30-day global cross-mode cooldown
    this.weakTopicRatio = options.weakTopicRatio ?? 0.40;
    this.newConceptRatio = options.newConceptRatio ?? 0.25;
    this.spacedReviewRatio = options.spacedReviewRatio ?? 0.20;
    this.reinforcementRatio = options.reinforcementRatio ?? 0.15;
  }

  /**
   * Builds an adaptive training question set
   * @param {string} userId
   * @param {Object} options - { sessionType, category, focusTopic, count, startingDifficulty }
   * @returns {Array<Object>}
   */
  selectTrainingQuestions(
    userId,
    { sessionType = "mixed", category = null, focusTopic = null, count = 10, startingDifficulty = null } = {}
  ) {
    const targetCount = Math.max(2, Math.min(50, count));

    // 1. Get user recent question exposures across BOTH Training and Battle (30-day window)
    const recentSeenIds = userId ? dbService.getUserRecentQuestionIds(userId, this.recentCooldownDays) : new Set();

    // 2. Fetch all approved training questions from central repository
    const baseFilters = { mode: "training" };
    if (category && category !== "all" && category !== "general") {
      baseFilters.category = category;
    }
    const allPool = questionRepository.getAllApprovedQuestions(baseFilters);

    if (allPool.length === 0) {
      return [];
    }

    // 3. User Skill Profiles & Concept Exposure
    const skillProfiles = userId ? dbService.getUserSkillProfiles(userId) : [];
    const practicedConceptIds = new Set(skillProfiles.map((p) => p.concept_id));

    // Weak concepts: mastery < 70%
    const weakConceptIds = new Set(
      skillProfiles.filter((p) => p.mastery_score < 70 || (p.total_answers >= 2 && p.training_accuracy < 65)).map((p) => p.concept_id)
    );

    // If a specific focusTopic is specified (e.g. from post-battle recommendation)
    if (focusTopic) {
      const topicLower = focusTopic.toLowerCase();
      // Add concepts matching focusTopic name or category
      allPool
        .filter(
          (q) =>
            q.categorySlug?.toLowerCase().includes(topicLower) ||
            q.category?.toLowerCase().includes(topicLower) ||
            q.concept_id?.toLowerCase().includes(topicLower) ||
            q.subcategory?.toLowerCase().includes(topicLower)
        )
        .forEach((q) => weakConceptIds.add(q.concept_id));
    }

    // Spaced review concepts (due by next_review_at)
    const dueProfiles = userId ? spacedRepetitionService.getDueConcepts(userId) : [];
    const dueConceptIds = new Set(dueProfiles.map((p) => p.concept_id));

    // Strong reinforcement concepts: mastery >= 80%
    const strongConceptIds = new Set(
      skillProfiles.filter((p) => p.mastery_score >= 80 && p.total_answers >= 2).map((p) => p.concept_id)
    );

    // 4. Partition Questions into Tiers, prioritizing unseen questions
    const isUnseen = (q) => !recentSeenIds.has(q.id);

    const weakBucket = [];
    const newBucket = [];
    const reviewBucket = [];
    const reinforceBucket = [];
    const generalBucket = [];

    for (const q of allPool) {
      const qConcept = q.concept_id;

      if (weakConceptIds.has(qConcept)) {
        weakBucket.push(q);
      } else if (dueConceptIds.has(qConcept)) {
        reviewBucket.push(q);
      } else if (!practicedConceptIds.has(qConcept)) {
        newBucket.push(q);
      } else if (strongConceptIds.has(qConcept)) {
        reinforceBucket.push(q);
      } else {
        generalBucket.push(q);
      }
    }

    // 5. Session Type Routing
    let selected = [];
    const usedIds = new Set();

    const pickFromBucket = (bucket, countNeeded, preferDifficulty = null) => {
      if (countNeeded <= 0 || bucket.length === 0) return [];
      // Prefer unseen first
      const available = bucket.filter((q) => !usedIds.has(q.id));
      const unseen = available.filter(isUnseen);
      const candidates = unseen.length >= countNeeded ? unseen : available;

      let prioritized = candidates;
      if (preferDifficulty) {
        const diffMatch = candidates.filter((q) => q.difficulty?.toLowerCase() === preferDifficulty.toLowerCase());
        if (diffMatch.length > 0) prioritized = [...diffMatch, ...candidates.filter((q) => q.difficulty !== preferDifficulty)];
      }

      const shuffled = shuffle(prioritized);
      const picked = shuffled.slice(0, countNeeded);
      picked.forEach((q) => usedIds.add(q.id));
      return picked;
    };

    if (sessionType === "weak_topics") {
      // 80% weak topics, 20% review
      const weakTarget = Math.round(targetCount * 0.8);
      const reviewTarget = targetCount - weakTarget;
      selected.push(...pickFromBucket(weakBucket, weakTarget));
      selected.push(...pickFromBucket(reviewBucket, reviewTarget));
    } else if (sessionType === "battle_prep") {
      // Rapid questions matching user startingDifficulty or medium/hard
      const battleCandidates = allPool.filter((q) => q.available_in_battle);
      const targetDiff = startingDifficulty || "medium";
      selected.push(...pickFromBucket(battleCandidates, targetCount, targetDiff));
    } else if (sessionType === "category") {
      // Category training with smooth difficulty progression
      const categoryPool = allPool.filter(
        (q) => !category || q.categorySlug?.toLowerCase() === category.toLowerCase() || q.category?.toLowerCase() === category.toLowerCase()
      );
      selected.push(...pickFromBucket(categoryPool, targetCount, startingDifficulty));
    } else {
      // Standard Adaptive Mixed Session: 40% weak, 25% new, 20% review, 15% reinforcement
      const weakCount = Math.max(1, Math.round(targetCount * this.weakTopicRatio));
      const newCount = Math.max(1, Math.round(targetCount * this.newConceptRatio));
      const reviewCount = Math.max(1, Math.round(targetCount * this.spacedReviewRatio));
      const reinforceCount = Math.max(1, targetCount - weakCount - newCount - reviewCount);

      selected.push(...pickFromBucket(weakBucket, weakCount));
      selected.push(...pickFromBucket(newBucket, newCount));
      selected.push(...pickFromBucket(reviewBucket, reviewCount));
      selected.push(...pickFromBucket(reinforceBucket, reinforceCount, "hard"));
    }

    // 6. Fill Any Remaining Slots from General / Full Pool
    if (selected.length < targetCount) {
      const remainingNeeded = targetCount - selected.length;
      const leftover = allPool.filter((q) => !usedIds.has(q.id));
      selected.push(...pickFromBucket(leftover.length > 0 ? leftover : allPool, remainingNeeded));
    }

    // Shuffle the final selected questions so buckets are interspersed naturally
    return shuffle(selected).slice(0, targetCount);
  }

  /**
   * Generates a complete adaptive session payload with composition and target concepts
   */
  generateAdaptiveSession(userId, options = {}) {
    const {
      sessionType = "mixed",
      domain = null,
      category = null,
      subcategory = null,
      conceptId = null,
      questionCount = 10,
      focusTopic = null,
    } = options;

    const questions = this.selectTrainingQuestions(userId, {
      sessionType,
      category: category || domain,
      focusTopic: focusTopic || conceptId || subcategory,
      count: questionCount,
    });

    const targetConcepts = [...new Set(questions.map((q) => q.concept_id).filter(Boolean))];

    return {
      sessionType,
      totalQuestions: questions.length,
      composition: {
        weakTopics: Math.round(questions.length * this.weakTopicRatio),
        newConcepts: Math.round(questions.length * this.newConceptRatio),
        spacedReview: Math.round(questions.length * this.spacedReviewRatio),
        reinforcement: Math.max(
          1,
          questions.length -
            Math.round(questions.length * this.weakTopicRatio) -
            Math.round(questions.length * this.newConceptRatio) -
            Math.round(questions.length * this.spacedReviewRatio)
        ),
      },
      targetConcepts,
      questions,
    };
  }
}

export const trainingQuestionSelector = new TrainingQuestionSelector();
export const adaptiveTrainingSelector = trainingQuestionSelector;
