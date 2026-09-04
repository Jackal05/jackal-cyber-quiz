import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBattleSocket } from "../context/BattleSocketContext.jsx";
import RankBadge from "../components/common/RankBadge.jsx";
import {
  Swords,
  GraduationCap,
  Trophy,
  ShieldCheck,
  Zap,
  Target,
  Clock,
  ArrowRight,
  Flame,
  AlertTriangle,
  History,
  Radio,
  ExternalLink,
} from "lucide-react";

export default function DashboardView({ onNavigate, onPracticeTopic }) {
  const { user, token } = useAuth();
  const { onlineCount } = useBattleSocket();
  const [recentMatch, setRecentMatch] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);

  useEffect(() => {
    if (user?.username) {
      // Fetch profile stats
      fetch(`/api/profile/${encodeURIComponent(user.username)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.categoryStats) setCategoryStats(data.categoryStats);
        })
        .catch(() => {});

      // Fetch recent match
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      fetch(`/api/battle/history?userId=${user.id}`, { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.matches && data.matches.length > 0) {
            setRecentMatch(data.matches[0]);
          }
        })
        .catch(() => {});
    }
  }, [user?.username, user?.id, token]);

  // Determine weakest category
  const weakestArea = categoryStats.length > 0
    ? [...categoryStats].sort((a, b) => (a.correct_count / (a.total_count || 1)) - (b.correct_count / (b.total_count || 1)))[0]
    : null;

  const winRate = user?.battles_played > 0 ? Math.round((user.wins / user.battles_played) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Brand Hero Narrative */}
      <section className="relative rounded-3xl border border-zinc-800 bg-gradient-to-b from-[#090f0b] to-[#060807] p-8 sm:p-12 overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-400 tracking-wider uppercase">
            <Radio size={13} className="animate-pulse" /> Jackal Cybersecurity Proving Ground
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.08]">
            Master cybersecurity. <br />
            <span className="text-emerald-400">Then prove it.</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
            Entrena con desafíos técnicos de certificación profesional y compite contra otros operadores en duelos 1v1 en tiempo real con puntuación autoritativa.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-4">
            <button
              onClick={() => onNavigate("battle")}
              className="h-12 px-7 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] shadow-[0_0_24px_rgba(52,211,153,.25)] cursor-pointer"
            >
              <Swords size={18} className="stroke-[2.5]" />
              ENTER BATTLE 1v1
            </button>

            <button
              onClick={() => onNavigate("training")}
              className="h-12 px-7 rounded-xl border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <GraduationCap size={18} className="text-emerald-400" />
              START TRAINING
            </button>
          </div>
        </div>
      </section>

      {/* Asymmetric Core Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Combat Readiness & Rating (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-0.5">
                  ESTADO DE COMBATE
                </span>
                <h2 className="text-xl font-black text-white">Pasaporte Operativo</h2>
              </div>
              <RankBadge rank={user?.rank} size="md" />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Rating Elo</span>
                <div className="text-2xl font-black text-white flex items-baseline gap-1">
                  <span>{user?.rating || 1200}</span>
                  <span className="text-xs text-emerald-400 font-bold">MMR</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">Pico: {user?.peak_rating || 1200} MMR</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Win Rate</span>
                <div className="text-2xl font-black text-white">{winRate}%</div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  {user?.wins || 0}V - {user?.losses || 0}D
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Racha Victorias</span>
                <div className="text-2xl font-black text-amber-400 flex items-center gap-1">
                  <Flame size={18} /> {user?.current_streak || 0}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">Mejor: {user?.best_streak || 0}</div>
              </div>
            </div>

            {/* Quick action to Battle */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[.05] flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  Modo Ranked Activo
                </div>
                <div className="text-sm font-bold text-white">General Cybersecurity 1v1</div>
                <div className="text-[11px] text-zinc-400">{onlineCount} analistas en línea esperando rival</div>
              </div>
              <button
                onClick={() => onNavigate("battle")}
                className="h-10 px-4 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                Combatir <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Recent Battle Highlight */}
          <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <History size={16} className="text-emerald-400" /> Último Enfrentamiento
              </h3>
              <button
                onClick={() => onNavigate("history")}
                className="text-xs font-bold text-zinc-500 hover:text-emerald-400 transition-colors"
              >
                Ver todo →
              </button>
            </div>

            {recentMatch ? (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg grid place-items-center font-black text-xs ${
                      recentMatch.winner_id === user?.id
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {recentMatch.winner_id === user?.id ? "WIN" : "LOSS"}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      vs {user?.id === recentMatch.player1_id ? recentMatch.p2_username : recentMatch.p1_username}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Marcador: {recentMatch.player1_score} - {recentMatch.player2_score} pts
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase block font-bold">Modalidad</span>
                  <span className="text-xs font-bold text-zinc-300">{recentMatch.mode}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-900 text-center text-xs text-zinc-500">
                Aún no has disputado batallas en esta temporada.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Training Tracks & Weak Topics Bridge (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weak Topic Alert Card */}
          {weakestArea && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[.06] p-6 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                <AlertTriangle size={15} /> Foco de Mejora Detectado
              </div>
              <div className="text-base font-black text-white">
                Área técnica: {weakestArea.category}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tus respuestas en combate indican una tasa de acierto del{" "}
                {Math.round((weakestArea.correct_count / (weakestArea.total_count || 1)) * 100)}%.
                Reforzar este módulo aumentará tus probabilidades de victoria en el ranking.
              </p>
              <button
                onClick={() => onPracticeTopic(weakestArea.category.toLowerCase().includes("red") ? "redes" : weakestArea.category.toLowerCase().includes("forense") ? "forense" : "ciberseguridad")}
                className="w-full h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <GraduationCap size={15} /> Entrenar {weakestArea.category}
              </button>
            </div>
          )}

          {/* Training Lab Tracks */}
          <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-0.5">
                  ESPECIALIDADES
                </span>
                <h3 className="text-lg font-black text-white">Training Lab</h3>
              </div>
              <button
                onClick={() => onNavigate("training")}
                className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
              >
                Ver niveles →
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { id: "ciberseguridad", title: "Ciberseguridad", sub: "Defensa, riesgo y ethical hacking", count: "80+ retos" },
                { id: "redes", title: "Redes Empresariales", sub: "OSPF, BGP, L2/L3 y Troubleshooting", count: "100+ retos" },
                { id: "forense", title: "Informática Forense", sub: "Evidencia digital, RAM y normas ISO", count: "90+ retos" },
              ].map((track) => (
                <div
                  key={track.id}
                  onClick={() => onPracticeTopic(track.id)}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors">
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{track.sub}</p>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2 py-1 rounded shrink-0">
                    {track.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
