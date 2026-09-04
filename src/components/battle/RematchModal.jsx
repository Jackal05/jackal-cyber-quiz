import React, { useState, useEffect } from "react";
import { RotateCcw, Check, X } from "lucide-react";

export default function RematchModal({ rematchOffered, onAccept, onDecline }) {
  const [timeLeft, setTimeLeft] = useState(rematchOffered?.timeoutSec || 20);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!rematchOffered) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-emerald-400/40 bg-[#090d0a] p-6 shadow-2xl text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 grid place-items-center">
          <RotateCcw size={28} className="animate-spin-slow" />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
            DESAFÍO RECIBIDO
          </span>
          <h3 className="text-xl font-black text-white">
            {rematchOffered.fromUsername} solicita una revancha
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            ¿Aceptas disputar una nueva batalla 1v1 con este operador?
          </p>
        </div>

        <div className="text-xs font-mono text-zinc-500 font-bold">
          Expira en: <span className="text-emerald-400 font-black">{timeLeft}s</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onAccept}
            className="h-11 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Check size={16} /> ACEPTAR REVANCHA
          </button>
          <button
            onClick={onDecline}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <X size={16} /> RECHAZAR
          </button>
        </div>
      </div>
    </div>
  );
}
