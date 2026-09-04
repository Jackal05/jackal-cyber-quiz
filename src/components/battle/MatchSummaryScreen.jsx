import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useBattleSocket } from "../../context/BattleSocketContext.jsx";
import RankBadge from "../common/RankBadge.jsx";
import {
  Trophy,
  Award,
  Swords,
  TrendingUp,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Zap,
  GraduationCap,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function MatchSummaryScreen({ match, onRematch, onFindNewOpponent, onBackToLobby, onPracticeTopic }) {
  const { user } = useAuth();
  const [rematchRequested, setRematchRequested] = useState(false);

  const summary = match?.summary;
  if (!summary) return null;

  const isP1 = user?.id === summary.player1.id;
  const myData = isP1 ? summary.player1 : summary.player2;
  const oppData = isP1 ? summary.player2 : summary.player1;

  const isWinner = summary.winnerId === user?.id;
  const isDraw = summary.isDraw;
  const isForfeit = summary.isForfeit;

  const analytics = summary.analytics ? summary.analytics[user?.id] : null;
  const weakestTopic = analytics?.weakestTopic;

  const handleRematchClick = () => {
    setRematchRequested(true);
    onRematch();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-300">
      {/* Victory / Defeat Header */}
      <div className="text-center">
        <div
          className={`mx-auto h-20 w-20 rounded-3xl border grid place-items-center mb-4 ${
            isWinner
              ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.2)]"
              : isDraw
              ? "bg-amber-400/10 border-amber-400/30 text-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.2)]"
              : "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
          }`}
        >
          {isWinner ? <Trophy size={42} /> : isDraw ? <Award size={42} /> : <Swords size={42} />}
        </div>

        <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500 mb-1">
          {isForfeit ? "COMBATE FINALIZADO POR ABANDONO" : "EVALUACIÓN DE COMBATE COMPLETADA"}
        </div>

        <h1
          className={`text-4xl sm:text-6xl font-black tracking-tight ${
            isWinner ? "text-emerald-400" : isDraw ? "text-amber-400" : "text-white"
          }`}
        >
          {isWinner ? "VICTORY" : isDraw ? "DRAW" : "DEFEAT"}
        </h1>

        <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
          {isWinner
            ? "Rigor técnico superior demostrado en el terreno de juego. Rating actualizado."
            : isDraw
            ? "Rendimiento y tiempos perfectamente igualados entre ambos analistas."
            : "Derrota en el terreno de juego. Analiza tus áreas débiles y refuerza tu criterio."}
        </p>
      </div>

      {/* Score and Elo Progression Cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Score comparison */}
        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-4">
              MARCADOR FINAL DE COMBATE
            </span>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-400">TÚ ({myData.username})</div>
                <div className="text-4xl font-black text-white mt-1">{myData.score} pts</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {myData.correctCount} / {myData.totalQuestions} aciertos
                </div>
              </div>

              <div className="text-xl font-black text-zinc-600">VS</div>

              <div className="text-right">
                <div className="text-xs font-bold text-zinc-400">RIVAL ({oppData.username})</div>
                <div className="text-4xl font-black text-zinc-300 mt-1">{oppData.score} pts</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {oppData.correctCount} / {oppData.totalQuestions} aciertos
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-900 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-zinc-500 block">Velocidad media:</span>
              <span className="font-bold text-white">{(myData.avgResponseTimeMs / 1000).toFixed(2)}s</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Precisión:</span>
              <span className="font-bold text-emerald-400">
                {Math.round((myData.correctCount / (myData.totalQuestions || 1)) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Rating and XP Progression */}
        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                PROGRESIÓN COMPETITIVA
              </span>
              <RankBadge rank={myData.rank} size="sm" />
            </div>

            {/* Rating Delta */}
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <div className="text-xs text-zinc-400 font-bold">Rating Elo</div>
                <div className="text-3xl font-black text-white mt-0.5">
                  {myData.ratingAfter} <span className="text-xs font-normal text-zinc-500">MMR</span>
                </div>
              </div>

              <div
                className={`text-xl font-black ${
                  myData.ratingDelta >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {myData.ratingDelta >= 0 ? `+${myData.ratingDelta}` : myData.ratingDelta} pts
              </div>
            </div>

            {/* XP Delta */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-emerald-400" />
                <span className="text-xs font-bold text-zinc-300">XP Obtenido</span>
              </div>
              <div className="text-sm font-black text-emerald-400">+{myData.xpGained} XP</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-900 text-xs text-zinc-400 flex items-center justify-between">
            <span>Rango de combate:</span>
            <span className="font-bold text-white">{myData.rank?.displayName}</span>
          </div>
        </div>
      </div>

      {/* Battle Analytics & Weakest Topic Section */}
      {analytics && (
        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
              BATTLE ANALYTICS & TELEMETRÍA
            </span>
            <h3 className="text-lg font-black text-white">Desglose de Rendimiento por Categoría</h3>
          </div>

          {/* Category Breakdown Progress */}
          <div className="grid sm:grid-cols-3 gap-4">
            {analytics.breakdown.map((cat) => (
              <div key={cat.category} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-zinc-300 truncate">{cat.category}</span>
                  <span className={cat.accuracy >= 70 ? "text-emerald-400" : cat.accuracy >= 50 ? "text-amber-400" : "text-red-400"}>
                    {cat.accuracy}%
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full ${
                      cat.accuracy >= 70 ? "bg-emerald-400" : cat.accuracy >= 50 ? "bg-amber-400" : "bg-red-500"
                    }`}
                    style={{ width: `${cat.accuracy}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500">
                  {cat.correct} de {cat.total} respondidas correctamente
                </div>
              </div>
            ))}
          </div>

          {/* Weak Topic Bridge Card to Training */}
          {weakestTopic && (
            <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/[.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                  <ShieldAlert size={15} /> Área con menor precisión detectada
                </div>
                <div className="text-sm font-bold text-white">
                  Tema a reforzar: <span className="text-amber-300 font-black">{weakestTopic.category}</span> ({weakestTopic.accuracy}% de precisión)
                </div>
                <p className="text-xs text-zinc-400">
                  La plataforma Jackal te recomienda entrenar este módulo en el Training Lab para perfeccionar tu criterio.
                </p>
              </div>

              <button
                onClick={() => onPracticeTopic(weakestTopic.slug)}
                className="shrink-0 h-11 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <GraduationCap size={16} /> PRACTICAR {weakestTopic.category.toUpperCase()}
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons: Rematch, New Opponent, Back to Lobby */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <button
          onClick={handleRematchClick}
          disabled={rematchRequested}
          className="h-12 px-6 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-black text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw size={16} />
          {rematchRequested ? "Revancha solicitada..." : "Solicitar Revancha (Rematch)"}
        </button>

        <button
          onClick={onFindNewOpponent}
          className="h-12 px-6 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Swords size={16} className="text-emerald-400" />
          Buscar Nuevo Oponente
        </button>

        <button
          onClick={onBackToLobby}
          className="h-12 px-6 rounded-xl border border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          Volver al Lobby
        </button>
      </div>
    </div>
  );
}
