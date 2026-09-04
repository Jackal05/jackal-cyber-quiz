import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useBattleSocket } from "../../context/BattleSocketContext.jsx";
import { BATTLE_MODES } from "../../config/constants.js";
import RankBadge from "../common/RankBadge.jsx";
import {
  Swords,
  ShieldAlert,
  Flame,
  Zap,
  Target,
  Trophy,
  History,
  Lock,
  ChevronRight,
  Radio,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function BattleLobby({ onFindOpponent, onViewHistory, onViewLeaderboard }) {
  const { user } = useAuth();
  const { onlineCount } = useBattleSocket();
  const [selectedMode, setSelectedMode] = useState("general");

  const winRate = user?.battles_played > 0 ? Math.round((user.wins / user.battles_played) * 100) : 0;
  const avgResponseTime =
    user?.total_questions > 0
      ? (user.total_response_time_ms / user.total_questions / 1000).toFixed(1)
      : "0.0";

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-black tracking-widest text-emerald-400 uppercase mb-3">
            <Radio size={13} className="animate-pulse" /> 1v1 Competitive Arena
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            BATTLE <span className="text-emerald-400">LOBBY</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-xl">
            Desafía a otros analistas de seguridad en duelos 1v1 en tiempo real. 5 rondas de criterio técnico, velocidad de respuesta y puntuación autoritativa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="font-bold text-white">{onlineCount}</span> analistas en línea listos para combatir
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Player Passport & Competitive Stats (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Operador Activo
                </span>
                <h2 className="text-2xl font-black text-white mt-1">{user?.username || "Analyst"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-zinc-400">Nivel {user?.level || 1}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-xs text-zinc-400">{user?.xp || 0} XP</span>
                </div>
              </div>
              <RankBadge rank={user?.rank} size="md" />
            </div>

            {/* Rating Big Display */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 mb-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Rating Competitivo (Elo)
                </span>
                <div className="text-3xl font-black text-white mt-0.5 flex items-baseline gap-2">
                  <span>{user?.rating || 1200}</span>
                  <span className="text-xs text-emerald-400 font-bold">MMR</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Pico Histórico</span>
                <div className="text-sm font-black text-zinc-300 mt-0.5">{user?.peak_rating || user?.rating || 1200} MMR</div>
              </div>
            </div>

            {/* Combat Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900">
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold mb-1">
                  <Swords size={14} className="text-emerald-400" /> Batallas
                </div>
                <div className="text-lg font-black text-white">{user?.battles_played || 0}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {user?.wins || 0}V - {user?.losses || 0}D
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900">
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold mb-1">
                  <Target size={14} className="text-emerald-400" /> Win Rate
                </div>
                <div className="text-lg font-black text-white">{winRate}%</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Tasa de victorias</div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900">
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold mb-1">
                  <Flame size={14} className="text-amber-400" /> Racha Actual
                </div>
                <div className="text-lg font-black text-amber-300">
                  {user?.current_streak || 0} <span className="text-xs font-medium text-zinc-500">victorias</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Mejor: {user?.best_streak || 0}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900">
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold mb-1">
                  <Clock size={14} className="text-sky-400" /> Vel. Media
                </div>
                <div className="text-lg font-black text-sky-300">
                  {avgResponseTime} <span className="text-xs font-medium text-zinc-500">seg</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Por respuesta</div>
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="grid grid-cols-2 gap-2.5 mt-6 pt-5 border-t border-zinc-900">
              <button
                onClick={onViewLeaderboard}
                className="h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Trophy size={14} className="text-amber-400" /> Leaderboard
              </button>
              <button
                onClick={onViewHistory}
                className="h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <History size={14} className="text-emerald-400" /> Historial
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Battle Modes & Matchmaking Trigger (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Modalidad de Combate
                </span>
                <span className="text-xs text-zinc-400 font-semibold">
                  {BATTLE_MODES.filter((m) => m.status === "active").length} modo activo
                </span>
              </div>

              <div className="space-y-3">
                {BATTLE_MODES.map((mode) => {
                  const isActive = mode.status === "active";
                  const isSelected = selectedMode === mode.id;

                  return (
                    <div
                      key={mode.id}
                      onClick={() => isActive && setSelectedMode(mode.id)}
                      className={`relative p-4 rounded-xl border transition-all ${
                        !isActive
                          ? "border-zinc-800/50 bg-zinc-950/40 opacity-60 cursor-not-allowed"
                          : isSelected
                          ? "border-emerald-400/80 bg-emerald-500/[.07] cursor-pointer shadow-[0_0_24px_rgba(52,211,153,.08)]"
                          : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-white">{mode.title}</h3>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded ${
                                isActive ? "bg-emerald-400 text-black" : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              {mode.badge}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">{mode.description}</p>
                        </div>

                        <div className="mt-1 shrink-0">
                          {isActive ? (
                            <div
                              className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-emerald-400 bg-emerald-400" : "border-zinc-700"
                              }`}
                            >
                              {isSelected && <div className="h-2 w-2 rounded-full bg-black" />}
                            </div>
                          ) : (
                            <Lock size={16} className="text-zinc-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combat Match Rules Preview */}
              <div className="mt-6 p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/80">
                <h4 className="text-xs font-bold text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Zap size={14} className="text-emerald-400" /> Reglas del Duelo 1v1
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] text-zinc-400">
                  <div>
                    <span className="text-zinc-500 block">Rondas:</span> 5 preguntas
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Tiempo límite:</span> 20s por reto
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Velocidad:</span> Hasta +50 pts bonus
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Opciones:</span> IDs aleatorizados
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Empate:</span> Muerte súbita
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Abandono:</span> Forfeit automático
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Matchmaking Button */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <button
                onClick={() => onFindOpponent(selectedMode)}
                className="w-full h-14 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-base flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] shadow-[0_0_30px_rgba(52,211,153,.25)] cursor-pointer"
              >
                <Swords size={20} className="stroke-[2.5]" />
                BUSCAR OPONENTE (FIND OPPONENT)
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
