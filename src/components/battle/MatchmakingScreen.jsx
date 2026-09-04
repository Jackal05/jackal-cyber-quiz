import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useBattleSocket } from "../../context/BattleSocketContext.jsx";
import { BATTLE_MODES } from "../../config/constants.js";
import { Swords, X, Radio, Users } from "lucide-react";

export default function MatchmakingScreen({ onCancel }) {
  const { user } = useAuth();
  const { queueStatus, queueMode, onlineCount } = useBattleSocket();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentRadius = queueStatus?.radius || (seconds < 10 ? 100 : seconds < 20 ? 200 : seconds < 30 ? 350 : 500);
  const minMmr = Math.max(0, (user?.rating || 1200) - currentRadius);
  const maxMmr = (user?.rating || 1200) + currentRadius;
  const modeId = queueStatus?.mode || queueMode || "ciberseguridad";
  const mode = BATTLE_MODES.find((item) => item.id === modeId) || BATTLE_MODES[0];
  const formatSec = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center animate-in fade-in duration-300">
      <div className="rounded-3xl border border-zinc-800 bg-[#080c09] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.06),transparent_70%)] pointer-events-none" />
        <div className="relative mx-auto w-36 h-36 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border border-emerald-400/30" />
          <div className="absolute inset-6 rounded-full border border-emerald-400/40" />
          <div className="relative h-20 w-20 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 grid place-items-center shadow-[0_0_40px_rgba(52,211,153,0.2)]">
            <Swords size={36} className="animate-pulse" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-400 tracking-wider uppercase mb-3">
          <Radio size={13} className="animate-pulse" /> Matchmaking Server-Side
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">SEARCHING FOR OPPONENT</h2>
        <p className="text-sm text-zinc-400 mt-2">Buscando un rival para el módulo de <span className="text-white font-bold">{mode.title}</span>...</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-8 text-left">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] font-black uppercase text-zinc-400 block">Tiempo en cola</span>
            <span className="text-xl font-black text-white mt-1 block font-mono">{formatSec(seconds)}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] font-black uppercase text-zinc-400 block">Rango MMR</span>
            <span className="text-sm font-black text-emerald-400 mt-1 block">{minMmr} - {maxMmr}</span>
            <span className="text-[10px] text-zinc-400">±{currentRadius} pts</span>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-black uppercase text-zinc-400 block">Modalidad</span>
            <span className="text-sm font-black text-zinc-200 mt-1 block truncate">{mode.title}</span>
            <span className="text-[10px] text-zinc-400">5 rondas 1v1</span>
          </div>
        </div>

        <button onClick={onCancel} className="w-full sm:w-auto min-w-[200px] h-12 px-6 rounded-xl border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors">
          <X size={16} /> Cancelar búsqueda
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <Users size={14} />
          <span>{onlineCount} analistas en línea</span>
        </div>
      </div>
    </div>
  );
}
