import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BATTLE_CONFIG } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(process.cwd(), BATTLE_CONFIG.DATA_DIR);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "jackal.sqlite");
const schemaPath = path.join(__dirname, "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf-8");

let db = null;
let useJsonFallback = false;
let jsonDb = {
  users: {},
  profiles: {},
  matches: [],
  categoryStats: {},
  questions: {},
  questionOptions: {},
  generationJobs: {},
  userHistory: [],
  questionReports: [],
  userSkillProfiles: {},
  trainingSessions: {},
};
const jsonDbPath = path.join(dataDir, "jackal_fallback.json");

try {
  const { DatabaseSync } = await import("node:sqlite");
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec(schemaSql);

  // Safe migrations for existing SQLite databases
  const questionCols = [
    "ALTER TABLE questions ADD COLUMN available_in_training INTEGER DEFAULT 1;",
    "ALTER TABLE questions ADD COLUMN available_in_battle INTEGER DEFAULT 1;",
    "ALTER TABLE questions ADD COLUMN battle_fairness_score REAL DEFAULT 1.0;",
    "ALTER TABLE questions ADD COLUMN estimated_duration_sec INTEGER DEFAULT 30;",
    "ALTER TABLE questions ADD COLUMN training_usage INTEGER DEFAULT 0;",
    "ALTER TABLE questions ADD COLUMN battle_usage INTEGER DEFAULT 0;",
    "ALTER TABLE questions ADD COLUMN average_response_ms INTEGER DEFAULT 0;",
    "ALTER TABLE questions ADD COLUMN empirical_difficulty REAL DEFAULT 0.5;",
  ];
  for (const sql of questionCols) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  const historyCols = [
    "ALTER TABLE user_question_history ADD COLUMN session_id TEXT;",
    "ALTER TABLE user_question_history ADD COLUMN mode TEXT DEFAULT 'battle';",
  ];
  for (const sql of historyCols) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  const skillCols = [
    "ALTER TABLE user_skill_profiles ADD COLUMN training_answers INTEGER DEFAULT 0;",
    "ALTER TABLE user_skill_profiles ADD COLUMN battle_answers INTEGER DEFAULT 0;",
  ];
  for (const sql of skillCols) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
} catch (err) {
  console.warn("Notice: SQLite initialization switched to JSON persistence mode.", err?.message);
  useJsonFallback = true;
  if (fs.existsSync(jsonDbPath)) {
    try {
      jsonDb = { ...jsonDb, ...JSON.parse(fs.readFileSync(jsonDbPath, "utf-8")) };
    } catch {
      // Keep default
    }
  }
}

function saveJsonDb() {
  if (useJsonFallback) {
    fs.writeFileSync(jsonDbPath, JSON.stringify(jsonDb, null, 2), "utf-8");
  }
}

export const dbService = {
  // Users
  createUser({ id, username, passwordHash }) {
    const usernameLower = username.toLowerCase();
    const now = Date.now();
    if (!useJsonFallback) {
      const stmt = db.prepare(`
        INSERT INTO users (id, username, username_lower, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, username, usernameLower, passwordHash || null, now);
      
      const profileStmt = db.prepare(`
        INSERT INTO player_profiles (user_id, updated_at)
        VALUES (?, ?)
      `);
      profileStmt.run(id, now);
    } else {
      jsonDb.users[id] = { id, username, username_lower: usernameLower, password_hash: passwordHash || null, created_at: now };
      jsonDb.profiles[id] = {
        user_id: id,
        rating: 1200,
        peak_rating: 1200,
        xp: 0,
        level: 1,
        battles_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        current_streak: 0,
        best_streak: 0,
        total_correct: 0,
        total_questions: 0,
        total_response_time_ms: 0,
        updated_at: now,
      };
      saveJsonDb();
    }
    return this.getUserById(id);
  },

  getUserByUsername(username) {
    const lower = username.toLowerCase();
    if (!useJsonFallback) {
      const stmt = db.prepare("SELECT * FROM users WHERE username_lower = ?");
      return stmt.get(lower) || null;
    }
    return Object.values(jsonDb.users).find((u) => u.username_lower === lower) || null;
  },

  getUserById(id) {
    if (!useJsonFallback) {
      const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
      return stmt.get(id) || null;
    }
    return jsonDb.users[id] || null;
  },

  getProfileByUserId(userId) {
    if (!useJsonFallback) {
      const stmt = db.prepare(`
        SELECT u.id, u.username, p.*
        FROM users u
        JOIN player_profiles p ON u.id = p.user_id
        WHERE u.id = ?
      `);
      return stmt.get(userId) || null;
    }
    const user = jsonDb.users[userId];
    const profile = jsonDb.profiles[userId];
    if (!user || !profile) return null;
    return { id: user.id, username: user.username, ...profile };
  },

  updateUsername(userId, newUsername) {
    const lower = newUsername.toLowerCase();
    if (!useJsonFallback) {
      const stmt = db.prepare("UPDATE users SET username = ?, username_lower = ? WHERE id = ?");
      stmt.run(newUsername, lower, userId);
    } else {
      if (jsonDb.users[userId]) {
        jsonDb.users[userId].username = newUsername;
        jsonDb.users[userId].username_lower = lower;
        saveJsonDb();
      }
    }
    return this.getProfileByUserId(userId);
  },

  updateProfilePostMatch(userId, updates) {
    const now = Date.now();
    if (!useJsonFallback) {
      const stmt = db.prepare(`
        UPDATE player_profiles
        SET rating = ?,
            peak_rating = MAX(peak_rating, ?),
            xp = xp + ?,
            level = ?,
            battles_played = battles_played + 1,
            wins = wins + ?,
            losses = losses + ?,
            draws = draws + ?,
            current_streak = ?,
            best_streak = MAX(best_streak, ?),
            total_correct = total_correct + ?,
            total_questions = total_questions + ?,
            total_response_time_ms = total_response_time_ms + ?,
            updated_at = ?
        WHERE user_id = ?
      `);
      stmt.run(
        updates.rating,
        updates.rating,
        updates.xpGain,
        updates.newLevel,
        updates.isWin ? 1 : 0,
        updates.isLoss ? 1 : 0,
        updates.isDraw ? 1 : 0,
        updates.currentStreak,
        updates.currentStreak,
        updates.correctCount,
        updates.questionCount,
        updates.responseTimeMs,
        now,
        userId
      );
    } else {
      const p = jsonDb.profiles[userId];
      if (p) {
        p.rating = updates.rating;
        p.peak_rating = Math.max(p.peak_rating, updates.rating);
        p.xp += updates.xpGain;
        p.level = updates.newLevel;
        p.battles_played += 1;
        if (updates.isWin) p.wins += 1;
        if (updates.isLoss) p.losses += 1;
        if (updates.isDraw) p.draws += 1;
        p.current_streak = updates.currentStreak;
        p.best_streak = Math.max(p.best_streak, updates.currentStreak);
        p.total_correct += updates.correctCount;
        p.total_questions += updates.questionCount;
        p.total_response_time_ms += updates.responseTimeMs;
        p.updated_at = now;
        saveJsonDb();
      }
    }
  },

  addTrainingXp(userId, xpGain, isCorrect = false, responseTimeMs = 0) {
    const now = Date.now();
    if (!useJsonFallback) {
      const current = db.prepare("SELECT xp, total_correct, total_questions, total_response_time_ms FROM player_profiles WHERE user_id = ?").get(userId);
      if (current) {
        const newXp = (current.xp || 0) + xpGain;
        const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
        const stmt = db.prepare(`
          UPDATE player_profiles
          SET xp = ?,
              level = ?,
              total_correct = total_correct + ?,
              total_questions = total_questions + 1,
              total_response_time_ms = total_response_time_ms + ?,
              updated_at = ?
          WHERE user_id = ?
        `);
        stmt.run(newXp, newLevel, isCorrect ? 1 : 0, responseTimeMs, now, userId);
        return { newXp, newLevel };
      }
    } else {
      const p = jsonDb.profiles[userId];
      if (p) {
        p.xp += xpGain;
        p.level = Math.floor(Math.sqrt(p.xp / 100)) + 1;
        if (isCorrect) p.total_correct += 1;
        p.total_questions += 1;
        p.total_response_time_ms += responseTimeMs;
        p.updated_at = now;
        saveJsonDb();
        return { newXp: p.xp, newLevel: p.level };
      }
    }
    return null;
  },

  // Matches
  recordMatch(matchRecord) {
    const {
      id,
      mode,
      player1_id,
      player2_id,
      player1_score,
      player2_score,
      winner_id,
      is_draw,
      is_forfeit,
      p1_rating_before,
      p1_rating_after,
      p2_rating_before,
      p2_rating_after,
      started_at,
      finished_at,
      data_json,
    } = matchRecord;

    if (!useJsonFallback) {
      const stmt = db.prepare(`
        INSERT INTO matches (
          id, mode, player1_id, player2_id,
          player1_score, player2_score, winner_id,
          is_draw, is_forfeit,
          p1_rating_before, p1_rating_after,
          p2_rating_before, p2_rating_after,
          started_at, finished_at, data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        mode,
        player1_id,
        player2_id,
        player1_score,
        player2_score,
        winner_id || null,
        is_draw ? 1 : 0,
        is_forfeit ? 1 : 0,
        p1_rating_before,
        p1_rating_after,
        p2_rating_before,
        p2_rating_after,
        started_at,
        finished_at,
        data_json
      );
    } else {
      jsonDb.matches.unshift({
        ...matchRecord,
        is_draw: is_draw ? 1 : 0,
        is_forfeit: is_forfeit ? 1 : 0,
      });
      saveJsonDb();
    }
  },

  getMatchById(matchId) {
    if (!useJsonFallback) {
      const stmt = db.prepare("SELECT * FROM matches WHERE id = ?");
      return stmt.get(matchId) || null;
    }
    return jsonDb.matches.find((m) => m.id === matchId) || null;
  },

  getMatchHistory(userId, limit = 20) {
    if (!useJsonFallback) {
      const stmt = db.prepare(`
        SELECT m.*,
               u1.username as p1_username,
               u2.username as p2_username
        FROM matches m
        JOIN users u1 ON m.player1_id = u1.id
        JOIN users u2 ON m.player2_id = u2.id
        WHERE m.player1_id = ? OR m.player2_id = ?
        ORDER BY m.finished_at DESC
        LIMIT ?
      `);
      return stmt.all(userId, userId, limit);
    }
    return jsonDb.matches
      .filter((m) => m.player1_id === userId || m.player2_id === userId)
      .slice(0, limit)
      .map((m) => ({
        ...m,
        p1_username: jsonDb.users[m.player1_id]?.username || "Analyst",
        p2_username: jsonDb.users[m.player2_id]?.username || "Analyst",
      }));
  },

  // Category stats
  recordCategoryResult(userId, category, isCorrect) {
    if (!useJsonFallback) {
      const stmt = db.prepare(`
        INSERT INTO category_stats (user_id, category, correct_count, total_count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(user_id, category) DO UPDATE SET
          correct_count = correct_count + ?,
          total_count = total_count + 1
      `);
      stmt.run(userId, category, isCorrect ? 1 : 0, isCorrect ? 1 : 0);
    } else {
      const key = `${userId}_${category}`;
      if (!jsonDb.categoryStats[key]) {
        jsonDb.categoryStats[key] = {
          user_id: userId,
          category,
          correct_count: isCorrect ? 1 : 0,
          total_count: 1,
        };
      } else {
        if (isCorrect) jsonDb.categoryStats[key].correct_count += 1;
        jsonDb.categoryStats[key].total_count += 1;
      }
      saveJsonDb();
    }
  },

  getCategoryStats(userId) {
    if (!useJsonFallback) {
      const stmt = db.prepare(`
        SELECT category, correct_count, total_count
        FROM category_stats
        WHERE user_id = ?
      `);
      return stmt.all(userId);
    }
    return Object.values(jsonDb.categoryStats).filter((s) => s.user_id === userId);
  },

  // Leaderboard
  getLeaderboard(limit = 50) {
    if (!useJsonFallback) {
      const stmt = db.prepare(`
        SELECT u.id, u.username, p.rating, p.peak_rating, p.level, p.xp,
               p.battles_played, p.wins, p.losses, p.draws, p.best_streak, p.current_streak
        FROM player_profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.battles_played > 0
        ORDER BY p.rating DESC, p.wins DESC
        LIMIT ?
      `);
      return stmt.all(limit);
    }
    return Object.values(jsonDb.profiles)
      .filter((p) => p.battles_played > 0)
      .sort((a, b) => b.rating - a.rating || b.wins - a.wins)
      .slice(0, limit)
      .map((p) => ({
        id: p.user_id,
        username: jsonDb.users[p.user_id]?.username || "Analyst",
        ...p,
      }));
  },

  // ============================================================================
  // Question Generation Engine Database APIs
  // ============================================================================

  saveQuestion(q) {
    const now = Date.now();
    const id = q.id || `q_${crypto.randomUUID()}`;
    const validationNotesJson = JSON.stringify(q.validation_notes || q.validationNotes || []);

    const availTraining = q.available_in_training !== undefined ? (q.available_in_training ? 1 : 0) : (q.availableInTraining !== undefined ? (q.availableInTraining ? 1 : 0) : 1);
    const availBattle = q.available_in_battle !== undefined ? (q.available_in_battle ? 1 : 0) : (q.availableInBattle !== undefined ? (q.availableInBattle ? 1 : 0) : 1);
    const battleFairness = q.battle_fairness_score ?? 100.0;
    const estDuration = q.estimated_duration_sec ?? 20;
    const trainingUsage = q.training_usage ?? 0;
    const battleUsage = q.battle_usage ?? 0;
    const avgRespMs = q.average_response_ms ?? 0;
    const empiricalDiff = q.empirical_difficulty ?? null;

    if (!useJsonFallback) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO questions (
          id, domain, category, subcategory, concept_id, difficulty, cognitive_level,
          prompt, explanation, mitre_attack_id, cve_id, quality_score, status,
          available_in_training, available_in_battle, battle_fairness_score, estimated_duration_sec,
          times_served, times_correct, training_usage, battle_usage, average_response_ms, empirical_difficulty,
          discrimination_index, validation_notes, canonical_hash, template_signature,
          source_job_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        q.domain,
        q.category,
        q.subcategory,
        q.concept_id || q.conceptId || "",
        q.difficulty || "medium",
        q.cognitive_level || q.cognitiveLevel || "Apply",
        q.prompt,
        q.explanation,
        q.mitre_attack_id || q.mitreAttackId || "",
        q.cve_id || q.cveId || "",
        q.quality_score ?? q.qualityScore ?? 0,
        q.status || "needs_review",
        availTraining,
        availBattle,
        battleFairness,
        estDuration,
        q.times_served || 0,
        q.times_correct || 0,
        trainingUsage,
        battleUsage,
        avgRespMs,
        empiricalDiff,
        q.discrimination_index || 0,
        validationNotesJson,
        q.canonical_hash || q.canonicalHash || "",
        q.template_signature || q.templateSignature || "",
        q.source_job_id || q.sourceJobId || null,
        q.created_at || now,
        now
      );

      // Save Options
      if (Array.isArray(q.options)) {
        const delStmt = db.prepare("DELETE FROM question_options WHERE question_id = ?");
        delStmt.run(id);

        const optStmt = db.prepare(`
          INSERT INTO question_options (id, question_id, text, is_correct, distractor_rationale, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        q.options.forEach((opt, idx) => {
          const optId = opt.id || `${id}_opt_${idx}`;
          optStmt.run(
            optId,
            id,
            opt.text,
            opt.is_correct || opt.isCorrect ? 1 : 0,
            opt.distractor_rationale || opt.rationale || "",
            idx
          );
        });
      }
    } else {
      jsonDb.questions[id] = {
        ...q,
        id,
        available_in_training: availTraining,
        available_in_battle: availBattle,
        battle_fairness_score: battleFairness,
        estimated_duration_sec: estDuration,
        training_usage: trainingUsage,
        battle_usage: battleUsage,
        average_response_ms: avgRespMs,
        empirical_difficulty: empiricalDiff,
        validation_notes: validationNotesJson,
        created_at: q.created_at || now,
        updated_at: now,
      };

      if (Array.isArray(q.options)) {
        jsonDb.questionOptions[id] = q.options.map((opt, idx) => ({
          id: opt.id || `${id}_opt_${idx}`,
          question_id: id,
          text: opt.text,
          is_correct: opt.is_correct || opt.isCorrect ? 1 : 0,
          distractor_rationale: opt.distractor_rationale || opt.rationale || "",
          order_index: idx,
        }));
      }
      saveJsonDb();
    }

    return id;
  },

  getQuestionById(id) {
    if (!useJsonFallback) {
      const qStmt = db.prepare("SELECT * FROM questions WHERE id = ?");
      const q = qStmt.get(id);
      if (!q) return null;

      const optStmt = db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index ASC");
      const options = optStmt.all(id).map((o) => ({
        id: o.id,
        text: o.text,
        is_correct: Boolean(o.is_correct),
        rationale: o.distractor_rationale,
      }));

      return {
        ...q,
        options,
        validation_notes: typeof q.validation_notes === "string" ? JSON.parse(q.validation_notes) : q.validation_notes,
      };
    }

    const q = jsonDb.questions[id];
    if (!q) return null;
    const options = (jsonDb.questionOptions[id] || []).map((o) => ({
      id: o.id,
      text: o.text,
      is_correct: Boolean(o.is_correct),
      rationale: o.distractor_rationale,
    }));
    return { ...q, options };
  },

  deleteQuestionsByJobId(jobId) {
    if (!useJsonFallback) {
      const qIds = db.prepare("SELECT id FROM questions WHERE source_job_id = ?").all(jobId);
      for (const q of qIds) {
        db.prepare("DELETE FROM question_options WHERE question_id = ?").run(q.id);
      }
      db.prepare("DELETE FROM questions WHERE source_job_id = ?").run(jobId);
      db.prepare("DELETE FROM generation_jobs WHERE id = ?").run(jobId);
    } else {
      delete jsonDb.generationJobs[jobId];
      Object.keys(jsonDb.questions).forEach((qid) => {
        if (jsonDb.questions[qid].source_job_id === jobId) {
          delete jsonDb.questions[qid];
          delete jsonDb.questionOptions[qid];
        }
      });
      saveJsonDb();
    }
  },

  getAllEngineQuestions({ domain, difficulty, status, search, limit = 100, offset = 0 } = {}) {
    if (!useJsonFallback) {
      let query = "SELECT * FROM questions WHERE 1=1";
      const params = [];

      if (domain && domain !== "all") {
        query += " AND domain = ?";
        params.push(domain);
      }
      if (difficulty && difficulty !== "all") {
        query += " AND difficulty = ?";
        params.push(difficulty);
      }
      if (status && status !== "all") {
        query += " AND status = ?";
        params.push(status);
      }
      if (search && search.trim().length > 0) {
        query += " AND (prompt LIKE ? OR explanation LIKE ? OR concept_id LIKE ?)";
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const rows = db.prepare(query).all(...params);
      const optStmt = db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index ASC");

      return rows.map((r) => ({
        ...r,
        options: optStmt.all(r.id).map((o) => ({
          id: o.id,
          text: o.text,
          is_correct: Boolean(o.is_correct),
          rationale: o.distractor_rationale,
        })),
        validation_notes: typeof r.validation_notes === "string" ? JSON.parse(r.validation_notes) : r.validation_notes,
      }));
    }

    let list = Object.values(jsonDb.questions);
    if (domain && domain !== "all") list = list.filter((q) => q.domain === domain);
    if (difficulty && difficulty !== "all") list = list.filter((q) => q.difficulty === difficulty);
    if (status && status !== "all") list = list.filter((q) => q.status === status);
    if (search && search.trim().length > 0) {
      const term = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.prompt?.toLowerCase().includes(term) ||
          q.explanation?.toLowerCase().includes(term) ||
          q.concept_id?.toLowerCase().includes(term)
      );
    }

    return list.slice(offset, offset + limit).map((q) => ({
      ...q,
      options: (jsonDb.questionOptions[q.id] || []).map((o) => ({
        id: o.id,
        text: o.text,
        is_correct: Boolean(o.is_correct),
        rationale: o.distractor_rationale,
      })),
    }));
  },

  updateQuestionStatus(id, status, validationNotes = null) {
    const now = Date.now();
    if (!useJsonFallback) {
      if (validationNotes !== null) {
        const stmt = db.prepare(`
          UPDATE questions 
          SET status = ?, validation_notes = ?, updated_at = ? 
          WHERE id = ?
        `);
        stmt.run(status, JSON.stringify(validationNotes), now, id);
      } else {
        const stmt = db.prepare("UPDATE questions SET status = ?, updated_at = ? WHERE id = ?");
        stmt.run(status, now, id);
      }
    } else {
      if (jsonDb.questions[id]) {
        jsonDb.questions[id].status = status;
        jsonDb.questions[id].updated_at = now;
        if (validationNotes !== null) {
          jsonDb.questions[id].validation_notes = JSON.stringify(validationNotes);
        }
        saveJsonDb();
      }
    }
  },

  // Jobs
  createJob(job) {
    const now = Date.now();
    const id = job.id || `job_${crypto.randomUUID()}`;
    if (!useJsonFallback) {
      const stmt = db.prepare(`
        INSERT INTO generation_jobs (
          id, domain, topic, target_count, difficulty, status,
          generated_count, accepted_count, rejected_count, error_message,
          provider, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        job.domain,
        job.topic,
        job.target_count || 10,
        job.difficulty || "medium",
        job.status || "pending",
        job.generated_count || 0,
        job.accepted_count || 0,
        job.rejected_count || 0,
        job.error_message || null,
        job.provider || "synthesizer",
        now,
        null
      );
    } else {
      jsonDb.generationJobs[id] = {
        ...job,
        id,
        status: job.status || "pending",
        generated_count: 0,
        accepted_count: 0,
        rejected_count: 0,
        created_at: now,
      };
      saveJsonDb();
    }
    return id;
  },

  updateJob(id, updates = {}) {
    if (!useJsonFallback) {
      const fields = [];
      const params = [];
      for (const [key, val] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        params.push(val);
      }
      params.push(id);
      if (fields.length > 0) {
        db.prepare(`UPDATE generation_jobs SET ${fields.join(", ")} WHERE id = ?`).run(...params);
      }
    } else {
      if (jsonDb.generationJobs[id]) {
        jsonDb.generationJobs[id] = { ...jsonDb.generationJobs[id], ...updates };
        saveJsonDb();
      }
    }
  },

  getJobById(id) {
    if (!useJsonFallback) {
      return db.prepare("SELECT * FROM generation_jobs WHERE id = ?").get(id) || null;
    }
    return jsonDb.generationJobs[id] || null;
  },

  getAllJobs(limit = 50) {
    if (!useJsonFallback) {
      return db.prepare("SELECT * FROM generation_jobs ORDER BY created_at DESC LIMIT ?").all(limit);
    }
    return Object.values(jsonDb.generationJobs)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, limit);
  },

  // User History & Cross-Mode Cooldown Tracking
  recordUserQuestionHistory({
    userId,
    questionId,
    matchId = null,
    sessionId = null,
    mode = "battle",
    wasCorrect = false,
    responseTimeMs = 0,
  }) {
    const now = Date.now();
    const id = `hist_${crypto.randomUUID()}`;
    const isCorr = wasCorrect ? 1 : 0;
    const isTraining = mode === "training" ? 1 : 0;
    const isBattle = mode === "battle" ? 1 : 0;

    if (!useJsonFallback) {
      const stmt = db.prepare(`
        INSERT INTO user_question_history (id, user_id, question_id, match_id, session_id, mode, was_correct, response_time_ms, served_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, userId, questionId, matchId, sessionId, mode, isCorr, responseTimeMs, now);

      // Update question stats: times_served, times_correct, training_usage, battle_usage, average_response_ms
      const q = db.prepare("SELECT times_served, average_response_ms, difficulty FROM questions WHERE id = ?").get(questionId);
      if (q) {
        const newServed = (q.times_served || 0) + 1;
        const currentAvg = q.average_response_ms || 0;
        const newAvg = Math.round((currentAvg * (newServed - 1) + responseTimeMs) / newServed);

        db.prepare(`
          UPDATE questions
          SET times_served = ?,
              times_correct = times_correct + ?,
              training_usage = training_usage + ?,
              battle_usage = battle_usage + ?,
              average_response_ms = ?
          WHERE id = ?
        `).run(newServed, isCorr, isTraining, isBattle, newAvg, questionId);
      }
    } else {
      jsonDb.userHistory.push({
        id,
        user_id: userId,
        question_id: questionId,
        match_id: matchId,
        session_id: sessionId,
        mode,
        was_correct: isCorr,
        response_time_ms: responseTimeMs,
        served_at: now,
      });
      if (jsonDb.questions[questionId]) {
        const q = jsonDb.questions[questionId];
        const newServed = (q.times_served || 0) + 1;
        const currentAvg = q.average_response_ms || 0;
        q.times_served = newServed;
        if (wasCorrect) q.times_correct = (q.times_correct || 0) + 1;
        if (mode === "training") q.training_usage = (q.training_usage || 0) + 1;
        if (mode === "battle") q.battle_usage = (q.battle_usage || 0) + 1;
        q.average_response_ms = Math.round((currentAvg * (newServed - 1) + responseTimeMs) / newServed);
      }
      saveJsonDb();
    }
  },

  getUserRecentQuestionIds(userId, days = 30) {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    if (!useJsonFallback) {
      const rows = db.prepare(`
        SELECT DISTINCT question_id
        FROM user_question_history
        WHERE user_id = ? AND served_at >= ?
      `).all(userId, cutoffTime);
      return new Set(rows.map((r) => r.question_id));
    }
    const filtered = jsonDb.userHistory.filter((h) => h.user_id === userId && h.served_at >= cutoffTime);
    return new Set(filtered.map((h) => h.question_id));
  },

  // ============================================================================
  // User Skill Profiles & Spaced Repetition APIs
  // ============================================================================

  getUserSkillProfiles(userId) {
    if (!useJsonFallback) {
      return db.prepare(`
        SELECT * FROM user_skill_profiles
        WHERE user_id = ?
        ORDER BY mastery_score ASC
      `).all(userId);
    }
    return Object.values(jsonDb.userSkillProfiles || {})
      .filter((p) => p.user_id === userId)
      .sort((a, b) => a.mastery_score - b.mastery_score);
  },

  getUserConceptSkill(userId, conceptId) {
    if (!useJsonFallback) {
      return db.prepare(`
        SELECT * FROM user_skill_profiles
        WHERE user_id = ? AND concept_id = ?
      `).get(userId, conceptId) || null;
    }
    const key = `${userId}_${conceptId}`;
    return jsonDb.userSkillProfiles?.[key] || null;
  },

  upsertUserSkillProfile(data) {
    const now = Date.now();
    const id = data.id || `usp_${crypto.randomUUID()}`;
    const nextReview = data.next_review_at || now;

    if (!useJsonFallback) {
      const stmt = db.prepare(`
        INSERT INTO user_skill_profiles (
          id, user_id, domain, category, subcategory, concept_id,
          mastery_score, training_accuracy, battle_accuracy, total_answers,
          training_answers, battle_answers,
          correct_answers, average_response_ms, last_practiced_at, next_review_at,
          interval_days, ease_factor, streak_correct, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, concept_id) DO UPDATE SET
          mastery_score = excluded.mastery_score,
          training_accuracy = excluded.training_accuracy,
          battle_accuracy = excluded.battle_accuracy,
          total_answers = excluded.total_answers,
          training_answers = excluded.training_answers,
          battle_answers = excluded.battle_answers,
          correct_answers = excluded.correct_answers,
          average_response_ms = excluded.average_response_ms,
          last_practiced_at = excluded.last_practiced_at,
          next_review_at = excluded.next_review_at,
          interval_days = excluded.interval_days,
          ease_factor = excluded.ease_factor,
          streak_correct = excluded.streak_correct,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        id,
        data.user_id,
        data.domain,
        data.category,
        data.subcategory || "",
        data.concept_id,
        data.mastery_score ?? 0,
        data.training_accuracy ?? 0,
        data.battle_accuracy ?? 0,
        data.total_answers ?? 0,
        data.training_answers ?? (data.total_answers ?? 0),
        data.battle_answers ?? 0,
        data.correct_answers ?? 0,
        data.average_response_ms ?? 0,
        data.last_practiced_at || now,
        nextReview,
        data.interval_days ?? 1,
        data.ease_factor ?? 2.5,
        data.streak_correct ?? 0,
        now
      );
    } else {
      const key = `${data.user_id}_${data.concept_id}`;
      if (!jsonDb.userSkillProfiles) jsonDb.userSkillProfiles = {};
      jsonDb.userSkillProfiles[key] = {
        id,
        ...data,
        updated_at: now,
      };
      saveJsonDb();
    }
  },

  getDueSpacedRepetitionConcepts(userId, now = Date.now()) {
    if (!useJsonFallback) {
      return db.prepare(`
        SELECT * FROM user_skill_profiles
        WHERE user_id = ? AND next_review_at <= ?
        ORDER BY next_review_at ASC
      `).all(userId, now);
    }
    return Object.values(jsonDb.userSkillProfiles || {})
      .filter((p) => p.user_id === userId && p.next_review_at <= now)
      .sort((a, b) => a.next_review_at - b.next_review_at);
  },

  // ============================================================================
  // Training Sessions APIs
  // ============================================================================

  createTrainingSession(session) {
    const id = session.id || `tsess_${crypto.randomUUID()}`;
    const now = Date.now();
    const summaryJson = JSON.stringify(session.summary_json || session.summary || {});

    if (!useJsonFallback) {
      const stmt = db.prepare(`
        INSERT INTO training_sessions (
          id, user_id, session_type, focus_topic, total_questions,
          completed_questions, correct_count, score, started_at, finished_at, summary_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        session.userId || session.user_id || null,
        session.sessionType || session.session_type || "mixed",
        session.focusTopic || session.focus_topic || null,
        session.totalQuestions || session.total_questions || 10,
        session.completedQuestions || session.completed_questions || 0,
        session.correctCount || session.correct_count || 0,
        session.score || 0,
        session.started_at || now,
        session.finished_at || null,
        summaryJson
      );
    } else {
      if (!jsonDb.trainingSessions) jsonDb.trainingSessions = {};
      jsonDb.trainingSessions[id] = {
        ...session,
        id,
        started_at: session.started_at || now,
        summary_json: summaryJson,
      };
      saveJsonDb();
    }
    return id;
  },

  updateTrainingSession(id, updates = {}) {
    if (!useJsonFallback) {
      const fields = [];
      const params = [];
      for (const [key, val] of Object.entries(updates)) {
        if (key === "summary_json" && typeof val === "object") {
          fields.push("summary_json = ?");
          params.push(JSON.stringify(val));
        } else {
          fields.push(`${key} = ?`);
          params.push(val);
        }
      }
      params.push(id);
      if (fields.length > 0) {
        db.prepare(`UPDATE training_sessions SET ${fields.join(", ")} WHERE id = ?`).run(...params);
      }
    } else {
      if (jsonDb.trainingSessions && jsonDb.trainingSessions[id]) {
        jsonDb.trainingSessions[id] = { ...jsonDb.trainingSessions[id], ...updates };
        saveJsonDb();
      }
    }
  },

  getTrainingSession(id) {
    if (!useJsonFallback) {
      const s = db.prepare("SELECT * FROM training_sessions WHERE id = ?").get(id);
      if (!s) return null;
      return {
        ...s,
        summary: typeof s.summary_json === "string" ? JSON.parse(s.summary_json) : s.summary_json,
      };
    }
    return jsonDb.trainingSessions?.[id] || null;
  },

  updateQuestionAvailability(id, { availableInTraining, availableInBattle }) {
    if (!useJsonFallback) {
      const fields = [];
      const params = [];
      if (availableInTraining !== undefined) {
        fields.push("available_in_training = ?");
        params.push(availableInTraining ? 1 : 0);
      }
      if (availableInBattle !== undefined) {
        fields.push("available_in_battle = ?");
        params.push(availableInBattle ? 1 : 0);
      }
      fields.push("updated_at = ?");
      params.push(Date.now());
      params.push(id);
      db.prepare(`UPDATE questions SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    } else {
      if (jsonDb.questions[id]) {
        if (availableInTraining !== undefined) jsonDb.questions[id].available_in_training = availableInTraining ? 1 : 0;
        if (availableInBattle !== undefined) jsonDb.questions[id].available_in_battle = availableInBattle ? 1 : 0;
        jsonDb.questions[id].updated_at = Date.now();
        saveJsonDb();
      }
    }
  },

  // Reports
  createQuestionReport({ questionId, userId, reason, comment = "" }) {
    const id = `rep_${crypto.randomUUID()}`;
    const now = Date.now();
    if (!useJsonFallback) {
      db.prepare(`
        INSERT INTO question_reports (id, question_id, user_id, reason, comment, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `).run(id, questionId, userId, reason, comment, now);
    } else {
      jsonDb.questionReports.push({ id, question_id: questionId, user_id: userId, reason, comment, status: "pending", created_at: now });
      saveJsonDb();
    }
    return id;
  },

  getQuestionReports(limit = 50) {
    if (!useJsonFallback) {
      return db.prepare(`
        SELECT r.*, q.prompt, q.domain
        FROM question_reports r
        LEFT JOIN questions q ON r.question_id = q.id
        ORDER BY r.created_at DESC LIMIT ?
      `).all(limit);
    }
    return jsonDb.questionReports
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, limit)
      .map((r) => ({
        ...r,
        prompt: jsonDb.questions[r.question_id]?.prompt || "N/A",
        domain: jsonDb.questions[r.question_id]?.domain || "N/A",
      }));
  },

  // Coverage Matrix
  getCoverageMatrix() {
    if (!useJsonFallback) {
      const rows = db.prepare(`
        SELECT domain, difficulty, status, COUNT(*) as count
        FROM questions
        GROUP BY domain, difficulty, status
      `).all();
      return rows;
    }
    const counts = {};
    for (const q of Object.values(jsonDb.questions)) {
      const key = `${q.domain}:::${q.difficulty}:::${q.status}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([k, count]) => {
      const [domain, difficulty, status] = k.split(":::");
      return { domain, difficulty, status, count };
    });
  },
};

