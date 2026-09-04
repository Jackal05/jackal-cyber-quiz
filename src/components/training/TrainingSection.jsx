import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import { NETWORK_QUESTIONS } from "../../data/networkQuestions.js";
import { FORENSICS_QUESTIONS } from "../../data/forensicsQuestions.js";
import { CYBER_QUESTIONS } from "../../data/cyberQuestions.js";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Cable,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  GraduationCap,
  Home,
  LockKeyhole,
  Network,
  RefreshCcw,
  Router,
  Share2,
  ShieldCheck,
  Target,
  Trophy,
  Waypoints,
  XCircle,
  Zap,
  Fingerprint,
  Search,
  Microscope,
  FileSearch,
  Skull,
  Timer,
  Brain,
  ShieldAlert,
  Swords,
  TrendingUp,
  RotateCcw,
  Sparkles,
  BookOpen,
} from "lucide-react";

function Button({ className = "", children, type = "button", ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center px-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Card({ className = "", children, ...props }) {
  return <div className={`border ${className}`} {...props}>{children}</div>;
}

function CardContent({ className = "", children, ...props }) {
  return <div className={className} {...props}>{children}</div>;
}

const LEVELS = {
  facil: { name: "Fácil", subtitle: "Fundamentos esenciales", description: "Conceptos básicos, protección de cuentas y navegación segura.", icon: ShieldCheck, timePerQuestion: 20 },
  medio: { name: "Medio", subtitle: "Defensa y análisis", description: "Redes, vulnerabilidades, controles y respuesta a incidentes.", icon: Target, timePerQuestion: 20 },
  dificil: { name: "Difícil", subtitle: "Decisiones profesionales", description: "Escenarios de arquitectura, riesgo, nube, identidad y respuesta a incidentes.", icon: LockKeyhole, timePerQuestion: 30 },
  extraDificil: { name: "Extra difícil", subtitle: "Desafío de élite", description: "Casos expertos de ataque, defensa, forense, criptografía y seguridad cloud.", icon: Zap, timePerQuestion: 30 },
};

const NETWORK_LEVELS = {
  facil: { name: "Fácil", subtitle: "Fundamentos de red", description: "Modelo OSI, dispositivos, medios, protocolos y direccionamiento esencial.", icon: Cable, timePerQuestion: 20 },
  medio: { name: "Medio", subtitle: "Administración y conectividad", description: "Subnetting, VLAN, switching, routing, servicios IP, Wi-Fi y monitoreo.", icon: Router, timePerQuestion: 20 },
  dificil: { name: "Difícil", subtitle: "Diagnóstico profesional", description: "Troubleshooting de OSPF, BGP, EIGRP, MPLS, DMVPN, QoS e IPv6.", icon: Network, timePerQuestion: 30 },
  extraDificil: { name: "Extra difícil", subtitle: "Infraestructura experta", description: "Escenarios multi-protocolo de convergencia, EVPN, MPLS, multicast y diseño.", icon: Waypoints, timePerQuestion: 30 },
};

const FORENSICS_LEVELS = {
  facil: { name: "Fácil", subtitle: "Fundamentos forenses", description: "Principios de evidencia digital, cadena de custodia, adquisición y preservación.", icon: Search, timePerQuestion: 20 },
  medio: { name: "Medio", subtitle: "Artefactos y procedimientos", description: "Artefactos de Windows, herramientas de análisis, formatos de imagen y normas ISO.", icon: Fingerprint, timePerQuestion: 20 },
  dificil: { name: "Difícil", subtitle: "Investigación avanzada", description: "Anti-forense, timeline reconstruction, NTFS internals y análisis de memoria.", icon: Microscope, timePerQuestion: 30 },
  extraDificil: { name: "Extra difícil", subtitle: "Peritaje de élite", description: "Rootkits, inyección de código, forense cloud, UEFI y técnicas anti-forense avanzadas.", icon: FileSearch, timePerQuestion: 30 },
};

const TRACKS = {
  ciberseguridad: {
    name: "Ciberseguridad", eyebrow: "Defensa, riesgo y ataque ético", description: "Evalúa tu criterio para proteger identidades, aplicaciones, infraestructura y datos.", icon: ShieldCheck, levels: LEVELS, questions: CYBER_QUESTIONS,
  },
  redes: {
    name: "Redes", eyebrow: "Conectividad e infraestructura", description: "Domina desde los fundamentos IP hasta el diagnóstico de redes empresariales complejas.", icon: Network, levels: NETWORK_LEVELS, questions: NETWORK_QUESTIONS,
  },
  forense: {
    name: "Informática Forense", eyebrow: "Evidencia, análisis e investigación", description: "Domina la adquisición, preservación y análisis de evidencia digital con rigor pericial.", icon: Fingerprint, levels: FORENSICS_LEVELS, questions: FORENSICS_QUESTIONS,
  },
};

const letter = (i) => String.fromCharCode(65 + i);

function prepareQuestions(source) {
  return shuffle(source.map(([prompt, options, correct, explanation]) => {
    const isMultiple = Array.isArray(correct);
    const correctArray = isMultiple ? correct : [correct];
    const optionObjects = options.map((opt, i) => ({ option: opt, isCorrect: correctArray.includes(i) }));
    const shuffledOptions = shuffle(optionObjects);
    return [
      prompt,
      shuffledOptions.map((o) => o.option),
      shuffledOptions.map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1),
      explanation,
    ];
  }));
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function TrainingSection({ initialCategory = "ciberseguridad", onNavigate }) {
  const { user } = useAuth();
  const [screen, setScreen] = useState("home"); // 'home' | 'quiz' | 'result'
  const [trainingMode, setTrainingMode] = useState("adaptive"); // 'adaptive' | 'classic'
  const [category, setCategory] = useState(initialCategory || "ciberseguridad");
  const [level, setLevel] = useState(null);
  const [suddenDeath, setSuddenDeath] = useState(false);

  // Adaptive Engine Session State
  const [sessionType, setSessionType] = useState("mixed");
  const [sessionId, setSessionId] = useState(null);
  const [adaptiveQuestions, setAdaptiveQuestions] = useState([]);
  const [adaptiveIndex, setAdaptiveIndex] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [sessionXpTotal, setSessionXpTotal] = useState(0);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [sessionAnswerRecords, setSessionAnswerRecords] = useState([]);
  const [masteryAnalytics, setMasteryAnalytics] = useState(null);

  // Classic Quiz State
  const [classicQuestions, setQuestions] = useState([]);
  const [classicAnswers, setAnswers] = useState({});
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [deathOccurred, setDeathOccurred] = useState(false);

  // Fetch live mastery analytics
  const fetchAnalytics = async () => {
    try {
      const url = user?.id ? `/api/training/analytics?userId=${user.id}` : "/api/training/analytics";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMasteryAnalytics(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  useEffect(() => {
    if (initialCategory) {
      if (TRACKS[initialCategory]) {
        setCategory(initialCategory);
      } else {
        // Came from battle with a specific weak topic!
        setSessionType("weak_topics");
      }
    }
  }, [initialCategory]);

  useEffect(() => {
    if (screen !== "quiz" || !startedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [screen, startedAt]);

  // Start Adaptive Training Session
  const startAdaptiveSession = async (type = "mixed", topicOverride = null) => {
    try {
      const payload = {
        sessionType: type,
        category: category !== "general" ? category : null,
        focusTopic: topicOverride || (type === "weak_topics" ? (initialCategory || null) : null),
        questionCount: type === "battle_prep" ? 5 : 10,
        userId: user?.id || null,
      };

      const res = await fetch("/api/training/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);
        setAdaptiveQuestions(data.questions || []);
        setSessionType(data.sessionType || type);
        setAdaptiveIndex(0);
        setCurrentFeedback(null);
        setSessionXpTotal(0);
        setSessionAnswerRecords([]);
        setElapsed(0);
        setStartedAt(Date.now());
        setTrainingMode("adaptive");
        setScreen("quiz");
        return;
      }
    } catch (err) {
      console.warn("Backend training endpoint unavailable, falling back to local questions", err);
    }

    // Fallback to classic if backend unavailable
    startClassic(level || "medio");
  };

  // Submit Answer to Authoritative Backend
  const submitAdaptiveAnswer = async (selectedOptionId) => {
    if (!sessionId || isSubmittingAnswer || currentFeedback) return;
    setIsSubmittingAnswer(true);

    const currentQ = adaptiveQuestions[adaptiveIndex];
    const payload = {
      sessionId,
      questionId: currentQ.id,
      selectedOptionId,
      responseTimeMs: 12000,
      userId: user?.id || null,
    };

    try {
      const res = await fetch("/api/training/session/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        setCurrentFeedback({
          selectedOptionId,
          isCorrect: result.isCorrect,
          correctOptionIds: result.correctOptionIds || [],
          explanation: result.explanation,
          rationales: result.rationales || {},
          xpGained: result.xpGained || 0,
          masteryScore: result.masteryScore,
          nextReviewInDays: result.nextReviewInDays,
        });

        setSessionXpTotal((prev) => prev + (result.xpGained || 0));
        setSessionAnswerRecords((prev) => [
          ...prev,
          {
            question: currentQ,
            selectedOptionId,
            isCorrect: result.isCorrect,
            explanation: result.explanation,
            rationales: result.rationales || {},
          },
        ]);
      }
    } catch (err) {
      console.error("Answer submission error:", err);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Advance to next question in adaptive mode
  const nextAdaptiveQuestion = () => {
    if (adaptiveIndex + 1 < adaptiveQuestions.length) {
      setAdaptiveIndex((prev) => prev + 1);
      setCurrentFeedback(null);
    } else {
      finishAdaptiveSession();
    }
  };

  const finishAdaptiveSession = async () => {
    const correctCount = sessionAnswerRecords.filter((r) => r.isCorrect).length;
    const accuracy = Math.round((correctCount / (adaptiveQuestions.length || 1)) * 100);

    try {
      await fetch("/api/training/session/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          accuracy,
          totalQuestions: adaptiveQuestions.length,
          correctCount,
          avgResponseMs: 12000,
          xpEarned: sessionXpTotal,
          userId: user?.id || null,
        }),
      });
    } catch {}

    fetchAnalytics();
    setScreen("result");
  };

  // Start Classic Training Track
  const startClassic = (key) => {
    const activeTrack = TRACKS[category] || TRACKS.ciberseguridad;
    setLevel(key);
    setQuestions(prepareQuestions(activeTrack.questions[key]));
    setAnswers({});
    setElapsed(0);
    setDeathOccurred(false);
    setStartedAt(Date.now());
    setTrainingMode("classic");
    setScreen("quiz");
  };

  const finishClassic = (died = false) => {
    if (died) setDeathOccurred(true);
    setScreen("result");
  };

  const goHome = () => {
    setScreen("home");
    setLevel(null);
    setSessionId(null);
    setCurrentFeedback(null);
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const activeTrack = TRACKS[category] || TRACKS.ciberseguridad;
  const activeLevel = level ? activeTrack.levels[level] : null;

  const scoreData = useMemo(() => {
    if (trainingMode === "adaptive") {
      const correctCount = sessionAnswerRecords.filter((r) => r.isCorrect).length;
      const total = adaptiveQuestions.length || 1;
      const percentage = Math.round((correctCount / total) * 100);
      return {
        points: correctCount * 15,
        correctCount,
        percentage,
        totalPts: total * 15,
        totalQuestions: total,
      };
    }

    let points = 0;
    let correctCount = 0;
    for (let i = 0; i < classicQuestions.length; i++) {
      if (classicAnswers[i] === undefined) continue;
      const q = classicQuestions[i];
      const ans = classicAnswers[i];
      const isCorrect = Array.isArray(ans) && ans.length === q[2].length && ans.every((v) => q[2].includes(v));
      if (isCorrect) {
        points += 10;
        correctCount += 1;
      } else {
        points -= 5;
      }
    }
    return {
      points,
      correctCount,
      percentage: classicQuestions.length ? Math.max(0, Math.round((correctCount / classicQuestions.length) * 100)) : 0,
      totalPts: classicQuestions.length * 10,
      totalQuestions: classicQuestions.length,
    };
  }, [trainingMode, sessionAnswerRecords, adaptiveQuestions, classicAnswers, classicQuestions]);

  const verdict = deathOccurred
    ? ["Muerte Súbita", "Un error te costó el desafío. Debes ser perfecto.", Skull]
    : scoreData.percentage >= 85
    ? ["Dominio Sobresaliente", "Has demostrado maestría rigurosa. Listo para Battle 1v1.", Trophy]
    : scoreData.percentage >= 70
    ? ["Criterio Técnico Sólido", "Excelente rendimiento. Refuerza detalles menores.", Award]
    : scoreData.percentage >= 50
    ? ["En Progreso Activo", "Refuerza los conceptos fallados mediante repaso espaciado.", GraduationCap]
    : ["Sigue Entrenando", "El entrenamiento adaptativo cerrará tus brechas de conocimiento.", RefreshCcw];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <HomeScreen
            category={category}
            setCategory={setCategory}
            suddenDeath={suddenDeath}
            setSuddenDeath={setSuddenDeath}
            startAdaptiveSession={startAdaptiveSession}
            startClassic={startClassic}
            masteryAnalytics={masteryAnalytics}
            initialFocusTopic={initialCategory}
          />
        )}

        {screen === "quiz" && (
          <QuizScreen
            trainingMode={trainingMode}
            // Adaptive props
            adaptiveQuestions={adaptiveQuestions}
            adaptiveIndex={adaptiveIndex}
            currentFeedback={currentFeedback}
            submitAdaptiveAnswer={submitAdaptiveAnswer}
            nextAdaptiveQuestion={nextAdaptiveQuestion}
            isSubmittingAnswer={isSubmittingAnswer}
            sessionXpTotal={sessionXpTotal}
            // Classic props
            levelInfo={activeLevel}
            questions={classicQuestions}
            answers={classicAnswers}
            setAnswers={setAnswers}
            finishClassic={finishClassic}
            suddenDeath={suddenDeath}
            // Common
            elapsed={elapsed}
            formatTime={formatTime}
            goHome={goHome}
          />
        )}

        {screen === "result" && (
          <ResultScreen
            trainingMode={trainingMode}
            category={category}
            trackName={activeTrack.name}
            level={level}
            levelInfo={activeLevel}
            questions={trainingMode === "adaptive" ? sessionAnswerRecords : classicQuestions}
            scoreData={scoreData}
            sessionXpTotal={sessionXpTotal}
            elapsed={elapsed}
            formatTime={formatTime}
            verdict={verdict}
            restart={() => (trainingMode === "adaptive" ? startAdaptiveSession(sessionType) : startClassic(level))}
            startAdaptiveSession={startAdaptiveSession}
            goHome={goHome}
            onNavigate={onNavigate}
            deathOccurred={deathOccurred}
            masteryAnalytics={masteryAnalytics}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// HOME SCREEN
// ============================================================================

function HomeScreen({
  category,
  setCategory,
  suddenDeath,
  setSuddenDeath,
  startAdaptiveSession,
  startClassic,
  masteryAnalytics,
  initialFocusTopic,
}) {
  const [activeTab, setActiveTab] = useState("adaptive"); // 'adaptive' | 'tracks'
  const track = TRACKS[category] || TRACKS.ciberseguridad;

  const weakestTopic = masteryAnalytics?.weakestTopics?.[0];
  const overallMastery = masteryAnalytics?.overallMastery ?? 64;
  const dueReviewsCount = masteryAnalytics?.dueReviews?.length ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
      {/* Header Banner */}
      <section className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3.5 py-1.5 text-xs font-bold text-emerald-300 mb-4">
          <Zap size={14} className="text-emerald-400" /> Jackal Adaptive Training Engine
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1]">
          Entrena tu <span className="text-emerald-400">criterio técnico.</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl mx-auto">
          Mismo banco central de preguntas que Battle 1v1. Aprendizaje adaptativo, repaso espaciado SM-2 y detección activa de brechas de conocimiento.
        </p>
      </section>

      {/* Battle Bridge Notification Banner (if redirected from a match) */}
      {initialFocusTopic && initialFocusTopic !== "ciberseguridad" && (
        <div className="max-w-4xl mx-auto mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[.07] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400/10 text-amber-400 grid place-items-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-400">Objetivo Detectado en Combate 1v1</div>
              <div className="text-sm font-bold text-white">
                Foco recomendado: <span className="text-amber-300 font-black">{initialFocusTopic}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => startAdaptiveSession("weak_topics", initialFocusTopic)}
            className="h-10 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <GraduationCap size={16} /> REFORZAR ESTE TEMA <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Live Skill & Mastery Overview Strip */}
      <div className="max-w-4xl mx-auto mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 grid place-items-center font-black text-lg shrink-0">
            {overallMastery}%
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Maestría Global</div>
            <div className="text-sm font-bold text-white">Nivel de Dominio</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">Basado en precisión y dificultad</div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 grid place-items-center shrink-0">
            <Target size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Punto Más Débil</div>
            <div className="text-xs font-bold text-zinc-200 truncate">
              {weakestTopic ? weakestTopic.name : "Protocolos & DNS"}
            </div>
            <div className="text-[11px] text-amber-400 mt-0.5">
              {weakestTopic ? `${weakestTopic.mastery}% maestría` : "Precisión < 70%"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 grid place-items-center shrink-0">
            <RotateCcw size={22} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Repaso Espaciado (SM-2)</div>
            <div className="text-sm font-bold text-white">{dueReviewsCount} pendientes</div>
            <div className="text-[11px] text-cyan-400 mt-0.5">Para retención a largo plazo</div>
          </div>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-center">
        <div className="inline-flex p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => setActiveTab("adaptive")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "adaptive"
                ? "bg-emerald-400 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Brain size={15} /> Entrenamiento Adaptativo Inteligente
          </button>
          <button
            onClick={() => setActiveTab("tracks")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "tracks"
                ? "bg-emerald-400 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BookOpen size={15} /> Rutas Clásicas por Especialidad
          </button>
        </div>
      </div>

      {/* TAB 1: ADAPTIVE SESSION TYPES */}
      {activeTab === "adaptive" && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* 1. Standard Adaptive Mixed Session */}
            <div className="p-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/[.04] hover:bg-emerald-400/[.07] transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-400/10 text-emerald-400 grid place-items-center border border-emerald-400/20">
                    <Sparkles size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    RECOMENDADO
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                  Sesión Adaptativa Completa
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Mix inteligente: 40% puntos débiles, 25% conceptos nuevos, 20% repaso SM-2 y 15% consolidación de élite.
                </p>
                <div className="mt-4 flex gap-3 text-[11px] text-zinc-500 font-medium">
                  <span>• 10 preguntas</span>
                  <span>• Feedback explicativo en vivo</span>
                  <span>• +XP y Maestría</span>
                </div>
              </div>
              <Button
                onClick={() => startAdaptiveSession("mixed")}
                className="mt-6 w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs h-11"
              >
                Iniciar Sesión Adaptativa <ArrowRight size={15} className="ml-1" />
              </Button>
            </div>

            {/* 2. Weak Topics Focused */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 hover:border-amber-400/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-400/10 text-amber-400 grid place-items-center border border-amber-400/20">
                    <Target size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    REMEDIACIÓN
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                  Foco en Puntos Débiles
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Concentración prioritaria en conceptos donde tu precisión histórica o maestría está por debajo del 70%.
                </p>
                <div className="mt-4 flex gap-3 text-[11px] text-zinc-500 font-medium">
                  <span>• 10 preguntas</span>
                  <span>• Identificación de fallas</span>
                  <span>• Racionales de distractores</span>
                </div>
              </div>
              <Button
                onClick={() => startAdaptiveSession("weak_topics")}
                className="mt-6 w-full rounded-xl bg-zinc-800 hover:bg-amber-400 hover:text-black text-zinc-200 font-extrabold text-xs h-11 transition-colors"
              >
                Entrenar Puntos Débiles <ArrowRight size={15} className="ml-1" />
              </Button>
            </div>

            {/* 3. Spaced Repetition Due Review */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 hover:border-cyan-400/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-xl bg-cyan-400/10 text-cyan-400 grid place-items-center border border-cyan-400/20">
                    <RotateCcw size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                    SM-2 / FSRS
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
                  Repaso Espaciado Programado
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Refuerza tarjetas y conceptos calculados justo antes de que tu memoria decaiga según el algoritmo SM-2.
                </p>
                <div className="mt-4 flex gap-3 text-[11px] text-zinc-500 font-medium">
                  <span>• {dueReviewsCount || 5} conceptos vencidos</span>
                  <span>• Extensión de intervalos</span>
                </div>
              </div>
              <Button
                onClick={() => startAdaptiveSession("review_mistakes")}
                className="mt-6 w-full rounded-xl bg-zinc-800 hover:bg-cyan-400 hover:text-black text-zinc-200 font-extrabold text-xs h-11 transition-colors"
              >
                Repasar Conceptos Vencidos <ArrowRight size={15} className="ml-1" />
              </Button>
            </div>

            {/* 4. Battle 1v1 Prep Simulator */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 hover:border-rose-400/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-xl bg-rose-400/10 text-rose-400 grid place-items-center border border-rose-400/20">
                    <Swords size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-400/10 text-rose-400 border border-rose-400/20">
                    COMPETITIVO
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-rose-300 transition-colors">
                  Simulación de Battle 1v1
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  5 rondas temáticas idénticas a un duelo real: Redes → SOC → Web/Cloud → Forense → Escenario Avanzado.
                </p>
                <div className="mt-4 flex gap-3 text-[11px] text-zinc-500 font-medium">
                  <span>• 5 rondas</span>
                  <span>• Calibrado a tu MMR</span>
                  <span>• No altera tu Elo</span>
                </div>
              </div>
              <Button
                onClick={() => startAdaptiveSession("battle_prep")}
                className="mt-6 w-full rounded-xl bg-zinc-800 hover:bg-rose-500 hover:text-white text-zinc-200 font-extrabold text-xs h-11 transition-colors"
              >
                Simular Combate <ArrowRight size={15} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLASSIC TRACKS & LEVELS */}
      {activeTab === "tracks" && (
        <div>
          <div className="mx-auto mb-6 grid max-w-4xl sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Especialidades disponibles">
            {Object.entries(TRACKS).map(([key, item]) => {
              const TrackIcon = item.icon;
              const active = category === key;
              return (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  aria-pressed={active}
                  className={`rounded-2xl border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer ${
                    active
                      ? "border-emerald-400/60 bg-emerald-400/[.09] shadow-[0_0_28px_rgba(52,211,153,.08)]"
                      : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-11 w-11 shrink-0 rounded-xl grid place-items-center ${active ? "bg-emerald-400 text-black" : "bg-zinc-900 text-zinc-500"}`}>
                      <TrackIcon size={22} />
                    </div>
                    <div>
                      <h2 className="font-black text-white">{item.name}</h2>
                      <p className="text-xs text-emerald-400 mt-1">{item.eyebrow}</p>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-2">{item.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="max-w-4xl mx-auto mb-8 flex flex-col items-center">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${suddenDeath ? "bg-red-500" : "bg-zinc-700"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${suddenDeath ? "translate-x-6" : "translate-x-1"}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold flex items-center gap-2">
                  <Skull size={14} className={suddenDeath ? "text-red-400" : "text-zinc-500"} /> Modo Muerte Súbita
                </span>
                {!suddenDeath && <span className="text-[10px] text-zinc-500 mt-0.5">1 fallo = expulsión inmediata</span>}
              </div>
              <input type="checkbox" className="sr-only" checked={suddenDeath} onChange={(e) => setSuddenDeath(e.target.checked)} />
            </label>
          </div>

          <motion.section key={category} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[.18em] text-emerald-400 uppercase">Ruta seleccionada</p>
                <h2 className="mt-1 text-2xl md:text-3xl font-black text-white">{track.name}</h2>
              </div>
              <span className="hidden sm:block text-xs text-zinc-500">
                4 niveles de evaluación
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {Object.entries(track.levels).map(([key, item], i) => {
                const Icon = item.icon;
                return (
                  <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Card className="h-full bg-zinc-950/80 border-zinc-800 hover:border-emerald-400/50 rounded-2xl overflow-hidden transition-colors group">
                      <CardContent className="p-0">
                        <div className="h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-400/10 text-emerald-400 grid place-items-center border border-emerald-400/10">
                              <Icon size={24} />
                            </div>
                            <span className="text-xs font-bold text-zinc-500">NIVEL 0{i + 1}</span>
                          </div>
                          <h3 className="text-xl font-black text-white">{item.name}</h3>
                          <p className="text-emerald-400 text-xs font-medium mt-1">{item.subtitle}</p>
                          <p className="text-zinc-400 text-xs leading-relaxed mt-3 min-h-[48px]">{item.description}</p>
                          <div className="flex gap-4 my-5 text-xs text-zinc-400">
                            <span className="flex gap-1.5 items-center"><Target size={14} />20 retos</span>
                            <span className="flex gap-1.5 items-center"><Timer size={14} />{item.timePerQuestion}s</span>
                          </div>
                          <Button onClick={() => startClassic(key)} className="w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold h-11">
                            Comenzar Nivel <ChevronRight size={17} className="ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// QUIZ SCREEN
// ============================================================================

function QuizScreen({
  trainingMode,
  // Adaptive props
  adaptiveQuestions,
  adaptiveIndex,
  currentFeedback,
  submitAdaptiveAnswer,
  nextAdaptiveQuestion,
  isSubmittingAnswer,
  sessionXpTotal,
  // Classic props
  levelInfo,
  questions,
  answers,
  setAnswers,
  finishClassic,
  suddenDeath,
  // Common
  elapsed,
  formatTime,
  goHome,
}) {
  // ADAPTIVE MODE QUIZ
  if (trainingMode === "adaptive") {
    const q = adaptiveQuestions[adaptiveIndex];
    if (!q) return null;

    const progress = ((adaptiveIndex + (currentFeedback ? 1 : 0)) / (adaptiveQuestions.length || 1)) * 100;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={goHome} className="text-sm text-zinc-500 hover:text-white flex items-center gap-2 cursor-pointer">
            <ArrowLeft size={16} /> Salir de Sesión
          </button>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 text-xs font-black text-emerald-400 flex items-center gap-1.5">
              <Zap size={14} /> +{sessionXpTotal} XP
            </span>
            <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <Clock3 size={14} /> {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-zinc-500 font-bold">
              Desafío Adaptativo {adaptiveIndex + 1} de {adaptiveQuestions.length}
            </span>
            <span className="text-emerald-400 font-black">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div className="h-full bg-emerald-400" animate={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
            <Card className="bg-zinc-950/90 border-zinc-800 rounded-2xl mb-6 shadow-2xl">
              <CardContent className="p-6 md:p-8">
                {/* Meta badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                    {q.category || q.domain || "Ciberseguridad"}
                  </span>
                  <div className="flex gap-2">
                    {q.mitre_attack_id && (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-black uppercase">
                        MITRE {q.mitre_attack_id}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] font-bold uppercase">
                      {q.difficulty || "Media"}
                    </span>
                  </div>
                </div>

                <h2 className="text-lg md:text-xl font-bold leading-relaxed text-white mb-6">
                  {q.prompt}
                </h2>

                {/* Options list */}
                <div className="space-y-3">
                  {(q.options || []).map((opt, i) => {
                    const isSelected = currentFeedback?.selectedOptionId === opt.id;
                    const isCorrectAnswer = currentFeedback?.correctOptionIds?.includes(opt.id);
                    const isWrongAnswer = isSelected && !currentFeedback?.isCorrect;

                    let borderBgClass = "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900";
                    if (currentFeedback) {
                      if (isCorrectAnswer) {
                        borderBgClass = "border-emerald-500 bg-emerald-500/15 text-white shadow-[0_0_20px_rgba(52,211,153,.15)]";
                      } else if (isWrongAnswer) {
                        borderBgClass = "border-red-500 bg-red-500/15 text-white";
                      } else {
                        borderBgClass = "border-zinc-800/60 bg-zinc-950/40 text-zinc-500 opacity-60";
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        disabled={Boolean(currentFeedback) || isSubmittingAnswer}
                        onClick={() => submitAdaptiveAnswer(opt.id)}
                        className={`w-full text-left p-4 rounded-xl border flex items-start gap-3 transition-all cursor-pointer disabled:cursor-default ${borderBgClass}`}
                      >
                        <span className={`shrink-0 h-8 w-8 rounded-lg grid place-items-center text-xs font-black mt-0.5 ${
                          currentFeedback && isCorrectAnswer
                            ? "bg-emerald-400 text-black"
                            : currentFeedback && isWrongAnswer
                            ? "bg-red-500 text-white"
                            : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {letter(i)}
                        </span>
                        <div className="flex-1 text-sm md:text-base leading-snug">
                          {opt.text}
                          {/* Option specific rationale from backend */}
                          {currentFeedback && currentFeedback.rationales?.[opt.id] && (
                            <p className={`text-xs mt-2 font-medium ${isCorrectAnswer ? "text-emerald-300/90" : "text-zinc-400"}`}>
                              ↳ {currentFeedback.rationales[opt.id]}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Authoritative Feedback Card (shown immediately after answer) */}
            {currentFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border mb-6 ${
                  currentFeedback.isCorrect
                    ? "border-emerald-500/30 bg-emerald-500/[.07]"
                    : "border-red-500/30 bg-red-500/[.07]"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    {currentFeedback.isCorrect ? (
                      <CheckCircle2 size={20} className="text-emerald-400" />
                    ) : (
                      <XCircle size={20} className="text-red-400" />
                    )}
                    <span className={`text-sm font-black uppercase tracking-wider ${
                      currentFeedback.isCorrect ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {currentFeedback.isCorrect ? "Respuesta Correcta (+15 XP)" : "Respuesta Incorrecta (+5 XP)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                    <TrendingUp size={14} className="text-emerald-400" />
                    Maestría: <span className="text-white font-black">{currentFeedback.masteryScore}%</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {currentFeedback.explanation}
                </p>

                {currentFeedback.nextReviewInDays && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw size={13} className="text-cyan-400" /> Intervalo SM-2: Próximo repaso en {currentFeedback.nextReviewInDays} días
                    </span>
                    <span className="text-emerald-400 font-bold">Concepto actualizado en banco central</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Bottom Actions */}
            <div className="flex justify-end mt-4">
              {currentFeedback ? (
                <Button
                  onClick={nextAdaptiveQuestion}
                  className="bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold rounded-xl px-8 h-12"
                >
                  {adaptiveIndex === adaptiveQuestions.length - 1 ? "Finalizar y Ver Progreso" : "Siguiente Pregunta"}{" "}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  Selecciona una opción para validar autoritativamente tu respuesta.
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  }

  // CLASSIC MODE QUIZ
  const q = questions[index];
  const selected = answers[index] || [];
  const progress = (index / (questions.length || 1)) * 100;
  const isMultiple = q?.[2]?.length > 1;

  const [timeLeft, setTimeLeft] = useState(levelInfo?.timePerQuestion || 20);

  useEffect(() => {
    setTimeLeft(levelInfo?.timePerQuestion || 20);
  }, [index, levelInfo?.timePerQuestion]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleClassicNext(true);
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const toggleClassicOption = (i) => {
    setAnswers((prev) => {
      const current = prev[index] || [];
      if (!isMultiple) return { ...prev, [index]: [i] };
      if (current.includes(i)) return { ...prev, [index]: current.filter((x) => x !== i) };
      return { ...prev, [index]: [...current, i] };
    });
  };

  const handleClassicNext = (isTimeout = false) => {
    const ans = answers[index] || [];
    const isCorrect = ans.length === q[2].length && ans.every((v) => q[2].includes(v));

    if (suddenDeath && !isCorrect) {
      finishClassic(true);
      return;
    }

    if (index === questions.length - 1) {
      finishClassic();
    } else {
      setAnswers((prev) => prev);
    }
  };

  const isLowTime = timeLeft <= 10;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={goHome} className="text-sm text-zinc-500 hover:text-white flex items-center gap-2 cursor-pointer">
          <ArrowLeft size={16} /> Rendirse
        </button>
        <div className="flex gap-3">
          {suddenDeath && (
            <span className="rounded-lg bg-red-900/30 border border-red-500/50 px-3 py-1.5 text-xs text-red-400 font-bold flex items-center gap-1.5">
              <Skull size={13} /> Muerte Súbita
            </span>
          )}
          <span className={`rounded-lg border px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors ${
            isLowTime ? "bg-red-500/10 border-red-500 text-red-400 animate-pulse" : "bg-zinc-900 border-zinc-800 text-zinc-400"
          }`}>
            <Timer size={14} /> {timeLeft}s
          </span>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-zinc-500">Desafío {index + 1} de {questions.length}</span>
          <span className="text-emerald-400 font-bold">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
          <motion.div className="h-full bg-emerald-400" animate={{ width: `${progress}%` }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card className="bg-zinc-950/90 border-zinc-800 rounded-2xl">
            <CardContent className="p-5 md:p-8">
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs font-bold tracking-widest text-emerald-400">DESAFÍO {String(index + 1).padStart(2, "0")}</div>
                {isMultiple && (
                  <span className="px-2 py-1 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded text-[10px] font-black uppercase">
                    Múltiples Respuestas
                  </span>
                )}
              </div>

              <h2 className="text-lg md:text-xl font-bold leading-snug text-white mb-6">{q[0]}</h2>

              <div className="space-y-3">
                {q[1].map((option, i) => {
                  const isSelected = selected.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleClassicOption(i)}
                      aria-pressed={isSelected}
                      className={`w-full min-h-14 text-left p-4 rounded-xl border flex gap-3 items-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-400/10 text-white shadow-[0_0_18px_rgba(52,211,153,.08)]"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      <span className={`shrink-0 h-8 w-8 rounded-lg grid place-items-center text-xs font-black ${
                        isSelected ? "bg-emerald-400 text-black" : "bg-zinc-800 text-zinc-500"
                      }`}>
                        {letter(i)}
                      </span>
                      <span className="text-sm md:text-base">{option}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end mt-6">
        <Button
          disabled={selected.length === 0}
          onClick={() => handleClassicNext(false)}
          className="bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-extrabold rounded-xl px-8"
        >
          {index === questions.length - 1 ? "Analizar resultados" : "Siguiente"} <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// RESULT SCREEN (Closed Loop with Battle 1v1 CTA)
// ============================================================================

function ResultScreen({
  trainingMode,
  category,
  trackName,
  level,
  levelInfo,
  questions,
  scoreData,
  sessionXpTotal,
  elapsed,
  formatTime,
  verdict,
  restart,
  startAdaptiveSession,
  goHome,
  onNavigate,
  deathOccurred,
  masteryAnalytics,
}) {
  const [title, subtitle, VerdictIcon] = verdict;
  const weakestTopic = masteryAnalytics?.weakestTopics?.[0];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto">
      {/* Header */}
      <section className="text-center mb-9">
        <div className={`mx-auto h-20 w-20 rounded-3xl border grid place-items-center mb-5 ${
          deathOccurred
            ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_50px_rgba(239,68,68,.12)]"
            : "bg-emerald-400/10 border-emerald-400/20 text-emerald-400 shadow-[0_0_50px_rgba(52,211,153,.12)]"
        }`}>
          <VerdictIcon size={38} />
        </div>
        <div className={`text-xs tracking-[.2em] font-bold mb-2 ${deathOccurred ? "text-red-400" : "text-emerald-400"}`}>
          {deathOccurred ? "DESAFÍO FALLIDO" : "SESIÓN DE ENTRENAMIENTO COMPLETADA"}
        </div>
        <h1 className="text-3xl md:text-5xl font-black">{title}</h1>
        <p className="text-zinc-400 mt-2 text-sm">{subtitle}</p>
      </section>

      {/* Metrics Row */}
      <div className="grid md:grid-cols-[1.3fr_.7fr] gap-5 mb-6">
        <Card className="bg-zinc-950/90 border-zinc-800 rounded-2xl">
          <CardContent className="p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Precisión de Retención</p>
                <div className="text-5xl font-black text-white mt-1">
                  {scoreData.correctCount}
                  <span className="text-xl text-zinc-600">/{scoreData.totalQuestions} aciertos</span>
                </div>
                {trainingMode === "adaptive" && (
                  <p className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1.5">
                    <Zap size={14} /> +{sessionXpTotal || scoreData.correctCount * 15} XP añadidos a tu perfil
                  </p>
                )}
              </div>
              <div className={`h-24 w-24 rounded-full grid place-items-center border-[7px] ${
                scoreData.percentage < 50 ? "border-red-400 bg-red-400/5" : "border-emerald-400 bg-emerald-400/5"
              }`}>
                <span className={`text-xl font-black ${scoreData.percentage < 50 ? "text-red-400" : "text-emerald-400"}`}>
                  {scoreData.percentage}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scoreData.percentage}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full ${scoreData.percentage < 50 ? "bg-red-400" : "bg-emerald-400"}`}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <Stat icon={Clock3} label="Tiempo Invertido" value={formatTime(elapsed)} />
          <Stat icon={TrendingUp} label="Maestría Estimada" value={`${masteryAnalytics?.overallMastery ?? 70}%`} />
        </div>
      </div>

      {/* Closed Loop Callout: Enter Battle 1v1 */}
      <div className="p-6 rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 via-zinc-950 to-zinc-950 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400 mb-1">
            <Swords size={15} /> Puente Competitivo Battle 1v1
          </div>
          <h3 className="text-lg font-black text-white">¿Listo para poner a prueba tu criterio contra otro analista?</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Has entrenado con el mismo banco central de preguntas. Entra al matchmaking para competir por Rating y ascender de rango.
          </p>
        </div>
        <button
          onClick={() => onNavigate && onNavigate("battle")}
          className="h-12 px-6 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs flex items-center gap-2 shrink-0 transition-colors cursor-pointer shadow-[0_0_25px_rgba(52,211,153,0.3)]"
        >
          <Swords size={16} /> ENTRAR A BATTLE 1V1 <ChevronRight size={15} />
        </button>
      </div>

      {/* Weak Topic Target CTA (if available) */}
      {weakestTopic && weakestTopic.mastery < 75 && (
        <div className="p-5 rounded-2xl border border-amber-400/30 bg-amber-400/[.06] mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400/10 text-amber-400 grid place-items-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-amber-400">Punto débil prioritario</div>
              <div className="text-sm font-bold text-white">
                {weakestTopic.name} ({weakestTopic.mastery}% de maestría)
              </div>
            </div>
          </div>
          <Button
            onClick={() => startAdaptiveSession("weak_topics", weakestTopic.name)}
            className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs"
          >
            Reforzar Este Tema <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      )}

      {/* Review of Questions */}
      <Card className="bg-zinc-950/90 border-zinc-800 rounded-2xl mb-6">
        <CardContent className="p-6">
          <h3 className="font-bold flex items-center gap-2 mb-5 text-white">
            <Search size={18} className="text-emerald-400" /> Desglose de Desafíos Realizados
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {trainingMode === "adaptive" ? (
              questions.map((record, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    record.isCorrect ? "border-emerald-400/15 bg-emerald-400/[.04]" : "border-red-400/15 bg-red-400/[.04]"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {record.isCorrect ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{i + 1}. {record.question?.prompt}</p>
                      <p className="text-[10px] font-bold mt-1 tracking-wider uppercase text-zinc-500">
                        {record.isCorrect ? "+15 XP (CORRECTA)" : "+5 XP (REPASO RETENIDO)"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{record.explanation}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              questions.map((q, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
                  <p className="text-sm font-semibold text-zinc-200">{i + 1}. {q[0]}</p>
                  <p className="text-xs text-zinc-400 mt-2">{q[3]}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={restart} className="bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold rounded-xl">
          <RefreshCcw size={16} className="mr-2" /> Otra Sesión de Entrenamiento
        </Button>
        <Button onClick={goHome} className="border border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-xl">
          <Home size={16} className="mr-2" /> Volver al Menú
        </Button>
      </div>
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-emerald-400/10 text-emerald-400 grid place-items-center">
        <Icon size={19} />
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="font-black text-white">{value}</p>
      </div>
    </div>
  );
}
