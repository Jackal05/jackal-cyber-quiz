import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useBattleSocket } from "../../context/BattleSocketContext.jsx";
import { BATTLE_MODES } from "../../config/constants.js";
import RankBadge from "../common/RankBadge.jsx";
import { Swords, Trophy, History, Target, Flame, Clock, Radio, ChevronRight, Zap } from "lucide-react";

export default function BattleLobby({ onFindOpponent, onViewHistory, onViewLeaderboard }) {
  const { user } = useAuth();
  const { onlineCount } = useBattleSocket();
  const [selectedMode, setSelectedMode] = useState("ciberseguridad");

  const winRate = user?.battles_played > 0 ? Math.round((user.wins / user.battles_played) * 100) : 0;
  const avgResponseTime = user?.total_questions > 0
    ? (user.total_response_time_ms / user.total_questions / 1000).toFixed(1)
    : "0.0";
  const selected = BATTLE_MODES.find((mode) => mode.id === selectedMode) || BATTLE_MODES[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-black tracking-widest text-emerald-400 uppercase mb-3">
            <Radio size={13} className="animate-pulse" /> Arena competitiva 1v1
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            BATTLE <span className="text-emerald-400">LOBBY</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Elige tu especialidad y compite contra otro analista en 5 rondas en tiempo real. La precisión y la velocidad determinan la puntuación.
          </p>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="font-bold text-white">{onlineCount}</span> analistas en línea
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <section className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl">
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Operador activo</span>
              <h2 className="text-2xl font-black text-white mt-1">{user?.username || "Analyst"}</h2>
              <p className="text-xs text-zinc-400 mt-1">Nivel {user?.level || 1} · {user?.xp || 0} XP</p>
            </div>
            <RankBadge rank={user?.rank} size="md" />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 mb-5">
            <span className="text-[10px] uppercase tracking-wider font-black text-zinc-500">Rating competitivo</span>
            <div className="text-3xl font-black text-white mt-1">{user?.rating || 1200} <span className="text-xs text-emerald-400">MMR</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Swords} label="Batallas" value={user?.battles_played || 0} />
            <Stat icon={Target} label="Win rate" value={`${winRate}%`} />
            <Stat icon={Flame} label="Racha" value={user?.current_streak || 0} accent="text-amber-300" />
            <Stat icon={Clock} label="Vel. media" value={`${avgResponseTime}s`} accent="text-sky-300" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-6 pt-5 border-t border-zinc-900">
            <button onClick={onViewLeaderboard} className="h-10 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2">
              <Trophy size={14} className="text-amber-400" /> Leaderboard
            </button>
            <button onClick={onViewHistory} className="h-10 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2">
              <History size={14} className="text-emerald-400" /> Historial
            </button>
          </div>
        </section>

        <section className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Selecciona módulo</p>
              <h2 className="text-xl font-black text-white mt-1">Especialidad de la batalla</h2>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400">3 MODOS ACTIVOS</span>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {BATTLE_MODES.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`text-left p-5 rounded-xl border transition-all min-h-[170px] ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/[.07] shadow-[0_0_24px_rgba(52,211,153,.08)]"
                      : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={`h-5 w-5 rounded-full border grid place-items-center ${isSelected ? "border-emerald-400 bg-emerald-400" : "border-zinc-700"}`}>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-black" />}
                    </span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-400 text-black">1v1 RANKED</span>
                  </div>
                  <h3 className="text-base font-black text-white">{mode.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-2">{mode.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-3">
              <Zap size={14} className="text-emerald-400" /> Reglas del duelo
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-zinc-400">
              <div><span className="block text-zinc-500">Módulo</span>{selected.title}</div>
              <div><span className="block text-zinc-500">Rondas</span>5 preguntas</div>
              <div><span className="block text-zinc-500">Tiempo</span>20s por pregunta</div>
              <div><span className="block text-zinc-500">Empate</span>Muerte súbita</div>
            </div>
          </div>

          <div className="mt-7 pt-6 border-t border-zinc-800">
            <button
              onClick={() => onFindOpponent(selectedMode)}
              className="w-full h-14 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-base flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-[0_0_30px_rgba(52,211,153,.22)]"
            >
              <Swords size={20} className="stroke-[2.5]" />
              BUSCAR OPONENTE · {selected.title.toUpperCase()}
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent = "text-white" }) {
  return (
    <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900">
      <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold mb-1">
        <Icon size={14} className="text-emerald-400" /> {label}
      </div>
      <div className={`text-lg font-black ${accent}`}>{value}</div>
    </div>
  );
}
