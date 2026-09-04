import crypto from "node:crypto";
import { authService } from "../auth/authService.js";
import { tokenService } from "../auth/tokenService.js";
import { dbService } from "../db/index.js";
import { ratingEngine } from "../game/ratingEngine.js";
import { JobRunner } from "../engine/jobs/jobRunner.js";
import { CONCEPT_GRAPH } from "../engine/taxonomy/conceptGraph.js";
import { adaptiveTrainingSelector } from "../game/trainingSelector.js";
import { questionRepository } from "../game/questionRepository.js";
import { masteryService } from "../game/masteryService.js";
import { spacedRepetitionService } from "../game/spacedRepetitionService.js";
import { xpEngine } from "../game/xpEngine.js";

const jobRunner = new JobRunner();

export function setupApiRoutes(app, wsContext) {
  function parseBody(req) {
    return new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    });
    res.end(JSON.stringify(data));
    return true;
  }

  function getAuthUser(req) {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    const decoded = tokenService.verifyToken(token);
    if (!decoded) return null;
    return authService.getProfile(decoded.userId);
  }

  return async function handleApiRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      });
      res.end();
      return true;
    }

    if (!pathname.startsWith("/api/")) {
      return false; // Not handled by API
    }

    // POST /api/auth/register
    if (pathname === "/api/auth/register" && method === "POST") {
      const body = await parseBody(req);
      const result = authService.register(body);
      if (result.error) return sendJson(res, 400, { error: result.error });
      return sendJson(res, 201, result);
    }

    // POST /api/auth/login
    if (pathname === "/api/auth/login" && method === "POST") {
      const body = await parseBody(req);
      const result = authService.login(body);
      if (result.error) return sendJson(res, 401, { error: result.error });
      return sendJson(res, 200, result);
    }

    // POST /api/auth/guest
    if (pathname === "/api/auth/guest" && method === "POST") {
      const body = await parseBody(req);
      const result = authService.createGuest(body.callsign);
      return sendJson(res, 201, result);
    }

    // GET /api/auth/me
    if (pathname === "/api/auth/me" && method === "GET") {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: "Unauthorized" });
      const rank = ratingEngine.getRankTier(user.rating);
      return sendJson(res, 200, { user: { ...user, rank } });
    }

    // PATCH /api/auth/callsign
    if (pathname === "/api/auth/callsign" && method === "PATCH") {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: "Unauthorized" });
      const body = await parseBody(req);
      const result = authService.updateCallsign(user.id, body.callsign);
      if (result.error) return sendJson(res, 400, { error: result.error });
      return sendJson(res, 200, result);
    }

    // GET /api/profile/:username
    if (pathname.startsWith("/api/profile/") && method === "GET") {
      const username = pathname.replace("/api/profile/", "");
      const dbUser = dbService.getUserByUsername(decodeURIComponent(username));
      if (!dbUser) return sendJson(res, 404, { error: "Player not found" });

      const profile = dbService.getProfileByUserId(dbUser.id);
      const rank = ratingEngine.getRankTier(profile.rating);
      const categoryStats = dbService.getCategoryStats(dbUser.id);

      return sendJson(res, 200, {
        profile: { ...profile, rank },
        categoryStats,
      });
    }

    // GET /api/leaderboard
    if (pathname === "/api/leaderboard" && method === "GET") {
      const list = dbService.getLeaderboard(50);
      const enriched = list.map((p, idx) => ({
        rankPosition: idx + 1,
        ...p,
        rank: ratingEngine.getRankTier(p.rating),
        winRate: p.battles_played > 0 ? Math.round((p.wins / p.battles_played) * 100) : 0,
      }));
      return sendJson(res, 200, { leaderboard: enriched });
    }

    // GET /api/battle/history
    if (pathname === "/api/battle/history" && method === "GET") {
      const user = getAuthUser(req);
      const queryUserId = url.searchParams.get("userId") || (user ? user.id : null);
      if (!queryUserId) return sendJson(res, 400, { error: "User ID required" });

      const matches = dbService.getMatchHistory(queryUserId, 20);
      return sendJson(res, 200, { matches });
    }

    // GET /api/battle/match/:id
    if (pathname.startsWith("/api/battle/match/") && method === "GET") {
      const matchId = pathname.replace("/api/battle/match/", "");
      const match = dbService.getMatchById(matchId);
      if (!match) return sendJson(res, 404, { error: "Match not found" });

      let parsedData = null;
      try {
        parsedData = JSON.parse(match.data_json);
      } catch {
        parsedData = {};
      }

      return sendJson(res, 200, { match: { ...match, details: parsedData } });
    }

    // GET /api/stats/online
    if (pathname === "/api/stats/online" && method === "GET") {
      const count = wsContext?.getOnlineCount ? wsContext.getOnlineCount() : 1;
      return sendJson(res, 200, { onlineCount: Math.max(1, count) });
    }

    // ============================================================================
    // Question Generation Engine REST Endpoints
    // ============================================================================

    // GET /api/engine/taxonomy
    if (pathname === "/api/engine/taxonomy" && method === "GET") {
      return sendJson(res, 200, { taxonomy: CONCEPT_GRAPH });
    }

    // GET /api/engine/coverage
    if (pathname === "/api/engine/coverage" && method === "GET") {
      const matrix = dbService.getCoverageMatrix();
      return sendJson(res, 200, { coverage: matrix });
    }

    // POST /api/engine/generate
    if (pathname === "/api/engine/generate" && method === "POST") {
      const body = await parseBody(req);
      const {
        domain = "Security Operations & Defense",
        topic = "all",
        targetCount = 5,
        difficulty = "medium",
        provider = "synthesizer",
      } = body;

      const jobId = dbService.createJob({
        domain,
        topic,
        target_count: Math.min(50, Math.max(1, parseInt(targetCount, 10) || 5)),
        difficulty,
        provider,
      });

      // Launch async generation task in background
      jobRunner.runJob(jobId).catch((err) => {
        console.error(`Background job runner error for ${jobId}:`, err);
      });

      return sendJson(res, 202, {
        success: true,
        jobId,
        message: "Batch question generation job started",
      });
    }

    // GET /api/engine/jobs
    if (pathname === "/api/engine/jobs" && method === "GET") {
      const jobs = dbService.getAllJobs(50);
      return sendJson(res, 200, { jobs });
    }

    // GET /api/engine/jobs/:id
    if (pathname.startsWith("/api/engine/jobs/") && method === "GET") {
      const jobId = pathname.replace("/api/engine/jobs/", "");
      const job = dbService.getJobById(jobId);
      if (!job) return sendJson(res, 404, { error: "Job not found" });
      return sendJson(res, 200, { job });
    }

    // GET /api/engine/questions
    if (pathname === "/api/engine/questions" && method === "GET") {
      const domain = url.searchParams.get("domain") || "all";
      const difficulty = url.searchParams.get("difficulty") || "all";
      const status = url.searchParams.get("status") || "all";
      const search = url.searchParams.get("search") || "";
      const limit = Math.min(200, parseInt(url.searchParams.get("limit") || "50", 10));
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);

      const questions = dbService.getAllEngineQuestions({
        domain,
        difficulty,
        status,
        search,
        limit,
        offset,
      });

      return sendJson(res, 200, { questions, total: questions.length });
    }

    // GET /api/engine/questions/:id
    if (pathname.startsWith("/api/engine/questions/") && method === "GET") {
      const qId = pathname.replace("/api/engine/questions/", "");
      const question = dbService.getQuestionById(qId);
      if (!question) return sendJson(res, 404, { error: "Question not found" });
      return sendJson(res, 200, { question });
    }

    // PATCH /api/engine/questions/:id
    if (pathname.startsWith("/api/engine/questions/") && method === "PATCH") {
      const qId = pathname.replace("/api/engine/questions/", "");
      const body = await parseBody(req);
      const { status, notes } = body;

      if (!status || !["approved", "needs_review", "rejected"].includes(status)) {
        return sendJson(res, 400, { error: "Valid status required ('approved', 'needs_review', 'rejected')" });
      }

      dbService.updateQuestionStatus(qId, status, notes);
      return sendJson(res, 200, { success: true, message: `Question updated to ${status}` });
    }

    // POST /api/engine/report
    if (pathname === "/api/engine/report" && method === "POST") {
      const user = getAuthUser(req);
      const body = await parseBody(req);
      const { questionId, reason, comment = "" } = body;

      if (!questionId || !reason) {
        return sendJson(res, 400, { error: "questionId and reason required" });
      }

      const reportId = dbService.createQuestionReport({
        questionId,
        userId: user ? user.id : "anonymous",
        reason,
        comment,
      });

      return sendJson(res, 201, { success: true, reportId });
    }

    // GET /api/engine/reports
    if (pathname === "/api/engine/reports" && method === "GET") {
      const reports = dbService.getQuestionReports(50);
      return sendJson(res, 200, { reports });
    }

    // PATCH /api/engine/questions/:id/availability
    if (pathname.startsWith("/api/engine/questions/") && pathname.endsWith("/availability") && method === "PATCH") {
      const qId = pathname.replace("/api/engine/questions/", "").replace("/availability", "");
      const body = await parseBody(req);
      const { availableInTraining, availableInBattle } = body;

      dbService.updateQuestionAvailability(qId, {
        availableInTraining: availableInTraining !== undefined ? Boolean(availableInTraining) : undefined,
        availableInBattle: availableInBattle !== undefined ? Boolean(availableInBattle) : undefined,
      });

      return sendJson(res, 200, {
        success: true,
        questionId: qId,
        availableInTraining,
        availableInBattle,
      });
    }

    // POST /api/training/session/start
    if (pathname === "/api/training/session/start" && method === "POST") {
      const user = getAuthUser(req);
      const body = await parseBody(req);
      const userId = user ? user.id : (body.userId || "usr_guest");
      const {
        sessionType = "mixed",
        domain = null,
        category = null,
        subcategory = null,
        conceptId = null,
        questionCount = 10,
      } = body;

      const sessionPlan = adaptiveTrainingSelector.generateAdaptiveSession(userId, {
        sessionType,
        domain,
        category,
        subcategory,
        conceptId,
        questionCount,
      });

      const sessionId = `trn_${crypto.randomUUID()}`;
      const questionIds = sessionPlan.questions.map((q) => q.id);

      dbService.createTrainingSession({
        id: sessionId,
        userId,
        sessionType: sessionPlan.sessionType,
        domain: domain || "all",
        category: category || "all",
        totalQuestions: sessionPlan.totalQuestions,
        questionIds,
      });

      // Authoritative sanitization: client receives NO is_correct flags and NO explanation
      const sanitizedQuestions = sessionPlan.questions.map((q) =>
        questionRepository.getSanitizedQuestion(q)
      );

      return sendJson(res, 200, {
        sessionId,
        sessionType: sessionPlan.sessionType,
        totalQuestions: sessionPlan.totalQuestions,
        composition: sessionPlan.composition,
        targetConcepts: sessionPlan.targetConcepts,
        questions: sanitizedQuestions,
      });
    }

    // POST /api/training/session/answer
    if (pathname === "/api/training/session/answer" && method === "POST") {
      const user = getAuthUser(req);
      const body = await parseBody(req);
      const userId = user ? user.id : (body.userId || "usr_guest");
      const { sessionId, questionId, selectedOptionId, responseTimeMs = 10000 } = body;

      if (!questionId) {
        return sendJson(res, 400, { error: "questionId is required" });
      }

      // Verify answer authoritatively
      const verification = questionRepository.verifyAnswer(questionId, selectedOptionId);
      if (!verification) {
        return sendJson(res, 404, { error: "Question not found" });
      }

      const { isCorrect, correctOptionIds, explanation, rationales, questionMetadata } = verification;

      // 1. Record User Question History (enforces 30-day cross-mode anti-repetition cooldown)
      dbService.recordUserQuestionHistory({
        userId,
        questionId,
        sessionId,
        mode: "training",
        wasCorrect: isCorrect,
        responseTimeMs,
      });

      // 2. Fetch existing skill profile for spaced repetition & mastery calculation
      const conceptId = questionMetadata.concept_id || "general";
      const existingSkill = dbService.getUserConceptSkill(userId, conceptId);

      // 3. SM-2 / FSRS Spaced Repetition calculation
      const srResult = spacedRepetitionService.calculateNextReview({
        wasCorrect: isCorrect,
        responseTimeMs,
        currentIntervalDays: existingSkill?.interval_days || 1,
        currentEaseFactor: existingSkill?.ease_factor || 2.5,
        streakCorrect: existingSkill?.streak_correct || 0,
      });

      // 4. Update Mastery Profile
      const updatedSkill = masteryService.updateMasteryOnAnswer({
        userId,
        domain: questionMetadata.domain,
        category: questionMetadata.category,
        subcategory: questionMetadata.subcategory,
        conceptId,
        isCorrect,
        mode: "training",
        responseTimeMs,
        difficulty: questionMetadata.difficulty,
        spacedRepetitionData: srResult,
      });

      // 5. XP Award (15 XP for correct, 5 XP for attempt/retention)
      const xpGain = isCorrect ? 15 : 5;
      let userProgress = null;
      if (user) {
        userProgress = dbService.addTrainingXp(userId, xpGain, isCorrect, responseTimeMs);
      }

      return sendJson(res, 200, {
        isCorrect,
        correctOptionIds,
        explanation,
        rationales,
        xpGained: xpGain,
        userProgress,
        masteryScore: updatedSkill?.mastery_score || 0,
        conceptId,
        nextReviewInDays: srResult.intervalDays,
      });
    }

    // POST /api/training/session/finish
    if (pathname === "/api/training/session/finish" && method === "POST") {
      const user = getAuthUser(req);
      const body = await parseBody(req);
      const userId = user ? user.id : (body.userId || "usr_guest");
      const {
        sessionId,
        accuracy = 0,
        totalQuestions = 0,
        correctCount = 0,
        avgResponseMs = 0,
        xpEarned = 0,
      } = body;

      if (sessionId) {
        dbService.updateTrainingSession(sessionId, {
          status: "completed",
          accuracy,
          correctCount,
          avgResponseMs,
          xpEarned,
        });
      }

      // Mastery overview post-session
      const masterySummary = masteryService.getUserMasterySummary(userId);
      const weakestTopic = masterySummary.weakestTopics?.[0] || null;

      // Completion XP bonus
      const completionXp = 25 + (accuracy === 100 ? 50 : 0);
      let userProgress = null;
      if (user) {
        userProgress = dbService.addTrainingXp(userId, completionXp, false, 0);
      }

      return sendJson(res, 200, {
        success: true,
        sessionId,
        completionXp,
        userProgress,
        masterySummary,
        recommendedNextStep: {
          hasWeakTopic: Boolean(weakestTopic && weakestTopic.mastery_score < 70),
          weakTopic: weakestTopic,
          readyForBattle: accuracy >= 70,
        },
      });
    }

    // GET /api/training/analytics
    if (pathname === "/api/training/analytics" && method === "GET") {
      const user = getAuthUser(req);
      const userId = user ? user.id : (url.searchParams.get("userId") || "usr_guest");

      const summary = masteryService.getUserMasterySummary(userId);
      const dueReviews = dbService.getDueSpacedRepetitionConcepts(userId, 15);

      return sendJson(res, 200, {
        userId,
        ...summary,
        dueReviews,
      });
    }

    return sendJson(res, 404, { error: "API endpoint not found" });
  };
}
