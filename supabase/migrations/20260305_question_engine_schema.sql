-- ==============================================================================
-- Jackal — Competitive Cybersecurity Training
-- Enterprise Question Generation Engine Database Schema (Supabase + pgvector)
-- ==============================================================================

-- 1. Enable pgvector extension for semantic similarity and deduplication
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Enumerated Types for Engine Consistency
DO $$ BEGIN
  CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE question_status AS ENUM ('approved', 'needs_review', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE cognitive_bloom_level AS ENUM ('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Questions Core Table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  difficulty question_difficulty NOT NULL DEFAULT 'medium',
  cognitive_level cognitive_bloom_level NOT NULL DEFAULT 'Apply',
  prompt TEXT NOT NULL,
  explanation TEXT NOT NULL,
  mitre_attack_id TEXT DEFAULT '',
  cve_id TEXT DEFAULT '',
  quality_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  status question_status NOT NULL DEFAULT 'needs_review',
  available_in_training BOOLEAN NOT NULL DEFAULT TRUE,
  available_in_battle BOOLEAN NOT NULL DEFAULT TRUE,
  battle_fairness_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  estimated_duration_sec INTEGER NOT NULL DEFAULT 20,
  times_served INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  training_usage INTEGER NOT NULL DEFAULT 0,
  battle_usage INTEGER NOT NULL DEFAULT 0,
  average_response_ms INTEGER NOT NULL DEFAULT 0,
  empirical_difficulty TEXT DEFAULT NULL,
  discrimination_index NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
  validation_notes JSONB DEFAULT '[]'::jsonb,
  canonical_hash TEXT UNIQUE NOT NULL,
  template_signature TEXT,
  source_job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Question Options (Normalized 4 choices per question)
CREATE TABLE IF NOT EXISTS question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  distractor_rationale TEXT,
  order_index SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Semantic Vector Embeddings for pgvector Cosine Deduplication
CREATE TABLE IF NOT EXISTS question_embeddings (
  question_id UUID PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Batch Generation Jobs Tracking
CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  topic TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 10,
  difficulty question_difficulty NOT NULL DEFAULT 'medium',
  status job_status NOT NULL DEFAULT 'pending',
  generated_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  provider TEXT NOT NULL DEFAULT 'openai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 7. User Anti-Repetition & Exposure History (Shared across Training and Battle)
CREATE TABLE IF NOT EXISTS user_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  match_id TEXT,
  session_id TEXT,
  mode TEXT NOT NULL DEFAULT 'battle', -- 'battle' or 'training'
  was_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  served_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. User Skill Profiles & Mastery Engine
CREATE TABLE IF NOT EXISTS user_skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL DEFAULT '',
  concept_id TEXT NOT NULL,
  mastery_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  training_accuracy NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  battle_accuracy NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  total_answers INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  average_response_ms INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor NUMERIC(4, 2) NOT NULL DEFAULT 2.50,
  streak_correct INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_concept UNIQUE (user_id, concept_id)
);

-- 9. Training Sessions Tracking
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'mixed', -- 'mixed', 'weak_topics', 'category', 'review_mistakes', 'battle_prep'
  focus_topic TEXT,
  total_questions INTEGER NOT NULL DEFAULT 10,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  summary_json JSONB DEFAULT '{}'::jsonb
);

-- 10. Question Reports (In-game player flagging)
CREATE TABLE IF NOT EXISTS question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING & VECTOR SEARCH
-- ==============================================================================

-- Vector HNSW Index for ultra-fast semantic deduplication lookups
CREATE INDEX IF NOT EXISTS idx_question_embeddings_hnsw 
ON question_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Core Operational Indexes
CREATE INDEX IF NOT EXISTS idx_questions_domain_diff_status 
ON questions(domain, difficulty, status);

CREATE INDEX IF NOT EXISTS idx_questions_concept 
ON questions(concept_id);

CREATE INDEX IF NOT EXISTS idx_questions_status_quality 
ON questions(status, quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_questions_canonical_hash 
ON questions(canonical_hash);

CREATE INDEX IF NOT EXISTS idx_question_options_qid 
ON question_options(question_id);

-- User History Cooldown Index (Fast 90-day lookup per player)
CREATE INDEX IF NOT EXISTS idx_user_q_history_cooldown 
ON user_question_history(user_id, served_at DESC);

-- ==============================================================================
-- SEMANTIC SEARCH HELPER FUNCTION (Cos Similarity)
-- ==============================================================================
CREATE OR REPLACE FUNCTION match_questions_by_embedding(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  question_id UUID,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    qe.question_id,
    1 - (qe.embedding <=> query_embedding) AS similarity
  FROM question_embeddings qe
  WHERE 1 - (qe.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- Approved questions are publicly readable for gameplay
CREATE POLICY "Public read approved questions" 
ON questions FOR SELECT 
USING (status = 'approved');

CREATE POLICY "Public read options for approved questions" 
ON question_options FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM questions q WHERE q.id = question_options.question_id AND q.status = 'approved'
));

-- Service role / admins can manage everything
CREATE POLICY "Service role manages all questions" 
ON questions FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

-- User question history: users can view and log their own history
CREATE POLICY "Users view own question history" 
ON user_question_history FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users insert own question history" 
ON user_question_history FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Question reports: authenticated users can submit reports
CREATE POLICY "Users create reports" 
ON question_reports FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);
