import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useBattleSocket } from "../../context/BattleSocketContext.jsx";
import { BATTLE_MODES } from "../../config/constants.js";
import RankBadge from "../common/RankBadge.jsx";
import { Swords, Trophy, History, Target, Flame, Clock, Radio, ChevronRight, Zap, ShieldCheck, Network, Fingerprint, Crosshair, Activity } from "lucide-react";

export default function BattleLobby({ onFindOpponent, onViewHistory, onViewLeaderboard }) {
  const { user } = useAuth();
  const { onlineCount } = useBattleSocket();
  const [selectedMode, setSelectedMode] = useState("ciberseguridad");

  const winRate = user?.battles_played > 0 ? Math.round((user.wins / user.battles_played) * 100) : 0;
  const avgResponseTime = user?.total_questions > 0 ? (user.total_response_time_ms / user.total_questions / 1000).toFixed(1) : "0.0";
  const selected = BATTLE_MODES.find((mode) => mode.id === selectedMode) || BATTLE_MODES[0];

  const iconFor = (id) => id === "redes" ? Network : id === "forense" ? Fingerprint : ShieldCheck;
  const accentFor = (id) => id === "redes" ? "sky" : id === "forense" ? "amber" : "emerald";

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <section className="cyber-panel cyber-grid-surface rounded-[26px] p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="cyber-kicker"><Radio size={12} className="animate-pulse" /> live combat network</div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-[-.04em] mt-3">BATTLE <span className="text-emerald-300 cyber-glow-text">1v1</span></h1>
            <p className="text-sm text-zinc-400 mt-3 max-w-2xl">Matchmaking competitivo en tiempo real. Cinco rondas, puntuación autoritativa y especialidades técnicas separadas.</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-300/[.10] bg-black/25">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 cyber-status-dot" />
            <div>
              <div className="cyber-mono text-[8px] uppercase tracking-[.14em] text-zinc-600">analyst nodes online</div>
              <div className="text-lg font-black text-white">{onlineCount}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-12 gap-6">
        <aside className="xl:col-span-4 cyber-panel rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 pb-5 border-b cyber-divider">
            <div>
              <div className="cyber-kicker"><Activity size={12} /> combat profile</div>
              <h2 className="text-2xl font-black text-white mt-2">{user?.username || "Analyst"}</h2>
              <div className="cyber-mono text-[9px] text-zinc-600 mt-1 uppercase tracking-wider">level {user?.level || 1} · {user?.xp || 0} xp</div>
            </div>
            <RankBadge rank={user?.rank} size="md" />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <BattleStat label="MMR" value={user?.rating || 1200} icon={Target} />
            <BattleStat label="WIN RATE" value={`${winRate}%`} icon={Crosshair} />
            <BattleStat label="STREAK" value={user?.current_streak || 0} icon={Flame} accent="text-amber-300" />
            <BattleStat label="AVG TIME" value={`${avgResponseTime}s`} icon={Clock} accent="text-sky-300" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-6 pt-5 border-t cyber-divider">
            <button onClick={onViewLeaderboard} className="h-10 rounded-lg border border-emerald-300/[.08] bg-black/20 hover:border-emerald-300/20 text-zinc-400 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2"><Trophy size={13} className="text-amber-300" /> Ranking</button>
            <button onClick={onViewHistory} className="h-10 rounded-lg border border-emerald-300/[.08] bg-black/20 hover:border-emerald-300/20 text-zinc-400 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2"><History size={13} className="text-emerald-300" /> Intel Log</button>
          </div>
        </aside>

        <section className="xl:col-span-8 cyber-panel rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="cyber-kicker"><Swords size={12} /> select combat module</div>
              <h2 className="text-2xl font-black text-white mt-2">Choose your discipline</h2>
            </div>
            <span className="cyber-mono text-[8px] font-black px-2.5 py-1 rounded-md border border-emerald-300/20 bg-emerald-300/[.06] text-emerald-300 tracking-wider">3 MODULES ACTIVE</span>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {BATTLE_MODES.map((mode) => {
              const Icon = iconFor(mode.id);
              const accent = accentFor(mode.id);
              const isSelected = selectedMode === mode.id;
              const selectedClasses = accent === "sky" ? "border-sky-300/45 bg-sky-300/[.055] shadow-[0_0_26px_rgba(56,215,255,.06)]" : accent === "amber" ? "border-amber-300/45 bg-amber-300/[.05] shadow-[0_0_26px_rgba(248,196,92,.05)]" : "border-emerald-300/45 bg-emerald-300/[.055] shadow-[0_0_26px_rgba(80,245,165,.06)]";
              const iconClasses = accent === "sky" ? "text-sky-300 border-sky-300/15 bg-sky-300/[.04]" : accent === "amber" ? "text-amber-300 border-amber-300/15 bg-amber-300/[.04]" : "text-emerald-300 border-emerald-300/15 bg-emerald-300/[.04]";
              return (
                <button key={mode.id} onClick={() => setSelectedMode(mode.id)} className={`text-left p-5 rounded-xl border transition-all min-h-[190px] relative overflow-hidden ${isSelected ? selectedClasses : "border-emerald-300/[.08] bg-black/20 hover:border-emerald-300/18"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className={`h-11 w-11 rounded-xl border grid place-items-center ${iconClasses}`}><Icon size={19} /></div>
                    <span className="cyber-mono text-[8px] text-zinc-600 tracking-[.12em]">{mode.id.toUpperCase()}</span>
                  </div>
                  <h3 className="text-base font-black text-white mt-5">{mode.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mt-2">{mode.description}</p>
                  <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between cyber-mono text-[8px] text-zinc-700 uppercase tracking-wider"><span>ranked</span><span>{isSelected ? "selected" : "standby"}</span></div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-emerald-300/[.08] bg-black/20 p-4">
            <div className="cyber-kicker"><Zap size={12} /> engagement protocol</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <Rule label="MODULE" value={selected.title} />
              <Rule label="ROUNDS" value="5 QUESTIONS" />
              <Rule label="TIME" value="20S / ROUND" />
              <Rule label="TIE" value="SUDDEN DEATH" />
            </div>
          </div>

          <button onClick={() => onFindOpponent(selectedMode)} className="w-full h-14 mt-6 rounded-xl bg-emerald-300 hover:bg-emerald-200 text-[#021008] font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-[.99] shadow-[0_0_32px_rgba(80,245,165,.15)]">
            <Crosshair size={19} /> INITIATE MATCHMAKING · {selected.title.toUpperCase()} <ChevronRight size={17} />
          </button>
        </section>
      </div>
    </div>
  );
}

function BattleStat({ label, value, icon: Icon, accent = "text-white" }) {
  return <div className="cyber-card rounded-xl p-4"><div className="flex items-center justify-between"><span className="cyber-mono text-[8px] text-zinc-600 tracking-wider">{label}</span><Icon size={13} className="text-emerald-300" /></div><div className={`text-xl font-black mt-3 ${accent}`}>{value}</div></div>;
}

function Rule({ label, value }) {
  return <div><div className="cyber-mono text-[8px] uppercase tracking-[.12em] text-zinc-700">{label}</div><div className="text-[11px] font-black text-zinc-300 mt-1">{value}</div></div>;
}
