import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NETWORK_QUESTIONS } from "../../data/networkQuestions.js";
import { FORENSICS_QUESTIONS } from "../../data/forensicsQuestions.js";
import { CYBER_QUESTIONS } from "../../data/cyberQuestions.js";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Cable,
  CheckCircle2,
  Clock3,
  Fingerprint,
  GraduationCap,
  LockKeyhole,
  Network,
  RefreshCcw,
  Router,
  Search,
  ShieldCheck,
  Skull,
  Target,
  Trophy,
  Waypoints,
  XCircle,
  Zap,
} from "lucide-react";

const LEVELS = {
  facil: { name: "Fácil", subtitle: "Fundamentos esenciales", description: "Conceptos básicos y situaciones introductorias.", icon: ShieldCheck, timePerQuestion: 20 },
  medio: { name: "Medio", subtitle: "Defensa y análisis", description: "Aplicación de conceptos y toma de decisiones técnicas.", icon: Target, timePerQuestion: 20 },
  dificil: { name: "Difícil", subtitle: "Decisiones profesionales", description: "Escenarios avanzados de análisis y resolución.", icon: LockKeyhole, timePerQuestion: 30 },
  extraDificil: { name: "Extra difícil", subtitle: "Desafío de élite", description: "Retos de alta complejidad para usuarios experimentados.", icon: Zap, timePerQuestion: 30 },
};

const NETWORK_LEVELS = {
  facil: { ...LEVELS.facil, subtitle: "Fundamentos de red", description: "OSI, dispositivos, medios, protocolos y direccionamiento esencial.", icon: Cable },
  medio: { ...LEVELS.medio, subtitle: "Administración y conectividad", description: "Subnetting, VLAN, switching, routing, servicios IP y Wi-Fi.", icon: Router },
  dificil: { ...LEVELS.dificil, subtitle: "Diagnóstico profesional", description: "Troubleshooting de routing, infraestructura y servicios de red.", icon: Network },
  extraDificil: { ...LEVELS.extraDificil, subtitle: "Infraestructura experta", description: "Escenarios multi-protocolo y diseño de redes complejas.", icon: Waypoints },
};

const FORENSICS_LEVELS = {
  facil: { ...LEVELS.facil, subtitle: "Fundamentos forenses", description: "Evidencia digital, cadena de custodia, adquisición y preservación.", icon: Search },
  medio: { ...LEVELS.medio, subtitle: "Artefactos y procedimientos", description: "Artefactos de sistemas, herramientas y procedimientos de análisis.", icon: Fingerprint },
  dificil: { ...LEVELS.dificil, subtitle: "Investigación avanzada", description: "Timeline, sistemas de archivos, memoria y anti-forense.", icon: GraduationCap },
  extraDificil: { ...LEVELS.extraDificil, subtitle: "Peritaje de élite", description: "Casos avanzados de análisis forense y técnicas anti-forense.", icon: Award },
};

const TRACKS = {
  ciberseguridad: {
    name: "Ciberseguridad",
    eyebrow: "Defensa, riesgo y respuesta",
    description: "Pon a prueba tus conocimientos de seguridad, amenazas, controles, identidad y respuesta a incidentes.",
    icon: ShieldCheck,
    levels: LEVELS,
    questions: CYBER_QUESTIONS,
  },
  redes: {
    name: "Redes",
    eyebrow: "Conectividad e infraestructura",
    description: "Practica desde fundamentos de red hasta escenarios avanzados de routing, switching y servicios.",
    icon: Network,
    levels: NETWORK_LEVELS,
    questions: NETWORK_QUESTIONS,
  },
  forense: {
    name: "Informática Forense",
    eyebrow: "Evidencia, análisis e investigación",
    description: "Practica adquisición, preservación, artefactos, memoria y análisis de evidencia digital.",
    icon: Fingerprint,
    levels: FORENSICS_LEVELS,
    questions: FORENSICS_QUESTIONS,
  },
};

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function prepareQuestions(source = []) {
  return shuffle(
    source.map(([prompt, options, correct, explanation]) => {
      const correctIndexes = Array.isArray(correct) ? correct : [correct];
      const optionObjects = options.map((text, index) => ({ text, isCorrect: correctIndexes.includes(index) }));
      const shuffled = shuffle(optionObjects);
      return {
        prompt,
        options: shuffled.map((item) => item.text),
        correctIndexes: shuffled.map((item, index) => (item.isCorrect ? index : -1)).filter((index) => index >= 0),
        explanation: explanation || "",
      };
    })
  );
}

const letter = (index) => String.fromCharCode(65 + index);

export default function TrainingSection({ initialCategory = "ciberseguridad" }) {
  const [screen, setScreen] = useState("home");
  const [category, setCategory] = useState(TRACKS[initialCategory] ? initialCategory : "ciberseguridad");
  const [level, setLevel] = useState(null);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [deathOccurred, setDeathOccurred] = useState(false);

  useEffect(() => {
    if (TRACKS[initialCategory]) setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (screen !== "quiz" || !startedAt) return undefined;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [screen, startedAt]);

  const track = TRACKS[category];
  const levelInfo = level ? track.levels[level] : null;

  const startQuiz = (levelKey) => {
    const source = track.questions[levelKey] || [];
    setLevel(levelKey);
    setQuestions(prepareQuestions(source));
    setAnswers({});
    setCurrentIndex(0);
    setElapsed(0);
    setDeathOccurred(false);
    setStartedAt(Date.now());
    setScreen("quiz");
  };

  const toggleAnswer = (questionIndex, optionIndex) => {
    const question = questions[questionIndex];
    if (!question) return;
    const allowsMultiple = question.correctIndexes.length > 1;
    const previous = answers[questionIndex] || [];
    const next = allowsMultiple
      ? previous.includes(optionIndex)
        ? previous.filter((item) => item !== optionIndex)
        : [...previous, optionIndex]
      : [optionIndex];
    setAnswers((state) => ({ ...state, [questionIndex]: next }));
  };

  const isAnswerCorrect = (questionIndex) => {
    const question = questions[questionIndex];
    const selected = answers[questionIndex] || [];
    return selected.length === question.correctIndexes.length && selected.every((item) => question.correctIndexes.includes(item));
  };

  const submitCurrent = () => {
    if (!answers[currentIndex]?.length) return;
    if (suddenDeath && !isAnswerCorrect(currentIndex)) {
      setDeathOccurred(true);
      setScreen("result");
      return;
    }
    if (currentIndex >= questions.length - 1) setScreen("result");
    else setCurrentIndex((index) => index + 1);
  };

  const scoreData = useMemo(() => {
    let correctCount = 0;
    let points = 0;
    questions.forEach((_, index) => {
      if (!answers[index]?.length) return;
      if (isAnswerCorrect(index)) {
        correctCount += 1;
        points += 10;
      } else {
        points -= 5;
      }
    });
    const percentage = questions.length ? Math.max(0, Math.round((correctCount / questions.length) * 100)) : 0;
    return { correctCount, points, percentage, total: questions.length };
  }, [answers, questions]);

  const resetHome = () => {
    setScreen("home");
    setLevel(null);
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setDeathOccurred(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <HomeScreen
            category={category}
            setCategory={setCategory}
            track={track}
            suddenDeath={suddenDeath}
            setSuddenDeath={setSuddenDeath}
            startQuiz={startQuiz}
          />
        )}

        {screen === "quiz" && (
          <QuizScreen
            track={track}
            levelInfo={levelInfo}
            question={questions[currentIndex]}
            currentIndex={currentIndex}
            total={questions.length}
            selected={answers[currentIndex] || []}
            toggleAnswer={(optionIndex) => toggleAnswer(currentIndex, optionIndex)}
            submitCurrent={submitCurrent}
            elapsed={elapsed}
            onBack={resetHome}
          />
        )}

        {screen === "result" && (
          <ResultScreen
            track={track}
            levelInfo={levelInfo}
            questions={questions}
            answers={answers}
            scoreData={scoreData}
            elapsed={elapsed}
            deathOccurred={deathOccurred}
            restart={() => startQuiz(level)}
            goHome={resetHome}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function HomeScreen({ category, setCategory, track, suddenDeath, setSuddenDeath, startQuiz }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <header className="mb-8">
        <span className="text-[11px] font-black uppercase tracking-[.22em] text-emerald-400">Training</span>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mt-2">Entrena a tu ritmo.</h1>
        <p className="text-sm text-zinc-400 mt-3 max-w-2xl">
          Elige una especialidad y una dificultad. Sin ranking, sin matchmaking y sin presión competitiva.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {Object.entries(TRACKS).map(([id, item]) => {
          const Icon = item.icon;
          const selected = id === category;
          return (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`text-left p-5 rounded-2xl border transition-all ${selected ? "border-emerald-400 bg-emerald-400/[.06]" : "border-zinc-800 bg-[#090d0a] hover:border-zinc-700"}`}
            >
              <Icon size={22} className={selected ? "text-emerald-400" : "text-zinc-500"} />
              <h2 className="text-base font-black text-white mt-4">{item.name}</h2>
              <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 mt-1">{item.eyebrow}</p>
              <p className="text-xs text-zinc-400 leading-relaxed mt-3">{item.description}</p>
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 md:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">{track.name}</p>
            <h2 className="text-xl font-black text-white mt-1">Selecciona dificultad</h2>
          </div>
          <button
            onClick={() => setSuddenDeath((value) => !value)}
            className={`px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-2 transition-colors ${suddenDeath ? "border-red-400/50 bg-red-400/10 text-red-300" : "border-zinc-800 bg-zinc-950 text-zinc-400"}`}
          >
            <Skull size={15} /> Muerte súbita: {suddenDeath ? "ON" : "OFF"}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(track.levels).map(([key, item]) => {
            const Icon = item.icon;
            const count = track.questions[key]?.length || 0;
            return (
              <button key={key} onClick={() => startQuiz(key)} className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/70 hover:border-emerald-400/50 text-left transition-all group">
                <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 grid place-items-center group-hover:text-emerald-400">
                  <Icon size={19} />
                </div>
                <h3 className="font-black text-white mt-4">{item.name}</h3>
                <p className="text-xs font-bold text-zinc-500 mt-1">{item.subtitle}</p>
                <p className="text-xs text-zinc-400 leading-relaxed mt-3">{item.description}</p>
                <div className="text-[10px] font-bold text-emerald-400 mt-4">{count} preguntas</div>
              </button>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}

function QuizScreen({ track, levelInfo, question, currentIndex, total, selected, toggleAnswer, submitCurrent, elapsed, onBack }) {
  if (!question) return null;
  const progress = total ? ((currentIndex + 1) / total) * 100 : 0;
  const multi = question.correctIndexes.length > 1;

  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-5">
        <button onClick={onBack} className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-2"><ArrowLeft size={15} /> Volver</button>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{track.name}</span><span>·</span><span>{levelInfo?.name}</span><span>·</span><span className="font-mono flex items-center gap-1"><Clock3 size={13} /> {formatTime(elapsed)}</span>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden mb-6"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>

      <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 md:p-8 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-5">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Pregunta {currentIndex + 1} de {total}</span>
          {multi && <span className="text-[10px] font-black rounded-full px-2.5 py-1 bg-amber-400/10 text-amber-300 border border-amber-400/20">SELECCIÓN MÚLTIPLE</span>}
        </div>
        <h2 className="text-lg md:text-2xl font-bold text-white leading-relaxed mb-7">{question.prompt}</h2>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            const active = selected.includes(index);
            return (
              <button key={`${index}-${option}`} onClick={() => toggleAnswer(index)} className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${active ? "border-emerald-400 bg-emerald-400/10 text-white" : "border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700"}`}>
                <span className={`h-8 w-8 rounded-lg shrink-0 grid place-items-center text-xs font-black ${active ? "bg-emerald-400 text-black" : "bg-zinc-900 text-zinc-400"}`}>{letter(index)}</span>
                <span className="text-sm md:text-base leading-relaxed pt-1">{option}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex justify-end">
          <button disabled={!selected.length} onClick={submitCurrent} className="h-12 px-6 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-sm flex items-center gap-2">
            {currentIndex >= total - 1 ? "Finalizar" : "Siguiente"} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ResultScreen({ track, levelInfo, questions, answers, scoreData, elapsed, deathOccurred, restart, goHome }) {
  const title = deathOccurred ? "Muerte súbita" : scoreData.percentage >= 85 ? "Excelente dominio" : scoreData.percentage >= 70 ? "Buen rendimiento" : "Sigue entrenando";
  const Icon = deathOccurred ? Skull : scoreData.percentage >= 85 ? Trophy : scoreData.percentage >= 70 ? Award : GraduationCap;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-7 text-center">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 grid place-items-center"><Icon size={27} /></div>
        <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mt-4">{track.name} · {levelInfo?.name}</p>
        <h1 className="text-3xl font-black text-white mt-2">{title}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7 text-left">
          <Metric label="Precisión" value={`${scoreData.percentage}%`} />
          <Metric label="Correctas" value={`${scoreData.correctCount}/${scoreData.total}`} />
          <Metric label="Puntos" value={scoreData.points} />
          <Metric label="Tiempo" value={formatTime(elapsed)} />
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7">
          <button onClick={restart} className="h-11 px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black flex items-center justify-center gap-2"><RefreshCcw size={15} /> Reintentar</button>
          <button onClick={goHome} className="h-11 px-5 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 text-xs font-black">Volver a Training</button>
        </div>
      </div>

      {!deathOccurred && (
        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500">Revisión de respuestas</h2>
          {questions.map((question, index) => {
            const selected = answers[index] || [];
            const correct = selected.length === question.correctIndexes.length && selected.every((item) => question.correctIndexes.includes(item));
            return (
              <div key={index} className="rounded-xl border border-zinc-800 bg-[#090d0a] p-5">
                <div className="flex items-start gap-3">
                  {correct ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-sm font-bold text-white">{question.prompt}</p>
                    <p className="text-xs text-zinc-400 mt-2">Respuesta correcta: <span className="text-zinc-200">{question.correctIndexes.map((i) => question.options[i]).join(" · ")}</span></p>
                    {question.explanation && <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{question.explanation}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function Metric({ label, value }) {
  return <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800"><div className="text-[10px] uppercase font-black tracking-wider text-zinc-500">{label}</div><div className="text-xl font-black text-white mt-1">{value}</div></div>;
}

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
