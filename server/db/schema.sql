CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  username_lower TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS player_profiles (
  user_id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL DEFAULT 1200,
  peak_rating INTEGER NOT NULL DEFAULT 1200,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  battles_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  total_response_time_ms INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  player1_id TEXT NOT NULL,
  player2_id TEXT NOT NULL,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  winner_id TEXT,
  is_draw INTEGER NOT NULL DEFAULT 0,
  is_forfeit INTEGER NOT NULL DEFAULT 0,
  p1_rating_before INTEGER NOT NULL,
  p1_rating_after INTEGER NOT NULL,
  p2_rating_before INTEGER NOT NULL,
  p2_rating_after INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL,
  data_json TEXT
);

CREATE TABLE IF NOT EXISTS category_stats (
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, category),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_matches_p1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_p2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_finished ON matches(finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON player_profiles(rating DESC);

-- ==============================================================================
-- Question Generation Engine Tables
-- ==============================================================================

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  cognitive_level TEXT NOT NULL DEFAULT 'Apply',
  prompt TEXT NOT NULL,
  explanation TEXT NOT NULL,
  mitre_attack_id TEXT DEFAULT '',
  cve_id TEXT DEFAULT '',
  quality_score REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'needs_review',
  available_in_training INTEGER NOT NULL DEFAULT 1,
  available_in_battle INTEGER NOT NULL DEFAULT 1,
  battle_fairness_score REAL NOT NULL DEFAULT 100.0,
  estimated_duration_sec INTEGER NOT NULL DEFAULT 20,
  times_served INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  training_usage INTEGER NOT NULL DEFAULT 0,
  battle_usage INTEGER NOT NULL DEFAULT 0,
  average_response_ms INTEGER NOT NULL DEFAULT 0,
  empirical_difficulty TEXT DEFAULT NULL,
  discrimination_index REAL NOT NULL DEFAULT 0.0,
  validation_notes TEXT DEFAULT '[]',
  canonical_hash TEXT UNIQUE NOT NULL,
  template_signature TEXT,
  source_job_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  distractor_rationale TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  topic TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 10,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  generated_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  provider TEXT NOT NULL DEFAULT 'synthesizer',
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_question_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  match_id TEXT,
  session_id TEXT,
  mode TEXT NOT NULL DEFAULT 'battle',
  was_correct INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  served_at INTEGER NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_skill_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL DEFAULT '',
  concept_id TEXT NOT NULL,
  mastery_score REAL NOT NULL DEFAULT 0.0,
  training_accuracy REAL NOT NULL DEFAULT 0.0,
  battle_accuracy REAL NOT NULL DEFAULT 0.0,
  total_answers INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  average_response_ms INTEGER NOT NULL DEFAULT 0,
  last_practiced_at INTEGER NOT NULL,
  next_review_at INTEGER NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  streak_correct INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'mixed',
  focus_topic TEXT,
  total_questions INTEGER NOT NULL DEFAULT 10,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  summary_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS question_reports (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_lookup ON questions(domain, difficulty, status);
CREATE INDEX IF NOT EXISTS idx_questions_status_quality ON questions(status, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_question_options_qid ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_user_q_history_lookup ON user_question_history(user_id, served_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_skill_profiles_user ON user_skill_profiles(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user ON training_sessions(user_id, started_at DESC);


