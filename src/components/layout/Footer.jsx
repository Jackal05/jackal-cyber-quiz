import React from "react";
import { Shield, Activity, Radio, Terminal } from "lucide-react";

export default function Footer({ onNavigate }) {
  return (
    <footer className="mt-20 border-t border-emerald-300/[.08] bg-[#020604]/85 text-xs text-zinc-600 py-9 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid md:grid-cols-[1fr_auto_1fr] items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] grid place-items-center text-emerald-300">
            <Shield size={16} />
          </div>
          <div>
            <div className="font-black text-zinc-300 tracking-wide">JACKAL CYBERSECURITY COMMUNITY</div>
            <div className="cyber-mono text-[8px] uppercase tracking-[.14em] text-zinc-700 mt-1">training · battle · operator telemetry</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-[10px] font-black uppercase tracking-wider">
          <button onClick={() => onNavigate("training")} className="hover:text-emerald-300 transition-colors">Training Lab</button>
          <button onClick={() => onNavigate("battle")} className="hover:text-emerald-300 transition-colors">1v1 Arena</button>
          <button onClick={() => onNavigate("leaderboard")} className="hover:text-emerald-300 transition-colors">Ranking</button>
          <button onClick={() => onNavigate("history")} className="hover:text-emerald-300 transition-colors">Intel Log</button>
        </div>

        <div className="md:justify-self-end flex items-center gap-2 cyber-mono text-[8px] uppercase tracking-[.13em] text-zinc-700">
          <span className="h-2 w-2 rounded-full bg-emerald-300 cyber-status-dot" />
          <span>system nominal · © {new Date().getFullYear()} jackal</span>
        </div>
      </div>
    </footer>
  );
}
