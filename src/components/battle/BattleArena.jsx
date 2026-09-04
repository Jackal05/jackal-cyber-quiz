import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useBattleSocket } from "../../context/BattleSocketContext.jsx";
import { Timer, CheckCircle, Clock, AlertTriangle, Skull, Radio, Lock } from "lucide-react";

export default function BattleArena() {
  const { user } = useAuth();
  const { match, submitAnswer, selectedOptionId, hasSubmittedAnswer } = useBattleSocket();

  // Local animated timer derived strictly from server startedAt and expiresAt
  const [secondsLeft, setSecondsLeft] = useState(20);

  useEffect(() => {
    if (!match?.expiresAt) return;

    const updateTimer = () => {
      const remainingMs = Math.max(0, match.expiresAt - Date.now());
      const sec = Math.ceil(remainingMs / 1000);
      setSecondsLeft(sec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [match?.expiresAt]);

  // Keyboard shortcut listener: Keys 1, 2, 3, 4
  const handleKeyDown = useCallback(
    (e) => {
      if (hasSubmittedAnswer || !match?.question?.options) return;
      // Do not capture keyboard if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= match.question.options.length) {
        const option = match.question.options[num - 1];
        if (option) {
          submitAnswer(option.id);
        }
      }
    },
    [hasSubmittedAnswer, match?.question?.options, submitAnswer]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!match || !match.question) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="h-10 w-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-zinc-400 font-bold">Sincronizando ronda con el servidor autoritativo...</p>
      </div>
    );
  }

  const p1 = match.player1;
  const p2 = match.player2;
  const isP1 = user?.id === p1.id;
  const myPlayer = isP1 ? p1 : p2;
  const oppPlayer = isP1 ? p2 : p1;

  const myScore = match.scores[myPlayer.id] || 0;
  const oppScore = match.scores[oppPlayer.id] || 0;

  const progressRatio = Math.max(0, Math.min(1, secondsLeft / (match.durationSec || 20)));
  const isUrgent = secondsLeft <= 5;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-200">
      {/* Disconnect Alert */}
      {match.opponentDisconnected && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 flex items-center justify-between text-xs font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>RIVAL DESCONECTADO · Esperando reconexión ({match.gracePeriodSec || 15}s)...</span>
          </div>
          <span className="text-[11px] text-zinc-400">Si no regresa, obtendrás victoria por abandono.</span>
        </div>
      )}

      {/* Arena Scoreboard Header */}
      <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          {/* My Player */}
          <div className="text-left flex-1 truncate">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
              TÚ ({myPlayer.username})
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">{myScore} pts</div>
          </div>

          {/* Center Round Badge & Timer */}
          <div className="flex flex-col items-center shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-black uppercase text-zinc-300">
              {match.isSuddenDeath ? (
                <span className="text-red-400 flex items-center gap-1">
                  <Skull size={13} /> MUERTE SÚBITA
                </span>
              ) : (
                <span>
                  RONDA {match.roundNumber} / {match.totalRounds}
                </span>
              )}
            </div>

            <div
              className={`mt-2 flex items-center gap-1.5 text-base sm:text-lg font-black font-mono transition-colors ${
                isUrgent ? "text-red-400 animate-pulse" : "text-emerald-400"
              }`}
            >
              <Timer size={16} /> {secondsLeft}s
            </div>
          </div>

          {/* Opponent Player */}
          <div className="text-right flex-1 truncate">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              RIVAL ({oppPlayer.username})
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">{oppScore} pts</div>
          </div>
        </div>

        {/* Synchronized Countdown Bar */}
        <div className="mt-4 h-1.5 bg-zinc-950 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${isUrgent ? "bg-red-500" : "bg-emerald-400"}`}
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Opponent Answer Lock Status Indicator */}
      {match.opponentAnswered && (
        <div className="flex items-center justify-end gap-2 text-xs font-bold text-amber-400/90 animate-in fade-in">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span>El rival ya ha fijado su respuesta</span>
        </div>
      )}

      {/* Question Card */}
      <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
              {match.question.category}
            </span>
            {match.question.subcategory && (
              <span className="text-xs text-zinc-400 font-semibold">{match.question.subcategory}</span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 uppercase font-bold">
            Dificultad: {match.question.difficulty}
          </span>
        </div>

        <h2 className="text-lg sm:text-2xl font-bold text-white leading-snug mb-8">
          {match.question.prompt}
        </h2>

        {/* Options Grid */}
        <div className="space-y-3">
          {match.question.options.map((option, idx) => {
            const isSelected = selectedOptionId === option.id;
            const keyLabel = idx + 1;

            return (
              <button
                key={option.id}
                disabled={hasSubmittedAnswer}
                onClick={() => submitAnswer(option.id)}
                className={`w-full min-h-[58px] p-4 rounded-xl border flex items-center justify-between gap-4 text-left transition-all ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-500/15 text-white shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                    : hasSubmittedAnswer
                    ? "border-zinc-800/60 bg-zinc-950/40 text-zinc-500 opacity-60 cursor-not-allowed"
                    : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:text-white text-zinc-300 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`h-8 w-8 rounded-lg grid place-items-center text-xs font-black shrink-0 transition-colors ${
                      isSelected ? "bg-emerald-400 text-black" : "bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm sm:text-base font-medium">{option.text}</span>
                </div>

                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <kbd className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                    {keyLabel}
                  </kbd>
                </div>
              </button>
            );
          })}
        </div>

        {/* Submitting Status Banner */}
        {hasSubmittedAnswer && (
          <div className="mt-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs font-bold text-zinc-300 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle size={16} />
              <span>Respuesta transmitida al servidor autoritativo</span>
            </div>
            <span className="text-zinc-500">Esperando cierre de ronda...</span>
          </div>
        )}
      </div>
    </div>
  );
}
