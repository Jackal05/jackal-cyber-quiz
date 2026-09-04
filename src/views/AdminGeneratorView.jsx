import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Play,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  Database,
  BarChart3,
  Flag,
} from "lucide-react";

export default function AdminGeneratorView() {
  const [activeTab, setActiveTab] = useState("generate"); // 'generate' | 'explorer' | 'coverage' | 'reports'

  // Batch Generation State
  const [domain, setDomain] = useState("Security Operations & Defense");
  const [topic, setTopic] = useState("all");
  const [targetCount, setTargetCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [provider, setProvider] = useState("synthesizer");
  const [isLaunching, setIsLaunching] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);

  // Question Explorer State
  const [questions, setQuestions] = useState([]);
  const [filterDomain, setFilterDomain] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Coverage Matrix State
  const [coverageData, setCoverageData] = useState([]);

  // Reports State
  const [reports, setReports] = useState([]);

  // Taxonomy State
  const [taxonomy, setTaxonomy] = useState([]);

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/engine/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Error fetching engine jobs:", err);
    }
  }, []);

  // Fetch Questions
  const fetchQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    try {
      const params = new URLSearchParams({
        domain: filterDomain,
        difficulty: filterDifficulty,
        status: filterStatus,
        search: searchQuery,
        limit: "100",
      });
      const res = await fetch(`/api/engine/questions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [filterDomain, filterDifficulty, filterStatus, searchQuery]);

  // Fetch Coverage
  const fetchCoverage = useCallback(async () => {
    try {
      const res = await fetch("/api/engine/coverage");
      if (res.ok) {
        const data = await res.json();
        setCoverageData(data.coverage || []);
      }
    } catch (err) {
      console.error("Error fetching coverage matrix:", err);
    }
  }, []);

  // Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/engine/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  }, []);

  // Fetch Taxonomy
  const fetchTaxonomy = useCallback(async () => {
    try {
      const res = await fetch("/api/engine/taxonomy");
      if (res.ok) {
        const data = await res.json();
        setTaxonomy(data.taxonomy || []);
      }
    } catch (err) {
      console.error("Error fetching taxonomy:", err);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchJobs();
    fetchQuestions();
    fetchCoverage();
    fetchTaxonomy();
    fetchReports();
  }, [fetchJobs, fetchQuestions, fetchCoverage, fetchTaxonomy, fetchReports]);

  // Poll jobs when any job is running
  useEffect(() => {
    const hasRunningJob = jobs.some((j) => j.status === "running" || j.status === "pending");
    if (!hasRunningJob && !activeJobId) return;

    const interval = setInterval(() => {
      fetchJobs();
      fetchCoverage();
      if (activeTab === "explorer") fetchQuestions();
    }, 2000);

    return () => clearInterval(interval);
  }, [jobs, activeJobId, activeTab, fetchJobs, fetchCoverage, fetchQuestions]);

  // Launch Batch
  const handleLaunchBatch = async (e) => {
    e.preventDefault();
    setIsLaunching(true);
    try {
      const res = await fetch("/api/engine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          topic,
          targetCount: parseInt(targetCount, 10),
          difficulty,
          provider,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveJobId(data.jobId);
        fetchJobs();
      }
    } catch (err) {
      console.error("Error starting batch generation:", err);
    } finally {
      setIsLaunching(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (questionId, newStatus) => {
    try {
      const res = await fetch(`/api/engine/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchQuestions();
        fetchCoverage();
      }
    } catch (err) {
      console.error("Error updating question status:", err);
    }
  };

  // Update Question Availability
  const handleToggleAvailability = async (questionId, updates) => {
    try {
      const res = await fetch(`/api/engine/questions/${questionId}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  available_in_training:
                    updates.availableInTraining !== undefined
                      ? (updates.availableInTraining ? 1 : 0)
                      : q.available_in_training,
                  available_in_battle:
                    updates.availableInBattle !== undefined
                      ? (updates.availableInBattle ? 1 : 0)
                      : q.available_in_battle,
                }
              : q
          )
        );
      }
    } catch (err) {
      console.error("Error toggling question availability:", err);
    }
  };

  // Status Badge Colors
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={13} /> Approved
          </span>
        );
      case "needs_review":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle size={13} /> Needs Review
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle size={13} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
              <Cpu size={14} /> Autonomous Generation Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cybersecurity Question Generation Engine
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Scalable multi-stage question synthesis pipeline. Features 3-layer deduplication (canonical hash, fuzzy token, vector similarity), RFC 5737 safe address compliance, distractor plausibility validation, and automatic quality certification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchJobs();
                fetchQuestions();
                fetchCoverage();
              }}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-zinc-700/60 shadow-sm"
            >
              <RefreshCw size={14} /> Sync Metrics
            </button>
          </div>
        </div>

        {/* Global Pipeline Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-800/70">
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <div className="text-xs text-zinc-400 font-medium">Total Questions</div>
            <div className="text-xl font-bold text-white mt-1">{questions.length}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <div className="text-xs text-emerald-400 font-medium">Approved & Live</div>
            <div className="text-xl font-bold text-emerald-300 mt-1">
              {questions.filter((q) => q.status === "approved").length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <div className="text-xs text-amber-400 font-medium">Flagged for Review</div>
            <div className="text-xl font-bold text-amber-300 mt-1">
              {questions.filter((q) => q.status === "needs_review").length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <div className="text-xs text-cyan-400 font-medium">Active Batch Jobs</div>
            <div className="text-xl font-bold text-cyan-300 mt-1">
              {jobs.filter((j) => j.status === "running").length}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-px">
        <button
          onClick={() => setActiveTab("generate")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "generate"
              ? "border-emerald-400 text-emerald-300 bg-emerald-500/[0.04]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Play size={16} /> Batch Generator & Jobs
        </button>

        <button
          onClick={() => setActiveTab("explorer")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "explorer"
              ? "border-emerald-400 text-emerald-300 bg-emerald-500/[0.04]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Database size={16} /> Question Explorer ({questions.length})
        </button>

        <button
          onClick={() => setActiveTab("coverage")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "coverage"
              ? "border-emerald-400 text-emerald-300 bg-emerald-500/[0.04]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <BarChart3 size={16} /> Coverage Matrix
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "reports"
              ? "border-emerald-400 text-emerald-300 bg-emerald-500/[0.04]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Flag size={16} /> Player Reports ({reports.length})
        </button>
      </div>

      {/* TAB 1: BATCH GENERATOR & JOBS */}
      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Generation Config Form */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Terminal size={18} className="text-emerald-400" /> Start Generation Batch
            </h2>

            <form onSubmit={handleLaunchBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Cybersecurity Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950/80 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-400"
                >
                  <option value="Network Security & Architecture">Network Security & Architecture</option>
                  <option value="Security Operations & Defense">Security Operations & Defense (SOC)</option>
                  <option value="Cloud & Infrastructure Security">Cloud & Infrastructure Security</option>
                  <option value="Digital Forensics & Incident Response">Digital Forensics & Incident Response</option>
                  <option value="Identity & Access Management">Identity & Access Management (AD / IAM)</option>
                  <option value="Application & Web Security">Application & Web Security</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Concept or Topic Focus</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. TCP Handshake, Kerberoasting, IMDS, DNSSEC (or 'all')"
                  className="w-full rounded-xl bg-zinc-950/80 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Target Count</label>
                  <select
                    value={targetCount}
                    onChange={(e) => setTargetCount(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950/80 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-400"
                  >
                    <option value={2}>2 Questions (Quick Test)</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={25}>25 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Difficulty Ladder</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950/80 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-400"
                  >
                    <option value="easy">Easy (Foundations)</option>
                    <option value="medium">Medium (Tactical)</option>
                    <option value="hard">Hard (Advanced SOC / Red)</option>
                    <option value="expert">Expert (Kernel / Protocol)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">AI Engine Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950/80 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-400"
                >
                  <option value="synthesizer">Built-in Tactical Synthesizer (Zero Cost / Deterministic)</option>
                  <option value="openai">OpenAI (GPT-4o Mini / Structured Output)</option>
                  <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLaunching}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(52,211,153,.2)]"
                >
                  {isLaunching ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} className="fill-current" />
                  )}
                  {isLaunching ? "Initiating Batch..." : "Launch Batch Generation Pipeline"}
                </button>
              </div>

              <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3.5 text-xs text-zinc-400 space-y-1.5">
                <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-cyan-400" /> Pipeline Quality Gates:
                </div>
                <div>• Automatic 3-Layer Deduplication check</div>
                <div>• Distractor homogeneity & length symmetry validation</div>
                <div>• RFC 5737 safe documentation IP enforcement</div>
                <div>• Auto-approval for Quality Score ≥ 85</div>
              </div>
            </form>
          </div>

          {/* Jobs Execution Feed */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock size={18} className="text-cyan-400" /> Batch Pipeline Activity
              </span>
              <span className="text-xs font-normal text-zinc-400">Auto-polling updates</span>
            </h2>

            {jobs.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-8 text-center text-zinc-400">
                No batch generation jobs recorded yet. Configure and launch a batch on the left.
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => {
                  const percent =
                    job.target_count > 0 ? Math.min(100, Math.round((job.accepted_count / job.target_count) * 100)) : 0;

                  return (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 backdrop-blur-xl transition-all"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              job.status === "running"
                                ? "bg-cyan-400 animate-pulse"
                                : job.status === "completed"
                                ? "bg-emerald-400"
                                : "bg-red-400"
                            }`}
                          />
                          <span className="font-bold text-sm text-white">{job.domain}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                            {job.difficulty}
                          </span>
                        </div>
                        <div>{getStatusBadge(job.status)}</div>
                      </div>

                      <div className="text-xs text-zinc-400 mb-3 flex items-center gap-4">
                        <span>Topic: <strong className="text-zinc-200">{job.topic}</strong></span>
                        <span>Provider: <strong className="text-zinc-200">{job.provider}</strong></span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden mb-2.5">
                        <div
                          className="bg-emerald-400 h-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>
                          Accepted: <strong className="text-emerald-400">{job.accepted_count}</strong> / {job.target_count}
                        </span>
                        <span>
                          Rejected / Deduped: <strong className="text-amber-400">{job.rejected_count}</strong>
                        </span>
                        <span>
                          Total Evaluated: <strong className="text-zinc-200">{job.generated_count}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: QUESTION EXPLORER */}
      {activeTab === "explorer" && (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompt, concept, explanation..."
                className="w-full rounded-xl bg-zinc-950/80 border border-zinc-700/80 pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="rounded-xl bg-zinc-950/80 border border-zinc-700/80 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="all">All Domains</option>
                <option value="Network Security & Architecture">Network Security</option>
                <option value="Security Operations & Defense">Security Operations</option>
                <option value="Cloud & Infrastructure Security">Cloud Security</option>
                <option value="Digital Forensics & Incident Response">Forensics & IR</option>
              </select>

              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="rounded-xl bg-zinc-950/80 border border-zinc-700/80 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl bg-zinc-950/80 border border-zinc-700/80 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="needs_review">Needs Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Question List */}
          {isLoadingQuestions ? (
            <div className="text-center py-12 text-zinc-400">Loading questions from engine repository...</div>
          ) : questions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-12 text-center text-zinc-400">
              No questions matched the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => {
                const isExpanded = expandedQuestionId === q.id;

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:p-6 backdrop-blur-xl transition-all hover:border-zinc-700/80 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          {q.domain}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded font-mono bg-zinc-950 text-cyan-400 border border-zinc-800">
                          {q.difficulty}
                        </span>
                        {q.mitre_attack_id && (
                          <span className="text-xs px-2 py-0.5 rounded font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            MITRE {q.mitre_attack_id}
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded font-mono bg-zinc-800/60 text-zinc-400">
                          Score: <strong className="text-emerald-400">{q.quality_score}</strong>/100
                        </span>
                      </div>

                      <div className="flex items-center gap-2">{getStatusBadge(q.status)}</div>
                    </div>

                    {/* Question Prompt */}
                    <p className="text-sm sm:text-base font-medium text-white leading-relaxed">{q.prompt}</p>

                    {/* Options (4 choices) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {(q.options || []).map((opt, idx) => (
                        <div
                          key={opt.id || idx}
                          className={`p-3 rounded-xl border text-xs leading-relaxed ${
                            opt.is_correct
                              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                              : "bg-zinc-950/40 border-zinc-800/60 text-zinc-300"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-bold shrink-0">{String.fromCharCode(65 + idx)}.</span>
                            <div className="space-y-1">
                              <div>{opt.text}</div>
                              {opt.rationale && (
                                <div className="text-[11px] text-zinc-400 italic">Rationale: {opt.rationale}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Expandable Explanation & Diagnostics */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3 animate-in fade-in duration-200">
                        <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-4 text-xs space-y-2">
                          <div className="font-semibold text-emerald-400">Detailed Technical Explanation:</div>
                          <p className="text-zinc-300 leading-relaxed">{q.explanation}</p>
                        </div>

                        {Array.isArray(q.validation_notes) && q.validation_notes.length > 0 && (
                          <div className="rounded-xl bg-amber-950/10 border border-amber-500/20 p-3 text-xs text-amber-300 space-y-1">
                            <div className="font-semibold">Validation Notes:</div>
                            {q.validation_notes.map((note, idx) => (
                              <div key={idx}>• {note}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode Availability & Usage Telemetry */}
                    <div className="pt-3 pb-1 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Disponibilidad:</span>
                        <button
                          onClick={() =>
                            handleToggleAvailability(q.id, {
                              availableInTraining: !(q.available_in_training !== 0 && q.available_in_training !== false),
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            q.available_in_training !== 0 && q.available_in_training !== false
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {q.available_in_training !== 0 && q.available_in_training !== false ? "✓ Training: ACTIVO" : "✗ Training: OFF"}
                        </button>
                        <button
                          onClick={() =>
                            handleToggleAvailability(q.id, {
                              availableInBattle: !(q.available_in_battle !== 0 && q.available_in_battle !== false),
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            q.available_in_battle !== 0 && q.available_in_battle !== false
                              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
                              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {q.available_in_battle !== 0 && q.available_in_battle !== false ? "✓ Battle 1v1: ACTIVO" : "✗ Battle: OFF"}
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                        <span>Uso Training: <strong className="text-zinc-200">{q.training_usage || 0}</strong></span>
                        <span>•</span>
                        <span>Uso Battle: <strong className="text-zinc-200">{q.battle_usage || 0}</strong></span>
                        {q.average_response_ms > 0 && (
                          <>
                            <span>•</span>
                            <span>Avg: <strong className="text-zinc-200">{Math.round(q.average_response_ms / 1000)}s</strong></span>
                          </>
                        )}
                        {q.empirical_difficulty !== null && q.empirical_difficulty !== undefined && (
                          <>
                            <span>•</span>
                            <span className={Math.abs(q.empirical_difficulty - 0.5) > 0.35 ? "text-amber-400 font-bold" : "text-zinc-300"}>
                              Dif. Empírica: {Math.round(q.empirical_difficulty * 100)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                      <button
                        onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? "Collapse Details" : "Inspect Full Technical Explanation"}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      <div className="flex items-center gap-2">
                        {q.status !== "approved" && (
                          <button
                            onClick={() => handleUpdateStatus(q.id, "approved")}
                            className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {q.status !== "needs_review" && (
                          <button
                            onClick={() => handleUpdateStatus(q.id, "needs_review")}
                            className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-colors"
                          >
                            Needs Review
                          </button>
                        )}
                        {q.status !== "rejected" && (
                          <button
                            onClick={() => handleUpdateStatus(q.id, "rejected")}
                            className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COVERAGE MATRIX */}
      {activeTab === "coverage" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-xl">
            <h2 className="text-base font-bold text-white mb-2">Question Bank Coverage Matrix</h2>
            <p className="text-xs text-zinc-400 mb-6">
              Distribution of certified questions across cybersecurity domains and difficulty tiers.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Difficulty</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Question Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300 text-xs">
                  {coverageData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500">
                        No coverage data aggregated yet.
                      </td>
                    </tr>
                  ) : (
                    coverageData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-white">{row.domain}</td>
                        <td className="py-3 px-4 font-mono">{row.difficulty}</td>
                        <td className="py-3 px-4">{getStatusBadge(row.status)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono text-sm">
                          {row.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLAYER REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Flag size={18} className="text-amber-400" /> Player Reports Queue
          </h2>

          {reports.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-12 text-center text-zinc-400">
              No questions currently flagged by players in training or battle mode.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase">Reason: {rep.reason}</span>
                    <span className="text-xs text-zinc-500">{new Date(rep.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-zinc-200">Question: "{rep.prompt}"</p>
                  {rep.comment && <p className="text-xs text-zinc-400">User Comment: {rep.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
