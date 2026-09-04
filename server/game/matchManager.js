import crypto from "node:crypto";
import { BATTLE_CONFIG } from "../config.js";
import { MATCH_STATES } from "./matchState.js";
import { questionBank } from "./questionBank.js";
import { questionSelector } from "./questionSelector.js";
import { ratingEngine } from "./ratingEngine.js";
import { xpEngine } from "./xpEngine.js";
import { dbService } from "../db/index.js";
import { masteryService } from "./masteryService.js";

class Match {
  constructor({ id, player1, player2, mode = "general", broadcastFn }) {
    this.id = id || crypto.randomUUID();
    this.mode = mode;
    this.broadcast = broadcastFn;

    this.player1 = {
      id: player1.id,
      username: player1.username,
      rating: player1.rating,
      peakRating: player1.peak_rating || player1.rating,
      level: player1.level || 1,
      xp: player1.xp || 0,
      battlesPlayed: player1.battles_played || 0,
      currentStreak: player1.current_streak || 0,
      score: 0,
      answers: [], // { roundIndex, questionId, selectedOptionId, isCorrect, responseTimeMs, pointsEarned }
      connected: true,
      rematchRequested: false,
    };

    this.player2 = {
      id: player2.id,
      username: player2.username,
      rating: player2.rating,
      peakRating: player2.peak_rating || player2.rating,
      level: player2.level || 1,
      xp: player2.xp || 0,
      battlesPlayed: player2.battles_played || 0,
      currentStreak: player2.current_streak || 0,
      score: 0,
      answers: [],
      connected: true,
      rematchRequested: false,
    };

    this.state = MATCH_STATES.MATCH_FOUND;
    this.rounds = []; // [ { question, roundNumber, startedAt, expiresAt, answers: { [userId]: {...} } } ]
    this.currentRoundIndex = 0;
    this.totalRounds = BATTLE_CONFIG.ROUNDS;
    this.isSuddenDeath = false;
    this.startedAt = Date.now();
    this.finishedAt = null;
    this.winnerId = null;
    this.isDraw = false;
    this.isForfeit = false;
    this.ratingResults = null;
    this.xpResults = null;
    this.analytics = null;

    this.roundTimer = null;
    this.countdownTimer = null;
    this.disconnectTimers = {};
    this.rematchTimer = null;

    // Load initial 5 questions using Smart Selector (cross-mode cooldown + progressive ladder)
    this.questions = questionSelector.selectBattleQuestions(this.player1.id, this.player2.id, {
      category: this.mode,
      p1Rating: this.player1.rating,
      p2Rating: this.player2.rating,
    });
  }

  getPlayer(userId) {
    if (this.player1.id === userId) return this.player1;
    if (this.player2.id === userId) return this.player2;
    return null;
  }

  getOpponent(userId) {
    if (this.player1.id === userId) return this.player2;
    if (this.player2.id === userId) return this.player1;
    return null;
  }

  startCountdown() {
    this.state = MATCH_STATES.COUNTDOWN;

    const vsPayload = {
      matchId: this.id,
      mode: this.mode,
      state: this.state,
      countdownSec: BATTLE_CONFIG.COUNTDOWN_DURATION_SEC,
      player1: {
        id: this.player1.id,
        username: this.player1.username,
        rating: this.player1.rating,
        rank: ratingEngine.getRankTier(this.player1.rating),
        level: this.player1.level,
      },
      player2: {
        id: this.player2.id,
        username: this.player2.username,
        rating: this.player2.rating,
        rank: ratingEngine.getRankTier(this.player2.rating),
        level: this.player2.level,
      },
    };

    this.broadcast(this.id, "match_countdown", vsPayload);

    this.countdownTimer = setTimeout(() => {
      this.startNextRound();
    }, BATTLE_CONFIG.COUNTDOWN_DURATION_SEC * 1000);
  }

  startNextRound() {
    if (this.currentRoundIndex >= this.totalRounds && !this.isSuddenDeath) {
      this.checkMatchConclusion();
      return;
    }

    this.state = MATCH_STATES.ROUND_ACTIVE;
    const roundNumber = this.currentRoundIndex + 1;
    const durationSec = BATTLE_CONFIG.QUESTION_DURATION_SEC;
    const now = Date.now();
    const expiresAt = now + durationSec * 1000;

    let question = this.questions[this.currentRoundIndex];
    if (this.isSuddenDeath && !question) {
      question = questionSelector.selectSuddenDeathQuestion(
        this.player1.id,
        this.player2.id,
        this.rounds.map((r) => r.question?.id).filter(Boolean)
      );
    }

    const roundData = {
      roundNumber,
      question,
      startedAt: now,
      expiresAt,
      answers: {},
    };
    this.rounds[this.currentRoundIndex] = roundData;

    // Send question to each player with randomized options and NO answers/explanations
    const qForP1 = questionBank.getSanitizedQuestionForPlayer(question, true);
    const qForP2 = questionBank.getSanitizedQuestionForPlayer(question, true);

    const baseEvent = {
      matchId: this.id,
      state: this.state,
      roundNumber,
      totalRounds: this.isSuddenDeath ? roundNumber : this.totalRounds,
      isSuddenDeath: this.isSuddenDeath,
      startedAt: now,
      expiresAt,
      durationSec,
      scores: {
        [this.player1.id]: this.player1.score,
        [this.player2.id]: this.player2.score,
      },
    };

    this.broadcast(this.id, "round_start", {
      ...baseEvent,
      forPlayer1: qForP1,
      forPlayer2: qForP2,
    });

    // Schedule authoritative round expiration (with 250ms latency margin)
    clearTimeout(this.roundTimer);
    this.roundTimer = setTimeout(() => {
      this.closeRound(true);
    }, durationSec * 1000 + 250);
  }

  submitAnswer({ userId, questionId, selectedOptionId }) {
    if (this.state !== MATCH_STATES.ROUND_ACTIVE) {
      return { success: false, error: "Round is not active." };
    }

    const player = this.getPlayer(userId);
    if (!player) return { success: false, error: "Player not in match." };

    const currentRound = this.rounds[this.currentRoundIndex];
    if (!currentRound) return { success: false, error: "No active round." };

    if (currentRound.question.id !== questionId) {
      return { success: false, error: "Question mismatch." };
    }

    if (currentRound.answers[userId]) {
      return { success: false, error: "Answer already submitted for this round." };
    }

    const now = Date.now();
    const serverElapsedMs = Math.max(0, now - currentRound.startedAt);
    const durationMs = (currentRound.expiresAt - currentRound.startedAt) || (BATTLE_CONFIG.QUESTION_DURATION_SEC * 1000);

    // Validate answer
    const check = questionBank.checkAnswer(questionId, selectedOptionId);
    let points = 0;
    let speedBonus = 0;

    if (check.isCorrect) {
      // Speed bonus scaling from 0 to 50
      const remainingRatio = Math.max(0, 1 - (serverElapsedMs / durationMs));
      speedBonus = Math.round(BATTLE_CONFIG.SPEED_BONUS_MAX * remainingRatio);
      points = BATTLE_CONFIG.SCORE_BASE + speedBonus;
      player.score += points;
    }

    const answerRecord = {
      userId,
      questionId,
      selectedOptionId,
      isCorrect: check.isCorrect,
      responseTimeMs: serverElapsedMs,
      pointsEarned: points,
      speedBonus,
      submittedAt: now,
    };

    currentRound.answers[userId] = answerRecord;
    player.answers.push(answerRecord);

    // Notify match that this player has answered (without revealing the choice to opponent)
    this.broadcast(this.id, "opponent_answered", {
      userId,
      hasAnswered: true,
    });

    // Check if both players have submitted
    const bothSubmitted = currentRound.answers[this.player1.id] && currentRound.answers[this.player2.id];
    if (bothSubmitted) {
      clearTimeout(this.roundTimer);
      this.closeRound(false);
    }

    return { success: true, pointsEarned: points, isCorrect: check.isCorrect };
  }

  closeRound(isTimeout = false) {
    if (this.state !== MATCH_STATES.ROUND_ACTIVE) return;
    this.state = MATCH_STATES.ROUND_RESULT;
    clearTimeout(this.roundTimer);

    const currentRound = this.rounds[this.currentRoundIndex];
    if (!currentRound) return;

    // Fill missing answers as timeouts
    [this.player1, this.player2].forEach((p) => {
      if (!currentRound.answers[p.id]) {
        const timeoutRecord = {
          userId: p.id,
          questionId: currentRound.question.id,
          selectedOptionId: null,
          isCorrect: false,
          responseTimeMs: BATTLE_CONFIG.QUESTION_DURATION_SEC * 1000,
          pointsEarned: 0,
          speedBonus: 0,
          isTimeout: true,
          submittedAt: Date.now(),
        };
        currentRound.answers[p.id] = timeoutRecord;
        p.answers.push(timeoutRecord);
      }
    });

    const p1Answer = currentRound.answers[this.player1.id];
    const p2Answer = currentRound.answers[this.player2.id];

    const resultPayload = {
      matchId: this.id,
      state: this.state,
      roundNumber: currentRound.roundNumber,
      totalRounds: this.isSuddenDeath ? currentRound.roundNumber : this.totalRounds,
      isSuddenDeath: this.isSuddenDeath,
      question: {
        id: currentRound.question.id,
        prompt: currentRound.question.prompt,
        category: currentRound.question.category,
        subcategory: currentRound.question.subcategory,
        explanation: currentRound.question.explanation,
        correctOptionIds: currentRound.question.correctOptionIds,
        options: currentRound.question.options,
      },
      player1: {
        id: this.player1.id,
        username: this.player1.username,
        score: this.player1.score,
        roundPoints: p1Answer.pointsEarned,
        isCorrect: p1Answer.isCorrect,
        responseTimeMs: p1Answer.responseTimeMs,
        speedBonus: p1Answer.speedBonus,
        selectedOptionId: p1Answer.selectedOptionId,
      },
      player2: {
        id: this.player2.id,
        username: this.player2.username,
        score: this.player2.score,
        roundPoints: p2Answer.pointsEarned,
        isCorrect: p2Answer.isCorrect,
        responseTimeMs: p2Answer.responseTimeMs,
        speedBonus: p2Answer.speedBonus,
        selectedOptionId: p2Answer.selectedOptionId,
      },
      cooldownSec: BATTLE_CONFIG.ROUND_COOLDOWN_SEC,
    };

    this.broadcast(this.id, "round_result", resultPayload);

    // If in sudden death and scores are no longer tied, finish immediately
    if (this.isSuddenDeath && this.player1.score !== this.player2.score) {
      setTimeout(() => {
        this.finishMatch();
      }, BATTLE_CONFIG.ROUND_COOLDOWN_SEC * 1000);
      return;
    }

    // Schedule next round
    setTimeout(() => {
      this.currentRoundIndex++;
      this.startNextRound();
    }, BATTLE_CONFIG.ROUND_COOLDOWN_SEC * 1000);
  }

  checkMatchConclusion() {
    // If scores are tied after 5 rounds:
    if (this.player1.score === this.player2.score) {
      // 1. Check correct answer count
      const p1Correct = this.player1.answers.filter((a) => a.isCorrect).length;
      const p2Correct = this.player2.answers.filter((a) => a.isCorrect).length;

      if (p1Correct > p2Correct) {
        this.winnerId = this.player1.id;
        this.finishMatch();
        return;
      }
      if (p2Correct > p1Correct) {
        this.winnerId = this.player2.id;
        this.finishMatch();
        return;
      }

      // 2. Check lower average response time
      const p1AvgTime = this.player1.answers.reduce((acc, a) => acc + a.responseTimeMs, 0) / (this.player1.answers.length || 1);
      const p2AvgTime = this.player2.answers.reduce((acc, a) => acc + a.responseTimeMs, 0) / (this.player2.answers.length || 1);

      if (Math.abs(p1AvgTime - p2AvgTime) > 100) {
        this.winnerId = p1AvgTime < p2AvgTime ? this.player1.id : this.player2.id;
        this.finishMatch();
        return;
      }

      // 3. Trigger Sudden Death Round!
      this.isSuddenDeath = true;
      this.broadcast(this.id, "sudden_death_announced", {
        matchId: this.id,
        reason: "Scores and performance metrics tied. Initiating Sudden Death.",
      });

      setTimeout(() => {
        this.startNextRound();
      }, 3000);
      return;
    }

    this.finishMatch();
  }

  finishMatch({ forfeitUserId = null } = {}) {
    this.state = forfeitUserId ? MATCH_STATES.FORFEIT : MATCH_STATES.MATCH_FINISHED;
    this.finishedAt = Date.now();
    clearTimeout(this.roundTimer);
    clearTimeout(this.countdownTimer);

    if (forfeitUserId) {
      this.isForfeit = true;
      this.winnerId = forfeitUserId === this.player1.id ? this.player2.id : this.player1.id;
    } else if (!this.winnerId) {
      if (this.player1.score > this.player2.score) {
        this.winnerId = this.player1.id;
      } else if (this.player2.score > this.player1.score) {
        this.winnerId = this.player2.id;
      } else {
        this.isDraw = true;
      }
    }

    const outcome = this.isDraw ? "draw" : this.winnerId === this.player1.id ? "p1" : "p2";

    // Elo calculation
    const ratingChanges = ratingEngine.calculateMatchRatings({
      p1Rating: this.player1.rating,
      p2Rating: this.player2.rating,
      outcome,
      p1Battles: this.player1.battlesPlayed,
      p2Battles: this.player2.battlesPlayed,
    });
    this.ratingResults = ratingChanges;

    // XP calculation
    const p1CorrectCount = this.player1.answers.filter((a) => a.isCorrect).length;
    const p2CorrectCount = this.player2.answers.filter((a) => a.isCorrect).length;

    const p1XpGained = xpEngine.calculateMatchXp({
      isWin: this.winnerId === this.player1.id,
      isDraw: this.isDraw,
      correctAnswers: p1CorrectCount,
      totalRounds: this.rounds.length,
    });

    const p2XpGained = xpEngine.calculateMatchXp({
      isWin: this.winnerId === this.player2.id,
      isDraw: this.isDraw,
      correctAnswers: p2CorrectCount,
      totalRounds: this.rounds.length,
    });

    const p1NewLevel = xpEngine.getLevelFromXp(this.player1.xp + p1XpGained);
    const p2NewLevel = xpEngine.getLevelFromXp(this.player2.xp + p2XpGained);

    this.xpResults = {
      [this.player1.id]: { xpGained: p1XpGained, newLevel: p1NewLevel },
      [this.player2.id]: { xpGained: p2XpGained, newLevel: p2NewLevel },
    };

    // Category Analytics & Weak Topics
    this.analytics = this.computeAnalytics();

    // Persist to Database
    this.persistResults(p1CorrectCount, p2CorrectCount, p1XpGained, p2XpGained, p1NewLevel, p2NewLevel);

    // Broadcast final match completion event
    const summaryPayload = {
      matchId: this.id,
      state: this.state,
      mode: this.mode,
      winnerId: this.winnerId,
      isDraw: this.isDraw,
      isForfeit: this.isForfeit,
      forfeitUserId,
      player1: {
        id: this.player1.id,
        username: this.player1.username,
        score: this.player1.score,
        ratingBefore: this.player1.rating,
        ratingAfter: ratingChanges.player1.newRating,
        ratingDelta: ratingChanges.player1.delta,
        rank: ratingEngine.getRankTier(ratingChanges.player1.newRating),
        xpGained: p1XpGained,
        newLevel: p1NewLevel,
        correctCount: p1CorrectCount,
        totalQuestions: this.rounds.length,
        avgResponseTimeMs: Math.round(
          this.player1.answers.reduce((acc, a) => acc + a.responseTimeMs, 0) / (this.player1.answers.length || 1)
        ),
      },
      player2: {
        id: this.player2.id,
        username: this.player2.username,
        score: this.player2.score,
        ratingBefore: this.player2.rating,
        ratingAfter: ratingChanges.player2.newRating,
        ratingDelta: ratingChanges.player2.delta,
        rank: ratingEngine.getRankTier(ratingChanges.player2.newRating),
        xpGained: p2XpGained,
        newLevel: p2NewLevel,
        correctCount: p2CorrectCount,
        totalQuestions: this.rounds.length,
        avgResponseTimeMs: Math.round(
          this.player2.answers.reduce((acc, a) => acc + a.responseTimeMs, 0) / (this.player2.answers.length || 1)
        ),
      },
      analytics: this.analytics,
      rematchTimeoutSec: BATTLE_CONFIG.REMATCH_TIMEOUT_SEC,
    };

    this.broadcast(this.id, "match_finished", summaryPayload);

    // Memory Leak Fix: Automatically remove the match from memory after 30 seconds
    // (giving enough time for players to view the result screen and request a rematch)
    setTimeout(() => {
      // Don't remove if they accepted a rematch and are still using the match ID for handshake
      // Actually, accept_rematch removes the match when a new one is created.
      matchManager.removeMatch(this.id);
    }, 45000); // 45 seconds (rematch timeout is 20s)
  }

  computeAnalytics() {
    const categories = {};

    this.rounds.forEach((round) => {
      const cat = round.question.category;
      const catSlug = round.question.categorySlug;
      if (!categories[cat]) {
        categories[cat] = {
          name: cat,
          slug: catSlug,
          total: 0,
          player1Correct: 0,
          player2Correct: 0,
        };
      }
      categories[cat].total += 1;

      if (round.answers[this.player1.id]?.isCorrect) {
        categories[cat].player1Correct += 1;
      }
      if (round.answers[this.player2.id]?.isCorrect) {
        categories[cat].player2Correct += 1;
      }
    });

    const formatForPlayer = (playerId) => {
      const breakdown = Object.values(categories).map((c) => {
        const correct = playerId === this.player1.id ? c.player1Correct : c.player2Correct;
        const pct = Math.round((correct / (c.total || 1)) * 100);
        return {
          category: c.name,
          slug: c.slug,
          correct,
          total: c.total,
          accuracy: pct,
        };
      });

      // Identify weakest topic (lowest accuracy)
      const sorted = [...breakdown].sort((a, b) => a.accuracy - b.accuracy);
      const weakest = sorted.length > 0 && sorted[0].accuracy < 100 ? sorted[0] : null;

      return {
        breakdown,
        weakestTopic: weakest,
      };
    };

    return {
      [this.player1.id]: formatForPlayer(this.player1.id),
      [this.player2.id]: formatForPlayer(this.player2.id),
    };
  }

  persistResults(p1CorrectCount, p2CorrectCount, p1XpGained, p2XpGained, p1NewLevel, p2NewLevel) {
    const isP1Win = this.winnerId === this.player1.id;
    const isP2Win = this.winnerId === this.player2.id;

    const p1Streak = isP1Win ? this.player1.currentStreak + 1 : 0;
    const p2Streak = isP2Win ? this.player2.currentStreak + 1 : 0;

    const p1TotalTime = this.player1.answers.reduce((acc, a) => acc + a.responseTimeMs, 0);
    const p2TotalTime = this.player2.answers.reduce((acc, a) => acc + a.responseTimeMs, 0);

    // Update Player 1 profile
    dbService.updateProfilePostMatch(this.player1.id, {
      rating: this.ratingResults.player1.newRating,
      xpGain: p1XpGained,
      newLevel: p1NewLevel,
      isWin: isP1Win,
      isLoss: isP2Win,
      isDraw: this.isDraw,
      currentStreak: p1Streak,
      correctCount: p1CorrectCount,
      questionCount: this.rounds.length,
      responseTimeMs: p1TotalTime,
    });

    // Update Player 2 profile
    dbService.updateProfilePostMatch(this.player2.id, {
      rating: this.ratingResults.player2.newRating,
      xpGain: p2XpGained,
      newLevel: p2NewLevel,
      isWin: isP2Win,
      isLoss: isP1Win,
      isDraw: this.isDraw,
      currentStreak: p2Streak,
      correctCount: p2CorrectCount,
      questionCount: this.rounds.length,
      responseTimeMs: p2TotalTime,
    });

    // Record category stats for training bridges
    this.rounds.forEach((round) => {
      const cat = round.question.category;
      if (round.answers[this.player1.id]) {
        dbService.recordCategoryResult(this.player1.id, cat, round.answers[this.player1.id].isCorrect);
      }
      if (round.answers[this.player2.id]) {
        dbService.recordCategoryResult(this.player2.id, cat, round.answers[this.player2.id].isCorrect);
      }
    });

    // Record User Question History (30-day anti-repetition cooldown) & Update Skill Profiles
    this.rounds.forEach((round) => {
      if (!round.question) return;
      const qId = round.question.id;
      const domain = round.question.domain || round.question.category || "General Cybersecurity";
      const category = round.question.category || round.question.domain || "Cybersecurity";
      const subcategory = round.question.subcategory || "";
      const conceptId = round.question.concept_id || round.question.conceptId || subcategory || "general";
      const difficulty = round.question.difficulty || "medium";

      const p1Ans = round.answers[this.player1.id];
      if (p1Ans) {
        dbService.recordUserQuestionHistory({
          userId: this.player1.id,
          questionId: qId,
          matchId: this.id,
          mode: "battle",
          wasCorrect: p1Ans.isCorrect,
          responseTimeMs: p1Ans.responseTimeMs,
        });
        try {
          masteryService.updateMasteryOnAnswer({
            userId: this.player1.id,
            domain,
            category,
            subcategory,
            conceptId,
            isCorrect: p1Ans.isCorrect,
            mode: "battle",
            responseTimeMs: p1Ans.responseTimeMs,
            difficulty,
          });
        } catch {}
      }

      const p2Ans = round.answers[this.player2.id];
      if (p2Ans) {
        dbService.recordUserQuestionHistory({
          userId: this.player2.id,
          questionId: qId,
          matchId: this.id,
          mode: "battle",
          wasCorrect: p2Ans.isCorrect,
          responseTimeMs: p2Ans.responseTimeMs,
        });
        try {
          masteryService.updateMasteryOnAnswer({
            userId: this.player2.id,
            domain,
            category,
            subcategory,
            conceptId,
            isCorrect: p2Ans.isCorrect,
            mode: "battle",
            responseTimeMs: p2Ans.responseTimeMs,
            difficulty,
          });
        } catch {}
      }
    });

    // Record match history
    const matchRecord = {
      id: this.id,
      mode: this.mode,
      player1_id: this.player1.id,
      player2_id: this.player2.id,
      player1_score: this.player1.score,
      player2_score: this.player2.score,
      winner_id: this.winnerId,
      is_draw: this.isDraw,
      is_forfeit: this.isForfeit,
      p1_rating_before: this.player1.rating,
      p1_rating_after: this.ratingResults.player1.newRating,
      p2_rating_before: this.player2.rating,
      p2_rating_after: this.ratingResults.player2.newRating,
      started_at: this.startedAt,
      finished_at: this.finishedAt,
      data_json: JSON.stringify({
        rounds: this.rounds.map((r) => ({
          roundNumber: r.roundNumber,
          questionId: r.question.id,
          prompt: r.question.prompt,
          category: r.question.category,
          correctOptionIds: r.question.correctOptionIds,
          answers: r.answers,
        })),
        analytics: this.analytics,
      }),
    };

    dbService.recordMatch(matchRecord);
  }

  handlePlayerDisconnect(userId) {
    const player = this.getPlayer(userId);
    if (!player) return;
    player.connected = false;

    if (this.state === MATCH_STATES.MATCH_FINISHED || this.state === MATCH_STATES.FORFEIT) {
      return;
    }

    const opponent = this.getOpponent(userId);
    this.broadcast(this.id, "opponent_disconnected", {
      userId,
      gracePeriodSec: BATTLE_CONFIG.RECONNECT_GRACE_PERIOD_SEC,
    });

    this.disconnectTimers[userId] = setTimeout(() => {
      if (!player.connected && this.state !== MATCH_STATES.MATCH_FINISHED && this.state !== MATCH_STATES.FORFEIT) {
        this.finishMatch({ forfeitUserId: userId });
      }
    }, BATTLE_CONFIG.RECONNECT_GRACE_PERIOD_SEC * 1000);
  }

  handlePlayerReconnect(userId) {
    const player = this.getPlayer(userId);
    if (!player) return null;

    player.connected = true;
    if (this.disconnectTimers[userId]) {
      clearTimeout(this.disconnectTimers[userId]);
      delete this.disconnectTimers[userId];
    }

    this.broadcast(this.id, "opponent_reconnected", { userId });

    return this.getStateSnapshotForPlayer(userId);
  }

  getStateSnapshotForPlayer(userId) {
    const currentRound = this.rounds[this.currentRoundIndex];
    let sanitizedQuestion = null;
    if (currentRound && this.state === MATCH_STATES.ROUND_ACTIVE) {
      sanitizedQuestion = questionBank.getSanitizedQuestionForPlayer(currentRound.question, true);
    }

    return {
      matchId: this.id,
      state: this.state,
      mode: this.mode,
      currentRoundIndex: this.currentRoundIndex,
      totalRounds: this.totalRounds,
      isSuddenDeath: this.isSuddenDeath,
      player1: {
        id: this.player1.id,
        username: this.player1.username,
        score: this.player1.score,
        rating: this.player1.rating,
        rank: ratingEngine.getRankTier(this.player1.rating),
      },
      player2: {
        id: this.player2.id,
        username: this.player2.username,
        score: this.player2.score,
        rating: this.player2.rating,
        rank: ratingEngine.getRankTier(this.player2.rating),
      },
      currentRound: currentRound
        ? {
            roundNumber: currentRound.roundNumber,
            startedAt: currentRound.startedAt,
            expiresAt: currentRound.expiresAt,
            question: sanitizedQuestion,
            hasAnswered: Boolean(currentRound.answers[userId]),
          }
        : null,
      winnerId: this.winnerId,
      isDraw: this.isDraw,
      isForfeit: this.isForfeit,
      ratingResults: this.ratingResults,
      xpResults: this.xpResults,
      analytics: this.analytics ? this.analytics[userId] : null,
    };
  }

  requestRematch(userId) {
    const player = this.getPlayer(userId);
    const opponent = this.getOpponent(userId);
    if (!player || !opponent) return { success: false, error: "Player not found." };

    player.rematchRequested = true;

    this.broadcast(this.id, "rematch_offered", {
      fromUserId: userId,
      fromUsername: player.username,
      timeoutSec: BATTLE_CONFIG.REMATCH_TIMEOUT_SEC,
    });

    clearTimeout(this.rematchTimer);
    this.rematchTimer = setTimeout(() => {
      this.player1.rematchRequested = false;
      this.player2.rematchRequested = false;
      this.broadcast(this.id, "rematch_expired", { matchId: this.id });
    }, BATTLE_CONFIG.REMATCH_TIMEOUT_SEC * 1000);

    return { success: true };
  }

  acceptRematch(userId) {
    const player = this.getPlayer(userId);
    const opponent = this.getOpponent(userId);
    if (!player || !opponent) return { success: false, error: "Player not found." };

    player.rematchRequested = true;
    clearTimeout(this.rematchTimer);

    if (this.player1.rematchRequested && this.player2.rematchRequested) {
      return { startNewMatch: true, player1: this.player1, player2: this.player2 };
    }

    return { startNewMatch: false };
  }
}

export const matchManager = {
  activeMatches: new Map(),

  createMatch({ player1, player2, mode = "general", broadcastFn }) {
    const match = new Match({ player1, player2, mode, broadcastFn });
    this.activeMatches.set(match.id, match);
    match.startCountdown();
    return match;
  },

  getMatch(matchId) {
    return this.activeMatches.get(matchId) || null;
  },

  removeMatch(matchId) {
    const m = this.activeMatches.get(matchId);
    if (m) {
      clearTimeout(m.roundTimer);
      clearTimeout(m.countdownTimer);
      clearTimeout(m.rematchTimer);
      Object.values(m.disconnectTimers).forEach(clearTimeout);
      this.activeMatches.delete(matchId);
    }
  },
};
