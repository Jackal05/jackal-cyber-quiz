import test from "node:test";
import assert from "node:assert/strict";

import { ratingEngine } from "../game/ratingEngine.js";
import { xpEngine } from "../game/xpEngine.js";
import { questionBank } from "../game/questionBank.js";
import { queueManager } from "../matchmaking/queueManager.js";
import { BATTLE_CONFIG } from "../config.js";

test("Rating Engine: Elo calculations", () => {
  // Equal rating win
  const equalResult = ratingEngine.calculateElo({
    playerRating: 1200,
    opponentRating: 1200,
    outcome: 1,
    battlesPlayed: 20,
  });
  assert.equal(equalResult.delta > 0, true, "Winner should gain rating");
  assert.equal(equalResult.newRating, 1200 + equalResult.delta);

  // Equal rating loss
  const lossResult = ratingEngine.calculateElo({
    playerRating: 1200,
    opponentRating: 1200,
    outcome: 0,
    battlesPlayed: 20,
  });
  assert.equal(lossResult.delta < 0, true, "Loser should lose rating");
  assert.equal(lossResult.delta, -equalResult.delta, "Symmetric Elo gain/loss for equal ratings");

  // Upset win: Lower rated player beats higher rated player
  const upsetWin = ratingEngine.calculateElo({
    playerRating: 1100,
    opponentRating: 1500,
    outcome: 1,
    battlesPlayed: 20,
  });
  assert.equal(upsetWin.delta > equalResult.delta, true, "Upset win should award larger delta");

  // Match ratings pair calculation
  const matchElo = ratingEngine.calculateMatchRatings({
    p1Rating: 1400,
    p2Rating: 1300,
    outcome: "p1",
  });
  assert.equal(matchElo.player1.delta > 0, true);
  assert.equal(matchElo.player2.delta < 0, true);
});

test("Rating Engine: Rank tiers and subdivisions", () => {
  assert.equal(ratingEngine.getRankTier(950).id, "bronze");
  assert.equal(ratingEngine.getRankTier(1150).id, "silver");
  assert.equal(ratingEngine.getRankTier(1482).id, "gold");
  assert.equal(ratingEngine.getRankTier(1482).displayName, "Gold I");
  assert.equal(ratingEngine.getRankTier(1600).id, "platinum");
  assert.equal(ratingEngine.getRankTier(1750).id, "diamond");
  assert.equal(ratingEngine.getRankTier(1950).id, "master");
  assert.equal(ratingEngine.getRankTier(2200).id, "elite");
});

test("XP Engine: Progression and Leveling", () => {
  // Level from XP
  assert.equal(xpEngine.getLevelFromXp(0), 1);
  assert.equal(xpEngine.getLevelFromXp(50), 1);
  assert.equal(xpEngine.getLevelFromXp(100), 2);
  assert.equal(xpEngine.getLevelFromXp(400), 3);
  assert.equal(xpEngine.getLevelFromXp(900), 4);

  // Match XP rewards
  const winXp = xpEngine.calculateMatchXp({
    isWin: true,
    isDraw: false,
    correctAnswers: 5,
    totalRounds: 5,
  });
  // 50 (completion) + 100 (win) + 5*20 (correct) + 150 (perfect) = 400
  assert.equal(winXp, 400);

  const lossXp = xpEngine.calculateMatchXp({
    isWin: false,
    isDraw: false,
    correctAnswers: 2,
    totalRounds: 5,
  });
  // 50 (completion) + 0 + 2*20 = 90
  assert.equal(lossXp, 90);

  const progress = xpEngine.getLevelProgress(250);
  assert.equal(progress.level, 2);
  assert.equal(progress.xpInLevel, 150);
});

test("Question Bank: Normalization and Security Sanitization", () => {
  const all = questionBank.getAllQuestions();
  assert.equal(all.length > 50, true, "Should load full question bank");

  const sample = all[0];
  assert.equal(typeof sample.id, "string");
  assert.equal(typeof sample.prompt, "string");
  assert.equal(Array.isArray(sample.options), true);
  assert.equal(Array.isArray(sample.correctOptionIds), true);

  // Security test: Sanitization MUST strip answers and explanations
  const sanitized = questionBank.getSanitizedQuestionForPlayer(sample, true);
  assert.equal(sanitized.id, sample.id);
  assert.equal(sanitized.prompt, sample.prompt);
  assert.equal(sanitized.correctOptionIds, undefined, "CRITICAL: correctOptionIds must NOT be leaked!");
  assert.equal(sanitized.explanation, undefined, "CRITICAL: explanation must NOT be leaked!");
  assert.equal(sanitized.options.length, sample.options.length);

  // Correct answer verification
  const checkCorrect = questionBank.checkAnswer(sample.id, sample.correctOptionIds[0]);
  assert.equal(checkCorrect.isCorrect, true);

  const checkWrong = questionBank.checkAnswer(sample.id, "opt_invalid_999");
  assert.equal(checkWrong.isCorrect, false);
});

test("Matchmaking: Search radius expansion", () => {
  assert.equal(queueManager.getSearchRadius(5), 100);
  assert.equal(queueManager.getSearchRadius(15), 200);
  assert.equal(queueManager.getSearchRadius(25), 350);
  assert.equal(queueManager.getSearchRadius(45), 500);
  assert.equal(queueManager.getSearchRadius(100), 1000);
});

test("Speed Bonus: Proper scaling", () => {
  const durationMs = 20000;

  // Immediate answer (0s): maximum speed bonus +50
  const fastRatio = Math.max(0, 1 - 500 / durationMs);
  const fastBonus = Math.round(BATTLE_CONFIG.SPEED_BONUS_MAX * fastRatio);
  assert.equal(fastBonus >= 48, true);

  // Half time answer (10s): ~+25 bonus
  const midRatio = Math.max(0, 1 - 10000 / durationMs);
  const midBonus = Math.round(BATTLE_CONFIG.SPEED_BONUS_MAX * midRatio);
  assert.equal(midBonus, 25);

  // Last second answer (19.8s): ~0 bonus
  const lateRatio = Math.max(0, 1 - 19800 / durationMs);
  const lateBonus = Math.round(BATTLE_CONFIG.SPEED_BONUS_MAX * lateRatio);
  assert.equal(lateBonus <= 1, true);
});
