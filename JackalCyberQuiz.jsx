import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NETWORK_QUESTIONS } from "./src/data/networkQuestions.js";
import { FORENSICS_QUESTIONS } from "./src/data/forensicsQuestions.js";
import { CYBER_QUESTIONS } from "./src/data/cyberQuestions.js";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
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
  Timer
} from "lucide-react";

function Button({ className = "", children, type = "button", ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center px-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
    name: "Ciberseguridad", eyebrow: "Defensa, riesgo y ataque ético", description: "Evalúa tu criterio para proteger identidades, aplicaciones, infraestructura y datos.", icon: ShieldCheck, levels: LEVELS, questions: CYBER_QUESTIONS, sources: "CISSP, CCSP, CISM, OSCP y GCIH",
  },
  redes: {
    name: "Redes", eyebrow: "Conectividad e infraestructura", description: "Domina desde los fundamentos IP hasta el diagnóstico de redes empresariales complejas.", icon: Network, levels: NETWORK_LEVELS, questions: NETWORK_QUESTIONS, sources: "Network+, CCNA, JNCIA-Junos, CCNP Enterprise y CCIE Enterprise Infrastructure",
  },
  forense: {
    name: "Informática Forense", eyebrow: "Evidencia, análisis e investigación", description: "Domina la adquisición, preservación y análisis de evidencia digital con rigor pericial.", icon: Fingerprint, levels: FORENSICS_LEVELS, questions: FORENSICS_QUESTIONS, sources: "ISO 27037, ISO 27041, ISO 27042, ISO 27043, RFC 3227, NIST SP 800-86, GCFE, GCFA, CHFI y EnCE",
  },
};

const letter = (i) => String.fromCharCode(65 + i);

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function prepareQuestions(source) {
  return shuffle(source.map(([prompt, options, correct, explanation]) => {
    // Soporte para respuestas múltiples
    const correctArray = Array.isArray(correct) ? correct : [correct];
    
    // Mapear opciones originales con su flag de si es correcta
    const optionsWithFlags = options.map((option, idx) => ({ 
      option, 
      isCorrect: correctArray.includes(idx) 
    }));
    
    // Aleatorizar opciones
    const shuffledOptions = shuffle(optionsWithFlags);
    
    return [
      prompt,
      shuffledOptions.map(o => o.option),
      // Almacenar los nuevos índices correctos tras el shuffle
      shuffledOptions.map((o, i) => o.isCorrect ? i : -1).filter(i => i !== -1),
      explanation,
    ];
  }));
}

export default function JackalCyberQuiz() {
  const [screen, setScreen] = useState("home");
  const [category, setCategory] = useState("ciberseguridad");
  const [level, setLevel] = useState(null);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [deathOccurred, setDeathOccurred] = useState(false);

  useEffect(() => {
    if (screen !== "quiz" || !startedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [screen, startedAt]);

  // Scoring Logic: +10 acierto, -5 fallo, 0 vacío
  const scoreData = useMemo(() => {
    let points = 0;
    let correctCount = 0;
    const maxScore = questions.length * 10;
    
    for (let i = 0; i < questions.length; i++) {
      if (i > index && screen !== "result") break;
      if (answers[i] === undefined) continue; // Timeout / Skipped
      
      const q = questions[i];
      const ans = answers[i];
      const isCorrect = Array.isArray(ans) && ans.length === q[2].length && ans.every(v => q[2].includes(v));
      
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
      percentage: questions.length ? Math.max(0, Math.round((correctCount / questions.length) * 100)) : 0,
      totalPts: questions.length * 10,
      totalQuestions: questions.length
    };
  }, [answers, questions, index, screen]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const activeTrack = TRACKS[category];
  const activeLevel = level ? activeTrack.levels[level] : null;

  const start = (key) => {
    setLevel(key); 
    setQuestions(prepareQuestions(activeTrack.questions[key])); 
    setIndex(0); 
    setAnswers({}); 
    setElapsed(0); 
    setDeathOccurred(false);
    setStartedAt(Date.now()); 
    setScreen("quiz");
  };

  const finish = (died = false) => {
    if (died) setDeathOccurred(true);
    setScreen("result");
  };

  const goHome = () => { setScreen("home"); setLevel(null); setQuestions([]); setAnswers({}); };
  const verdict = deathOccurred 
    ? ["Muerte Súbita", "Un error te costó el desafío. Debes ser perfecto.", Skull] 
    : scoreData.percentage >= 85 
    ? ["Dominio sobresaliente", "Estás listo para asumir retos mayores.", Trophy] 
    : scoreData.percentage >= 70 
    ? ["Buen trabajo", "Tienes una base sólida. Revisa los puntos fallados.", Award] 
    : scoreData.percentage >= 50 
    ? ["Vas por buen camino", "Refuerza algunos conceptos y vuelve a intentarlo.", GraduationCap] 
    : ["Sigue entrenando", "Cada intento fortalece tu criterio técnico.", RefreshCcw];

  return (
    <div className="min-h-screen bg-[#050806] text-zinc-100 selection:bg-emerald-400 selection:text-black">
      <div className="fixed inset-0 pointer-events-none opacity-30" style={{ backgroundImage: "linear-gradient(rgba(34,197,94,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,.04) 1px,transparent 1px)", backgroundSize: "42px 42px" }} />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 h-72 w-2/3 bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <header className="relative z-10 border-b border-emerald-400/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Volver al inicio de Jackal">
            <div className="h-10 w-10 rounded-xl bg-emerald-400 text-black grid place-items-center shadow-[0_0_24px_rgba(52,211,153,.3)]"><ShieldCheck size={23} /></div>
            <div><div className="font-black tracking-tight leading-none">JACKAL</div><div className="text-[10px] tracking-[.22em] text-emerald-400 mt-1">CYBERSECURITY COMMUNITY</div></div>
          </button>
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Prueba de Conocimientos</div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-10 md:py-16">
        <AnimatePresence mode="wait">
          {screen === "home" && <HomeScreen start={start} category={category} setCategory={setCategory} suddenDeath={suddenDeath} setSuddenDeath={setSuddenDeath} />}
          {screen === "quiz" && <QuizScreen levelInfo={activeLevel} questions={questions} index={index} setIndex={setIndex} answers={answers} setAnswers={setAnswers} finish={finish} elapsed={elapsed} formatTime={formatTime} suddenDeath={suddenDeath} goHome={goHome} />}
          {screen === "result" && <ResultScreen category={category} trackName={activeTrack.name} level={level} levelInfo={activeLevel} questions={deathOccurred ? questions.slice(0, index + 1) : questions} answers={answers} scoreData={scoreData} elapsed={elapsed} formatTime={formatTime} verdict={verdict} restart={() => start(level)} goHome={goHome} suddenDeath={suddenDeath} deathOccurred={deathOccurred} />}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 max-w-6xl mx-auto px-5 py-8 border-t border-zinc-900 text-xs text-zinc-600 flex flex-col sm:flex-row gap-2 justify-between"><span>© 2026 Jackal Cybersecurity Community</span><span>Aprende · Practica · Protege</span></footer>
    </div>
  );
}

function HomeScreen({ start, category, setCategory, suddenDeath, setSuddenDeath }) {
  const track = TRACKS[category];
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
    <section className="text-center max-w-3xl mx-auto mb-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-semibold text-emerald-300 mb-6"><Zap size={14}/> Plataforma hardcore de conocimiento</div>
      <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">Domina cada <span className="text-emerald-400">capa.</span></h1>
    </section>

    <div className="mx-auto mb-6 grid max-w-4xl sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Especialidades disponibles">
      {Object.entries(TRACKS).map(([key, item]) => { const TrackIcon = item.icon; const active = category === key; return <button key={key} onClick={() => setCategory(key)} aria-pressed={active} className={`rounded-2xl border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${active ? "border-emerald-400/60 bg-emerald-400/[.09] shadow-[0_0_28px_rgba(52,211,153,.08)]" : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-600"}`}>
        <div className="flex items-start gap-4"><div className={`h-11 w-11 shrink-0 rounded-xl grid place-items-center ${active ? "bg-emerald-400 text-black" : "bg-zinc-900 text-zinc-500"}`}><TrackIcon size={22}/></div><div><h2 className="font-black text-white">{item.name}</h2><p className="text-xs text-emerald-400 mt-1">{item.eyebrow}</p><p className="text-xs text-zinc-500 leading-relaxed mt-2">{item.description}</p></div></div>
      </button> })}
    </div>
    
    <div className="max-w-4xl mx-auto mb-12 flex flex-col items-center">
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${suddenDeath ? 'bg-red-500' : 'bg-zinc-700'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${suddenDeath ? 'translate-x-6' : 'translate-x-1'}`} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold flex items-center gap-2"><Skull size={14} className={suddenDeath ? 'text-red-400' : 'text-zinc-500'}/> Modo Muerte Súbita</span>
          {!suddenDeath && <span className="text-[10px] text-zinc-500 mt-0.5">Actívalo bajo tu propio riesgo</span>}
        </div>
        <input type="checkbox" className="sr-only" checked={suddenDeath} onChange={(e) => setSuddenDeath(e.target.checked)} />
      </label>
      
      <AnimatePresence>
        {suddenDeath && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden w-full max-w-md mt-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-left shadow-[0_0_20px_rgba(239,68,68,.08)]">
              <h4 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><Zap size={14}/> Funcionamiento Extremo</h4>
              <ul className="text-xs text-red-200/70 space-y-2 list-disc pl-4">
                <li><strong className="text-red-300">Margen de error nulo:</strong> Debes obtener 100% de precisión.</li>
                <li><strong className="text-red-300">Expulsión inmediata:</strong> Al primer fallo, la evaluación termina en ese mismo instante.</li>
                <li><strong className="text-red-300">Sin segundas oportunidades:</strong> No podrás ver las preguntas restantes.</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    <motion.section key={category} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
      <div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[.18em] text-emerald-400 uppercase">Ruta seleccionada</p><h2 className="mt-2 text-3xl font-black text-white">{track.name}</h2></div><span className="hidden sm:block text-xs text-zinc-600">4 niveles · {Object.values(track.questions).reduce((sum, arr) => sum + arr.length, 0)} preguntas</span></div>
      <div className="grid md:grid-cols-2 gap-5">
        {Object.entries(track.levels).map(([key, item], i) => { const Icon = item.icon; return <motion.div key={key} initial={{ opacity:0,y:20 }} animate={{opacity:1,y:0}} transition={{delay:i*.08}} whileHover={{y:-5}}>
          <Card className="h-full bg-zinc-950/80 border-zinc-800 hover:border-emerald-400/50 rounded-2xl overflow-hidden transition-colors group">
            <CardContent className="p-0">
              <div className="h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />
              <div className="p-6">
                <div className="flex justify-between items-start mb-7"><div className="h-12 w-12 rounded-2xl bg-emerald-400/10 text-emerald-400 grid place-items-center border border-emerald-400/10"><Icon size={24}/></div><span className="text-xs font-bold text-zinc-500">NIVEL 0{i+1}</span></div>
                <h3 className="text-2xl font-black text-white">{item.name}</h3><p className="text-emerald-400 text-sm font-medium mt-1">{item.subtitle}</p><p className="text-zinc-500 text-sm leading-relaxed mt-4 min-h-[60px]">{item.description}</p>
                <div className="flex gap-4 my-6 text-xs text-zinc-400"><span className="flex gap-1.5 items-center"><Target size={14}/>20 preguntas</span><span className="flex gap-1.5 items-center"><Timer size={14}/>{item.timePerQuestion}s por reto</span></div>
                <Button onClick={() => start(key)} className="w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold h-11">Comenzar nivel <ChevronRight size={17} className="ml-1"/></Button>
              </div>
            </CardContent>
          </Card>
        </motion.div> })}
      </div>
      <div className="mt-10 grid sm:grid-cols-3 gap-4 text-center text-xs text-zinc-500"><div>✓ Penalización por fallo (-5 pts)</div><div>✓ Sin posibilidad de retroceder</div><div>✓ Ceguera de resultados (al final)</div></div>
      <p className="mt-7 text-center text-[11px] leading-relaxed text-zinc-600">Preguntas originales inspiradas en dominios públicos de {track.sources}. No reproducen preguntas oficiales ni implican afiliación con sus organizaciones.</p>
    </motion.section>
  </motion.div>
}

function QuizScreen({ levelInfo, questions, index, setIndex, answers, setAnswers, finish, elapsed, formatTime, suddenDeath, goHome }) {
  const q = questions[index]; 
  const selected = answers[index] || []; 
  const progress = ((index) / questions.length) * 100; // Unidirectional progress
  const answeredCount = index;
  const isMultiple = q[2].length > 1;

  // Temporizador por pregunta
  const [timeLeft, setTimeLeft] = useState(levelInfo.timePerQuestion);
  
  useEffect(() => {
    setTimeLeft(levelInfo.timePerQuestion);
  }, [index, levelInfo.timePerQuestion]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleNext(true);
      return;
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const toggleOption = (i) => {
    setAnswers(prev => {
      const current = prev[index] || [];
      if (!isMultiple) return { ...prev, [index]: [i] };
      if (current.includes(i)) return { ...prev, [index]: current.filter(x => x !== i) };
      return { ...prev, [index]: [...current, i] };
    });
  };

  const handleNext = (isTimeout = false) => {
    const ans = answers[index] || [];
    const isCorrect = ans.length === q[2].length && ans.every(v => q[2].includes(v));

    if (suddenDeath && !isCorrect) {
      finish(true); // Death occurred
      return;
    }

    if (index === questions.length - 1) {
      finish();
    } else {
      setIndex(index + 1);
    }
  };

  const isLowTime = timeLeft <= 10;

  return <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-3xl mx-auto">
    <div className="flex items-center justify-between mb-6">
      <button onClick={goHome} className="text-sm text-zinc-500 hover:text-white flex items-center gap-2"><ArrowLeft size={16}/> Rendirse</button>
      <div className="flex gap-3">
        {suddenDeath && <span className="rounded-lg bg-red-900/30 border border-red-500/50 px-3 py-1.5 text-xs text-red-400 font-bold flex items-center gap-1.5"><Skull size={13}/> Muerte Súbita</span>}
        <span className={`rounded-lg border px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors ${isLowTime ? 'bg-red-500/10 border-red-500 text-red-400 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
          <Timer size={14}/> {timeLeft}s
        </span>
      </div>
    </div>
    
    <div className="mb-8">
      <div className="flex justify-between text-xs mb-2"><span className="text-zinc-500">Desafío {index + 1} de {questions.length}</span><span className="text-emerald-400 font-bold">{Math.round(progress)}%</span></div>
      <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden" role="progressbar" aria-label="Progreso del cuestionario" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}><motion.div className="h-full bg-emerald-400" animate={{width:`${progress}%`}} /></div>
    </div>

    <AnimatePresence mode="wait">
      <motion.div key={index} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
        <Card className="bg-zinc-950/90 border-zinc-800 rounded-2xl">
          <CardContent className="p-5 md:p-8">
            <div className="flex justify-between items-start mb-4">
              <div className="text-xs font-bold tracking-widest text-emerald-400">DESAFÍO {String(index+1).padStart(2,"0")}</div>
              {isMultiple && <span className="px-2 py-1 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded text-[10px] font-black uppercase">Múltiples Respuestas</span>}
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold leading-snug text-white mb-7">{q[0]}</h2>
            
            <div className="space-y-3">
              {q[1].map((option, i) => {
                const isSelected = selected.includes(i);
                return (
                  <button key={i} onClick={() => toggleOption(i)} aria-pressed={isSelected} className={`w-full min-h-14 text-left p-4 rounded-xl border flex gap-3 items-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${isSelected ? "border-emerald-400 bg-emerald-400/10 text-white shadow-[0_0_18px_rgba(52,211,153,.08)]" : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"}`}>
                    <span className={`shrink-0 h-8 w-8 rounded-lg grid place-items-center text-xs font-black ${isSelected ? "bg-emerald-400 text-black" : "bg-zinc-800 text-zinc-500"}`}>{letter(i)}</span>
                    <span className="text-sm md:text-base">{option}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
    
    <div className="flex justify-end mt-6">
      <Button disabled={selected.length === 0} onClick={() => handleNext(false)} className="bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-extrabold rounded-xl px-8">
        {index === questions.length - 1 ? "Analizar resultados" : "Siguiente"} <ArrowRight size={16} className="ml-2"/>
      </Button>
    </div>
  </motion.div>
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.closePath();
}

function createResultCard({ levelName, points, totalPts, percentage, elapsed, title }) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("No se pudo preparar la tarjeta"));
      return;
    }

    const glow = context.createRadialGradient(960, 90, 10, 960, 90, 620);
    glow.addColorStop(0, "rgba(52, 211, 153, 0.22)");
    glow.addColorStop(1, "rgba(5, 8, 6, 0)");
    context.fillStyle = "#050806";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(52, 211, 153, 0.055)";
    context.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 48) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 48) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }

    roundedRect(context, 54, 48, 1092, 534, 34);
    context.fillStyle = "rgba(9, 14, 11, 0.94)";
    context.fill();
    context.strokeStyle = "rgba(52, 211, 153, 0.24)";
    context.lineWidth = 2;
    context.stroke();

    roundedRect(context, 92, 84, 62, 62, 17);
    context.fillStyle = "#34d399";
    context.fill();
    context.fillStyle = "#020604";
    context.font = "900 34px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("J", 123, 127);

    context.textAlign = "left";
    context.fillStyle = "#ffffff";
    context.font = "900 28px Inter, Arial, sans-serif";
    context.fillText("JACKAL", 176, 111);
    context.fillStyle = "#34d399";
    context.font = "700 12px Inter, Arial, sans-serif";
    context.fillText("CYBERSECURITY COMMUNITY", 176, 135);

    roundedRect(context, 904, 91, 190, 45, 22);
    context.fillStyle = "rgba(52, 211, 153, 0.11)";
    context.fill();
    context.strokeStyle = "rgba(52, 211, 153, 0.32)";
    context.stroke();
    context.fillStyle = "#6ee7b7";
    context.font = "800 16px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(`NIVEL ${levelName.toUpperCase()}`, 999, 120);

    context.textAlign = "left";
    context.fillStyle = "#71717a";
    context.font = "800 16px Inter, Arial, sans-serif";
    context.fillText("PUNTUACIÓN RIGUROSA", 94, 231);
    context.fillStyle = "#ffffff";
    context.font = "900 106px Inter, Arial, sans-serif";
    context.fillText(String(points), 88, 337);
    const scoreWidth = context.measureText(String(points)).width;
    context.fillStyle = "#52525b";
    context.font = "800 34px Inter, Arial, sans-serif";
    context.fillText(`/${totalPts} PTS`, 98 + scoreWidth, 333);

    context.fillStyle = "#e4e4e7";
    context.font = "800 31px Inter, Arial, sans-serif";
    context.fillText(title, 94, 406);
    context.fillStyle = "#a1a1aa";
    context.font = "500 19px Inter, Arial, sans-serif";
    context.fillText(`Completado en ${elapsed} · ¿Puedes superar mi resultado?`, 94, 444);

    context.beginPath();
    context.arc(902, 333, 112, 0, Math.PI * 2);
    context.strokeStyle = "#202522";
    context.lineWidth = 20;
    context.stroke();
    context.beginPath();
    context.arc(902, 333, 112, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (percentage / 100));
    context.strokeStyle = percentage < 50 ? "#ef4444" : "#34d399";
    context.lineCap = "round";
    context.stroke();
    context.fillStyle = "#ffffff";
    context.font = "900 50px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(`${percentage}%`, 902, 350);

    context.fillStyle = "#52525b";
    context.font = "700 15px Inter, Arial, sans-serif";
    context.textAlign = "left";
    context.fillText("APRENDE  ·  PRACTICA  ·  PROTEGE", 94, 536);

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar la imagen"));
    }, "image/png");
  });
}

async function copyResult(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function ResultScreen({ category, trackName, level, levelInfo, questions, answers, scoreData, elapsed, formatTime, verdict, restart, goHome, suddenDeath, deathOccurred }) {
  const [title, subtitle, VerdictIcon] = verdict;
  const [shareStatus, setShareStatus] = useState("");
  const levelName = levelInfo.name;
  const elapsedLabel = formatTime(elapsed);
  const pageUrl = window.location.href.split(/[?#]/)[0];
  const totalPts = scoreData.totalPts;
  
  let shareText = `Completé ${trackName} · nivel ${levelName} en Jackal Quiz con ${scoreData.points}/${totalPts} puntos (${scoreData.percentage}%) en ${elapsedLabel}. ¿Puedes superar mi puntuación rigurosa?`;
  if (deathOccurred) {
    shareText = `Fui aniquilado por la Muerte Súbita en ${trackName} · nivel ${levelName}. ¿Puedes sobrevivir en Jackal Quiz?`;
  }
  
  const cardData = { levelName, points: scoreData.points, totalPts, percentage: scoreData.percentage, elapsed: elapsedLabel, title };

  const shareResult = async () => {
    setShareStatus("");
    try {
      const blob = await createResultCard(cardData);
      const file = new File([blob], "resultado-jackal.png", { type: "image/png" });
      if (navigator.share) {
        const data = { title: "Mi resultado en Jackal Cyber Quiz", text: shareText, url: pageUrl };
        if (navigator.canShare?.({ files: [file] })) data.files = [file];
        await navigator.share(data);
        setShareStatus("Resultado compartido.");
        return;
      }
      await copyResult(`${shareText}\n${pageUrl}`);
      setShareStatus("Resultado y enlace copiados.");
    } catch (error) {
      if (error?.name === "AbortError") return;
      try {
        await copyResult(`${shareText}\n${pageUrl}`);
        setShareStatus("Resultado y enlace copiados.");
      } catch {
        setShareStatus("No pudimos compartirlo. Inténtalo nuevamente.");
      }
    }
  };

  const downloadCard = async () => {
    try {
      const blob = await createResultCard(cardData);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resultado-jackal-${category}-${level}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShareStatus("Tarjeta descargada.");
    } catch {
      setShareStatus("No pudimos descargar la tarjeta.");
    }
  };

  return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="max-w-4xl mx-auto">
    <section className="text-center mb-9">
      <div className={`mx-auto h-20 w-20 rounded-3xl border grid place-items-center mb-5 ${deathOccurred ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_50px_rgba(239,68,68,.12)]" : "bg-emerald-400/10 border-emerald-400/20 text-emerald-400 shadow-[0_0_50px_rgba(52,211,153,.12)]"}`}>
        <VerdictIcon size={38}/>
      </div>
      <div className={`text-xs tracking-[.2em] font-bold mb-2 ${deathOccurred ? "text-red-400" : "text-emerald-400"}`}>
        {deathOccurred ? "DESAFÍO FALLIDO" : "EVALUACIÓN COMPLETADA"}
      </div>
      <h1 className="text-3xl md:text-5xl font-black">{title}</h1>
      <p className="text-zinc-500 mt-3">{subtitle}</p>
    </section>
    
    <div className="grid md:grid-cols-[1.3fr_.7fr] gap-5 mb-6">
      <Card className="bg-zinc-950/90 border-zinc-800 rounded-2xl">
        <CardContent className="p-7">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Puntuación de rigor (+10/-5)</p>
              <div className={`text-5xl font-black mt-1 ${scoreData.points < 0 ? 'text-red-400' : 'text-white'}`}>
                {scoreData.points}<span className="text-xl text-zinc-600">/{totalPts} pts</span>
              </div>
            </div>
            <div className={`h-24 w-24 rounded-full grid place-items-center border-[7px] ${scoreData.percentage < 50 ? 'border-red-400 bg-red-400/5' : 'border-emerald-400 bg-emerald-400/5'}`}>
              <span className={`text-xl font-black ${scoreData.percentage < 50 ? 'text-red-400' : 'text-emerald-400'}`}>{scoreData.percentage}%</span>
            </div>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div initial={{width:0}} animate={{width:`${scoreData.percentage}%`}} transition={{duration:.8}} className={`h-full ${scoreData.percentage < 50 ? 'bg-red-400' : 'bg-emerald-400'}`}/>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
        <Stat icon={Clock3} label="Tiempo sobrevivido" value={formatTime(elapsed)}/>
        <Stat icon={Target} label="Precisión" value={`${scoreData.correctCount} / ${scoreData.totalQuestions}`}/>
      </div>
    </div>
    
    <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-400/[.11] via-zinc-950 to-zinc-950 border-emerald-400/20 rounded-2xl mb-6">
      <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
      <CardContent className="relative p-6 md:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 text-[11px] font-black tracking-[.16em] text-emerald-400 mb-2"><Share2 size={14}/> RETA A TU COMUNIDAD</div>
          <h3 className="text-xl md:text-2xl font-black text-white">Comparte tu resultado</h3>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Publica tu puntuación junto con una tarjeta de Jackal o descárgala para compartirla donde prefieras.</p>
        </div>
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 shrink-0">
          <Button onClick={shareResult} className="rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold"><Share2 size={16} className="mr-2"/>Compartir</Button>
          <Button onClick={downloadCard} className="rounded-xl border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800 text-white font-bold"><Download size={16} className="mr-2"/>Descargar tarjeta</Button>
        </div>
      </CardContent>
      <p className="relative min-h-7 px-6 pb-4 text-xs font-semibold text-emerald-300" role="status" aria-live="polite">{shareStatus}</p>
    </Card>
    
    <Card className="bg-zinc-950/90 border-zinc-800 rounded-2xl mb-6">
      <CardContent className="p-6">
        <h3 className="font-bold flex items-center gap-2 mb-5"><Search size={18} className="text-emerald-400"/> Revisión forense de respuestas</h3>
        <div className="space-y-3 max-h-[430px] overflow-y-auto pr-2">
          {questions.map((q, i) => {
            const ans = answers[i];
            const isAnswered = ans !== undefined;
            const isCorrect = isAnswered && ans.length === q[2].length && ans.every(v => q[2].includes(v));
            
            return (
              <div key={i} className={`rounded-xl border p-4 ${isCorrect ? "border-emerald-400/15 bg-emerald-400/[.04]" : "border-red-400/15 bg-red-400/[.04]"}`}>
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    {isCorrect ? <CheckCircle2 size={18} className="text-emerald-400"/> : <XCircle size={18} className="text-red-400"/>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{i+1}. {q[0]}</p>
                    <p className="text-[10px] font-bold mt-1 tracking-wider uppercase text-zinc-500">{isCorrect ? "+10 PTS" : isAnswered ? "-5 PTS" : "0 PTS (TIEMPO AGOTADO)"}</p>
                    {!isCorrect && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-zinc-400">
                          Tu selección: <span className="text-red-300">{!isAnswered ? "Ninguna (Se agotó el tiempo)" : ans.map(a => q[1][a]).join(" | ")}</span>
                        </p>
                        <p className="text-xs text-zinc-400">
                          Respuesta correcta: <span className="text-emerald-300">{q[2].map(a => q[1][a]).join(" | ")}</span>
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{q[3]}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
    
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button onClick={restart} className="bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold rounded-xl"><RefreshCcw size={16} className="mr-2"/>Repetir nivel</Button>
      <Button onClick={goHome} variant="outline" className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-xl"><Home size={16} className="mr-2"/>Elegir otro nivel</Button>
    </div>
  </motion.div>
}

function Stat({icon:Icon,label,value}) { 
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-emerald-400/10 text-emerald-400 grid place-items-center"><Icon size={19}/></div>
      <div><p className="text-xs text-zinc-500">{label}</p><p className="font-black text-white">{value}</p></div>
    </div>
  ) 
}
