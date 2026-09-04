import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { CheckCircle2, XCircle, Clock, Zap, ArrowRight, ShieldCheck } from "lucide-react";

export default function RoundResultScreen({ match }) {
  const { user } = useAuth();
  const [cooldown, setCooldown] = useState(match?.cooldownSec || 4);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const res = match?.roundResult;
  if (!res) return null;

  const isP1 = user?.id === res.player1.id;
  const myData = isP1 ? res.player1 : res.player2;
  const oppData = isP1 ? res.player2 : res.player1;

  const q = res.question;
  const correctOptions = q.options?.filter((o) => q.correctOptionIds?.includes(o.id)) || [];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6 animate-in zoom-in-95 duration-200">
      {/* Round Result Title */}
      <div className="text-center">
        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
          RESULTADO DE RONDA {res.roundNumber} / {res.totalRounds}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white">COMPARATIVA DE COMBATE</h2>
      </div>

      {/* Side-by-Side Dual Comparison Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* You */}
        <div
          className={`p-6 rounded-2xl border ${
            myData.isCorrect ? "border-emerald-500/40 bg-emerald-500/[.06]" : "border-red-500/40 bg-red-500/[.06]"
          } shadow-xl`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-white">TÚ ({myData.username})</span>
            {myData.isCorrect ? (
              <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded bg-emerald-400 text-black">
                <CheckCircle2 size={14} /> CORRECTO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded bg-red-500 text-white">
                <XCircle size={14} /> INCORRECTO
              </span>
            )}
          </div>

          <div className="text-3xl font-black text-white mb-3">
            +{myData.roundPoints} <span className="text-xs font-normal text-zinc-400">puntos</span>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-zinc-500" />
              <span>{(myData.responseTimeMs / 1000).toFixed(2)}s</span>
            </div>
            {myData.speedBonus > 0 && (
              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                <Zap size={13} />
                <span>+{myData.speedBonus} bonus velocidad</span>
              </div>
            )}
          </div>
        </div>

        {/* Opponent */}
        <div
          className={`p-6 rounded-2xl border ${
            oppData.isCorrect ? "border-emerald-500/30 bg-zinc-950/80" : "border-zinc-800 bg-zinc-950/80"
          } shadow-xl`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400">RIVAL ({oppData.username})</span>
            {oppData.isCorrect ? (
              <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={14} /> CORRECTO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                <XCircle size={14} /> INCORRECTO
              </span>
            )}
          </div>

          <div className="text-3xl font-black text-zinc-200 mb-3">
            +{oppData.roundPoints} <span className="text-xs font-normal text-zinc-500">puntos</span>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-zinc-500" />
              <span>{(oppData.responseTimeMs / 1000).toFixed(2)}s</span>
            </div>
            {oppData.speedBonus > 0 && (
              <div className="flex items-center gap-1 text-zinc-400 font-medium">
                <Zap size={13} />
                <span>+{oppData.speedBonus} bonus velocidad</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Answer Explanation & Technical Insight */}
      <div className="p-5 rounded-2xl border border-zinc-800 bg-[#090d0a]">
        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheck size={15} /> Justificación Técnica
        </h4>
        <div className="text-xs text-zinc-300 font-semibold mb-2">
          Respuesta correcta:{" "}
          <span className="text-emerald-400">
            {correctOptions.map((o) => o.text).join(" | ")}
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{q.explanation}</p>
      </div>

      {/* Countdown to Next Round */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400">
          <span>SIGUIENTE RONDA EN</span>
          <span className="font-mono text-emerald-400 font-black text-base">{cooldown}s</span>
          <ArrowRight size={14} className="animate-pulse" />
        </div>
      </div>
    </div>
  );
}
