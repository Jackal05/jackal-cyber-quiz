import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { History, Swords, Trophy, Clock, X, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

export default function BattleHistoryView({ onFindBattle }) {
  const { user, token } = useAuth();
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    if (!token && !user) {
      setIsLoading(false);
      return;
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/battle/history?userId=${user?.id || ""}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        setMatches(data.matches || []);
      })
      .catch((err) => console.error("History fetch error:", err))
      .finally(() => setIsLoading(false));
  }, [token, user]);

  const viewMatchDetails = async (matchId) => {
    try {
      const res = await fetch(`/api/battle/match/${matchId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedMatch(data.match);
      }
    } catch (err) {
      console.error("Match detail fetch error:", err);
    }
  };

  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-black tracking-widest text-emerald-400 uppercase mb-2">
          <History size={13} /> Registro de Telemetría
        </div>
        <h1 className="text-3xl font-black text-white">BATTLE HISTORY</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Historial de enfrentamientos 1v1, rendimiento y desglose de rondas.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-zinc-500 font-bold">
          <div className="h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Cargando historial de combate...
        </div>
      ) : matches.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-12 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-600 grid place-items-center">
            <Swords size={32} />
          </div>
          <h3 className="text-xl font-black text-white">Aún no has librado ninguna batalla</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            ¿Listo para poner a prueba tu criterio en tiempo real contra otro operador de ciberseguridad?
          </p>
          <button
            onClick={onFindBattle}
            className="h-11 px-6 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Swords size={16} /> BUSCAR MI PRIMERA BATALLA
          </button>
        </div>
      ) : (
        /* Match List */
        <div className="space-y-3">
          {matches.map((m) => {
            const isP1 = user?.id === m.player1_id;
            const myScore = isP1 ? m.player1_score : m.player2_score;
            const oppScore = isP1 ? m.player2_score : m.player1_score;
            const oppName = isP1 ? m.p2_username : m.p1_username;

            const isWin = m.winner_id === user?.id;
            const isDraw = m.is_draw === 1;

            const myRatingBefore = isP1 ? m.p1_rating_before : m.p2_rating_before;
            const myRatingAfter = isP1 ? m.p1_rating_after : m.p2_rating_after;
            const ratingDelta = myRatingAfter - myRatingBefore;

            return (
              <div
                key={m.id}
                onClick={() => viewMatchDetails(m.id)}
                className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-[#090d0a] hover:border-zinc-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-11 w-11 rounded-xl grid place-items-center font-black text-xs shrink-0 ${
                      isWin
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                        : isDraw
                        ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {isWin ? "WIN" : isDraw ? "DRAW" : "LOSS"}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">vs {oppName}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {m.mode}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{formatDate(m.finished_at)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6">
                  {/* Score */}
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase">Marcador</span>
                    <span className="text-sm font-black text-white">
                      {myScore} - {oppScore}
                    </span>
                  </div>

                  {/* Rating Delta */}
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase">Rating</span>
                    <span
                      className={`text-sm font-black ${
                        ratingDelta >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta} MMR
                    </span>
                  </div>

                  <ChevronRight size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-2xl space-y-6">
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                DETALLE DE TELEMETRÍA
              </span>
              <h3 className="text-xl font-black text-white">Desglose Técnico de Rondas</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Revisa cada reto presentado y las decisiones tomadas en combate.
              </p>
            </div>

            {/* Rounds list in detail */}
            <div className="space-y-3">
              {selectedMatch.details?.rounds?.map((r, idx) => {
                const myAns = r.answers?.[user?.id];
                const isCorrect = myAns?.isCorrect;

                return (
                  <div key={idx} className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-400">RONDA {r.roundNumber}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                          {r.category}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold flex items-center gap-1 ${
                          isCorrect ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {isCorrect ? `+${myAns.pointsEarned} pts` : "0 pts"}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 font-medium leading-relaxed mb-2">{r.prompt}</p>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-900">
                      <span>Tiempo: {(myAns?.responseTimeMs / 1000).toFixed(2)}s</span>
                      {myAns?.speedBonus > 0 && <span>Bonus velocidad: +{myAns.speedBonus}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
