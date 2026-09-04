import React, { useState, useEffect } from "react";
import RankBadge from "../common/RankBadge.jsx";
import { Swords, Shield, Zap } from "lucide-react";

export default function VsScreen({ match, onCountdownFinish }) {
  const [countdown, setCountdown] = useState(match.countdownSec || 3);

  useEffect(() => {
    if (countdown <= 1) {
      const timeout = setTimeout(() => {
        if (onCountdownFinish) onCountdownFinish();
      }, 1000);
      return () => clearTimeout(timeout);
    }

    const interval = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, onCountdownFinish]);

  const p1 = match.player1;
  const p2 = match.player2;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-300">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">
          <Zap size={13} /> Combate Confirmado
        </div>
        <h2 className="text-2xl font-black text-white">MODALIDAD GENERAL CYBERSECURITY</h2>
        <p className="text-xs text-zinc-400 mt-1">5 rondas · Preguntas sincronizadas · Puntuación autoritativa</p>
      </div>

      <div className="relative grid md:grid-cols-2 gap-6 items-center">
        {/* Center VS Badge */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-zinc-950 border-2 border-emerald-400 text-emerald-400 font-black text-2xl grid place-items-center shadow-[0_0_30px_rgba(52,211,153,0.3)]">
            VS
          </div>
        </div>

        {/* Player 1 Card */}
        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl relative overflow-hidden text-left">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Operador Alpha
              </span>
              <h3 className="text-2xl font-black text-white mt-1 truncate">{p1.username}</h3>
              <p className="text-xs text-zinc-400">Nivel {p1.level || 1}</p>
            </div>
            <RankBadge rank={p1.rank} size="md" />
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-900 mt-4 flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-bold uppercase">Rating Competitivo</span>
            <span className="text-lg font-black text-white">{p1.rating} MMR</span>
          </div>
        </div>

        {/* Mobile VS indicator */}
        <div className="md:hidden flex justify-center -my-2 z-10">
          <div className="h-10 w-10 rounded-xl bg-zinc-950 border border-emerald-400 text-emerald-400 font-black text-sm grid place-items-center">
            VS
          </div>
        </div>

        {/* Player 2 Card */}
        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl relative overflow-hidden text-right">
          <div className="flex items-start justify-between flex-row-reverse mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Operador Rival
              </span>
              <h3 className="text-2xl font-black text-white mt-1 truncate">{p2.username}</h3>
              <p className="text-xs text-zinc-400">Nivel {p2.level || 1}</p>
            </div>
            <RankBadge rank={p2.rank} size="md" />
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-900 mt-4 flex items-center justify-between flex-row-reverse">
            <span className="text-xs text-zinc-400 font-bold uppercase">Rating Competitivo</span>
            <span className="text-lg font-black text-white">{p2.rating} MMR</span>
          </div>
        </div>
      </div>

      {/* Countdown Timer Display */}
      <div className="mt-12 text-center">
        <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400 block mb-2">
          INICIANDO EN
        </span>
        <div className="inline-block text-6xl font-black text-emerald-400 animate-pulse font-mono">
          {countdown}
        </div>
      </div>
    </div>
  );
}
