import React from "react";
import { Shield, Terminal, Zap, ExternalLink } from "lucide-react";

export default function Footer({ onNavigate }) {
  return (
    <footer className="border-t border-zinc-900 bg-[#040605] text-xs text-zinc-500 py-10 mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 grid place-items-center text-emerald-400">
            <Shield size={16} />
          </div>
          <div>
            <div className="font-black text-zinc-300">JACKAL CYBERSECURITY COMMUNITY</div>
            <div className="text-[11px] text-zinc-600">Entrena · Compite · Valida tu criterio en combate</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-zinc-400 font-semibold">
          <button onClick={() => onNavigate("training")} className="hover:text-emerald-400 transition-colors">
            Training Lab
          </button>
          <button onClick={() => onNavigate("battle")} className="hover:text-emerald-400 transition-colors">
            1v1 Arena
          </button>
          <button onClick={() => onNavigate("leaderboard")} className="hover:text-emerald-400 transition-colors">
            Leaderboard
          </button>
          <button onClick={() => onNavigate("history")} className="hover:text-emerald-400 transition-colors">
            Historial
          </button>
        </div>

        <div className="text-zinc-600 text-[11px] text-center md:text-right">
          © {new Date().getFullYear()} Jackal · Rigor técnico inspirado en CISSP, CCNA & ISO 27037
        </div>
      </div>
    </footer>
  );
}
