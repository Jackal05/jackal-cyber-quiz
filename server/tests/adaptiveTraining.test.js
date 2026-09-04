import test from "node:test";
import assert from "node:assert/strict";
import { masteryService } from "../game/masteryService.js";
import { spacedRepetitionService } from "../game/spacedRepetitionService.js";
import { trainingQuestionSelector, adaptiveTrainingSelector } from "../game/trainingSelector.js";
import { battleQuestionPlanner } from "../game/battleQuestionPlanner.js";
import { questionRepository } from "../game/questionRepository.js";
import { dbService } from "../db/index.js";
import { authService } from "../auth/authService.js";

test("Mastery Engine: Deterministic mastery scoring and mode weighting", () => {
  const testUserId = `usr_mastery_${Date.now()}`;
  const conceptId = "test_tcp_handshake";

  // Simulate 3 correct training answers
  for (let i = 0; i < 3; i++) {
    masteryService.updateMasteryOnAnswer({
      userId: testUserId,
      domain: "Network Security & Architecture",
      category: "Network Security",
      subcategory: "Protocols",
      conceptId,
      isCorrect: true,
      mode: "training",
      responseTimeMs: 6000,
      difficulty: "medium",
    });
  }

  let profile = dbService.getUserConceptSkill(testUserId, conceptId);
  assert.ok(profile, "User skill profile must be persisted in database");
  assert.equal(profile.total_answers, 3);
  assert.equal(profile.correct_answers, 3);
  assert.ok(profile.mastery_score > 50, "Consistent correct training answers must elevate mastery score");

  // Simulate 1 incorrect battle answer (battle has higher weight: 0.6 vs 0.4)
  const masteryBeforeBattleLoss = profile.mastery_score;
  masteryService.updateMasteryOnAnswer({
    userId: testUserId,
    domain: "Network Security & Architecture",
    category: "Network Security",
    subcategory: "Protocols",
    conceptId,
    isCorrect: false,
    mode: "battle",
    responseTimeMs: 18000,
    difficulty: "medium",
  });

  profile = dbService.getUserConceptSkill(testUserId, conceptId);
  assert.ok(
    profile.mastery_score < masteryBeforeBattleLoss,
    "Battle mode incorrect answer must penalize mastery according to battle weight"
  );
  assert.equal(profile.streak_correct, 0, "Incorrect answer must reset streak to 0");
});

test("Mastery Engine: Extraction of Weakest and Strongest Topics", () => {
  const testUserId = `usr_topics_${Date.now()}`;

  // Topic A: Weak (0/2 correct)
  masteryService.updateMasteryOnAnswer({
    userId: testUserId,
    domain: "Security Operations & Defense",
    category: "SOC",
    conceptId: "weak_siem_correlation",
    isCorrect: false,
    mode: "training",
    difficulty: "easy",
  });

  // Topic B: Strong (4/4 correct)
  for (let i = 0; i < 4; i++) {
    masteryService.updateMasteryOnAnswer({
      userId: testUserId,
      domain: "Network Security & Architecture",
      category: "Network",
      conceptId: "strong_firewall_rules",
      isCorrect: true,
      mode: "training",
      difficulty: "hard",
    });
  }

  const summary = masteryService.getUserMasterySummary(testUserId);
  assert.ok(summary.weakestTopics.length >= 1, "Must identify at least 1 weak topic");
  assert.ok(summary.strongestTopics.length >= 1, "Must identify at least 1 strong topic");
  assert.equal(summary.weakestTopics[0].concept_id, "weak_siem_correlation");
  assert.equal(summary.strongestTopics[0].concept_id, "strong_firewall_rules");
});

test("Spaced Repetition Engine: SM-2 interval expansion and failure reset", () => {
  // Test 1: First correct review expands to 1 day
  const r1 = spacedRepetitionService.calculateNextReview({
    wasCorrect: true,
    responseTimeMs: 5000,
    currentIntervalDays: 0,
    currentEaseFactor: 2.5,
    streakCorrect: 0,
  });
  assert.equal(r1.intervalDays, 1);
  assert.equal(r1.streakCorrect, 1);

  // Test 2: Second correct review expands to 3 days
  const r2 = spacedRepetitionService.calculateNextReview({
    wasCorrect: true,
    responseTimeMs: 5000,
    currentIntervalDays: 1,
    currentEaseFactor: r1.easeFactor,
    streakCorrect: 1,
  });
  assert.equal(r2.intervalDays, 3);
  assert.equal(r2.streakCorrect, 2);

  // Test 3: Third correct review expands to 7 days
  const r3 = spacedRepetitionService.calculateNextReview({
    wasCorrect: true,
    responseTimeMs: 4000,
    currentIntervalDays: 3,
    currentEaseFactor: r2.easeFactor,
    streakCorrect: 2,
  });
  assert.equal(r3.intervalDays, 7);

  // Test 4: Incorrect answer resets streak to 0 and interval to 1 day
  const rFail = spacedRepetitionService.calculateNextReview({
    wasCorrect: false,
    responseTimeMs: 20000,
    currentIntervalDays: 14,
    currentEaseFactor: 2.5,
    streakCorrect: 5,
  });
  assert.equal(rFail.intervalDays, 1, "Incorrect answer must reset review interval to 1 day");
  assert.equal(rFail.streakCorrect, 0, "Streak must reset to 0 on failure");
  assert.ok(rFail.easeFactor < 2.5, "Ease factor must decrease on failure");
});

test("Adaptive Training Selector: Enforces 40/25/20/15 mix and session types", () => {
  const testUserId = `usr_selector_${Date.now()}`;

  // Generate a standard adaptive mixed session
  const session = adaptiveTrainingSelector.generateAdaptiveSession(testUserId, {
    sessionType: "mixed",
    questionCount: 10,
  });

  assert.equal(session.totalQuestions, 10, "Must generate exactly 10 questions for adaptive session");
  assert.ok(Array.isArray(session.questions), "Questions must be returned as array");
  assert.ok(session.targetConcepts.length >= 1, "Target concepts must be populated");

  // Check composition metrics
  assert.equal(session.composition.weakTopics, 4, "Must target 40% (4/10) weak topics");
  assert.equal(session.composition.newConcepts, 3, "Must target ~25% (3/10) new concepts");
  assert.equal(session.composition.spacedReview, 2, "Must target 20% (2/10) spaced review");

  // Generate specialized Battle Prep session
  const battlePrep = adaptiveTrainingSelector.generateAdaptiveSession(testUserId, {
    sessionType: "battle_prep",
    questionCount: 5,
  });
  assert.equal(battlePrep.totalQuestions, 5, "Battle prep session must select 5 questions");
});

test("Cross-Mode Fairness: 30-day anti-repetition cooldown between Training and Battle", () => {
  const p1Id = authService.createGuest().user.id;
  const p2Id = authService.createGuest().user.id;

  const allQuestions = questionRepository.getAllQuestions({ battleOnly: true });
  assert.ok(allQuestions.length >= 10, "Question repository must have questions available");
  const testQuestion = allQuestions[0];

  // Player 1 practices this question in Training Mode today
  dbService.recordUserQuestionHistory({
    userId: p1Id,
    questionId: testQuestion.id,
    sessionId: "trn_session_sample",
    mode: "training",
    wasCorrect: true,
    responseTimeMs: 5000,
  });

  // Verify recent question history returns this question ID
  const p1Seen = dbService.getUserRecentQuestionIds(p1Id, 30);
  assert.ok(p1Seen.has(testQuestion.id), "Question seen in training must be present in 30-day history");

  // Battle Planner creates a 5-round match for Player 1 vs Player 2
  const battleQuestions = battleQuestionPlanner.planBattleMatch(p1Id, p2Id, {
    mode: "general",
    p1Rating: 1200,
    p2Rating: 1200,
  });

  assert.equal(battleQuestions.length, 5, "Battle match must consist of 5 rounds");

  // The question Player 1 answered in Training must NOT be chosen for this Battle match!
  const hasLeakedQuestion = battleQuestions.some((q) => q.id === testQuestion.id);
  assert.equal(
    hasLeakedQuestion,
    false,
    "Cross-mode fairness violation: question seen in training must not appear in Battle 1v1 within 30 days"
  );
});

test("Battle Question Planner: 5-round thematic diversity and MMR ladder calibration", () => {
  const p1 = `p1_${Date.now()}`;
  const p2 = `p2_${Date.now()}`;

  // Bronze Match (< 1300 MMR)
  const bronzeMatch = battleQuestionPlanner.planBattleMatch(p1, p2, {
    p1Rating: 1100,
    p2Rating: 1150,
  });
  assert.equal(bronzeMatch.length, 5);

  // Diamond Match (> 1600 MMR)
  const diamondMatch = battleQuestionPlanner.planBattleMatch(p1, p2, {
    p1Rating: 1700,
    p2Rating: 1750,
  });
  assert.equal(diamondMatch.length, 5);

  // Sudden Death Selection
  const suddenDeathQ = battleQuestionPlanner.selectSuddenDeathQuestion(p1, p2, bronzeMatch.map((q) => q.id));
  assert.ok(suddenDeathQ, "Sudden death question must be returned");
  assert.ok(
    ["dificil", "hard", "advanced", "extradificil", "expert"].includes(suddenDeathQ.difficulty?.toLowerCase()),
    "Sudden death question must be advanced/expert difficulty"
  );
});

test("Security & Authoritative Sanitization: No leaks to client", () => {
  const rawQ = questionRepository.getAllQuestions()[0];
  assert.ok(rawQ.options.some((o) => o.is_correct !== undefined), "Raw question contains is_correct");
  assert.ok(rawQ.explanation, "Raw question contains explanation");

  // Sanitize for client delivery
  const sanitized = questionRepository.getSanitizedQuestion(rawQ);
  assert.equal(sanitized.explanation, undefined, "Sanitized question must NEVER leak explanation to client");
  assert.equal(sanitized.correctOptionIds, undefined, "Sanitized question must NEVER leak correctOptionIds to client");
  sanitized.options.forEach((opt) => {
    assert.equal(opt.is_correct, undefined, "Option must not contain is_correct");
    assert.equal(opt.rationale, undefined, "Option must not contain rationale before answer submission");
  });

  // Authoritative Answer Verification
  const correctOptId = rawQ.correctOptionIds[0];
  const verification = questionRepository.verifyAnswer(rawQ.id, correctOptId);
  assert.ok(verification, "Verification object must be returned");
  assert.equal(verification.isCorrect, true);
  assert.ok(verification.explanation, "Verification returns full explanation upon submission");
});

test("Separation of Metrics: Training progression updates XP but preserves Battle Elo", () => {
  const guest = authService.createGuest();
  assert.ok(guest.user, "Guest user created");

  const initialProfile = dbService.getProfileByUserId(guest.user.id);
  const initialRating = initialProfile.rating;
  const initialBattles = initialProfile.battles_played;
  const initialXp = initialProfile.xp;

  // Add training XP
  const progress = dbService.addTrainingXp(guest.user.id, 50, true, 4000);
  assert.ok(progress, "Training XP progress updated");
  assert.equal(progress.newXp, initialXp + 50);

  const updatedProfile = dbService.getProfileByUserId(guest.user.id);
  assert.equal(updatedProfile.rating, initialRating, "Training mode must NEVER modify Elo rating");
  assert.equal(updatedProfile.battles_played, initialBattles, "Training mode must NEVER modify battles_played");
  assert.equal(updatedProfile.xp, initialXp + 50, "Training mode must advance XP");
});
