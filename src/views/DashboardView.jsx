import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBattleSocket } from "../context/BattleSocketContext.jsx";
import RankBadge from "../components/common/RankBadge.jsx";
import {
  Swords,
  GraduationCap,
  Trophy,
  ShieldCheck,
  Target,
  Clock,
  ArrowRight,
  Flame,
  AlertTriangle,
  History,
  Radio,
  Activity,
  Network,
  Fingerprint,
  Crosshair,
  Gauge,
  Server,
} from "lucide-react";

export default function DashboardView({ onNavigate, onPracticeTopic }) {
  const { user, token } = useAuth();
  const { onlineCount } = useBattleSocket();
  const [recentMatch, setRecentMatch] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);

  useEffect(() => {
    if (user?.username) {
      fetch(`/api/profile/${encodeURIComponent(user.username)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.categoryStats) setCategoryStats(data.categoryStats);
        })
        .catch(() => {});

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      fetch(`/api/battle/history?userId=${user.id}`, { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.matches && data.matches.length > 0) setRecentMatch(data.matches[0]);
        })
        .catch(() => {});
    }
  }, [user?.username, user?.id, token]);

  const weakestArea = categoryStats.length > 0
    ? [...categoryStats].sort(
        (a, b) =>
          a.correct_count / (a.total_count || 1) -
          b.correct_count / (b.total_count || 1)
      )[0]
    : null;

  const winRate = user?.battles_played > 0 ? Math.round((user.wins / user.battles_played) * 100) : 0;

  const tracks = [
    {
      id: "ciberseguridad",
      title: "Ciberseguridad",
      code: "CYB-01",
      sub: "Threats · Defense · Incident Response",
      icon: ShieldCheck,
      accent: "emerald",
    },
    {
      id: "redes",
      title: "Redes",
      code: "NET-02",
      sub: "Routing · Switching · Protocol Analysis",
      icon: Network,
      accent: "cyan",
    },
    {
      id: "forense",
      title: "Informática Forense",
      code: "FOR-03",
      sub: "Evidence · Memory · Digital Artifacts",
      icon: Fingerprint,
      accent: "amber",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <section className="cyber-panel cyber-grid-surface rounded-[26px] p-6 sm:p-8 lg:p-10 min-h-[300px] flex items-center">
        <div className="absolute inset-y-0 right-0 w-[42%] opacity-20 cyber-noise pointer-events-none" />
        <div className="absolute right-8 top-8 hidden lg:flex items-center gap-2 cyber-mono text-[9px] uppercase tracking-[.16em] text-zinc-600">
          <span className="h-2 w-2 rounded-full bg-emerald-300 cyber-status-dot" />
          command uplink stable
        </div>

        <div className="relative z-10 grid lg:grid-cols-[1.3fr_.7fr] gap-8 w-full items-end">
          <div className="max-w-3xl">
            <div className="cyber-kicker mb-4">
              <Radio size={13} className="animate-pulse" /> Jackal cyber command
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-[-.045em] leading-[.98] cyber-glow-text">
              Train like an analyst.
              <span className="block text-emerald-300">Operate under pressure.</span>
            </h1>
            <p className="mt-5 text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
              Laboratorio técnico, inteligencia de rendimiento y duelos 1v1 en tiempo real para validar criterio en ciberseguridad, redes e informática forense.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-7">
              <button
                onClick={() => onNavigate("battle")}
                className="h-12 px-6 rounded-xl bg-emerald-300 hover:bg-emerald-200 text-[#031008] font-black text-xs tracking-wide flex items-center justify-center gap-2.5 shadow-[0_0_28px_rgba(80,245,165,.16)] transition-all active:scale-[.99]"
              >
                <Crosshair size={17} /> ENTER 1v1 ARENA <ArrowRight size={15} />
              </button>
              <button
                onClick={() => onNavigate("training")}
                className="h-12 px-6 rounded-xl border border-emerald-300/15 bg-black/25 hover:border-emerald-300/30 text-zinc-200 font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-colors"
              >
                <GraduationCap size={17} className="text-emerald-300" /> OPEN TRAINING LAB
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:max-w-sm lg:justify-self-end w-full">
            <SignalCell label="ACTIVE NODES" value={onlineCount} icon={Server} accent="text-emerald-300" />
            <SignalCell label="CURRENT MMR" value={user?.rating || 1200} icon={Gauge} accent="text-sky-300" />
            <SignalCell label="WIN RATE" value={`${winRate}%`} icon={Target} accent="text-white" />
            <SignalCell label="WIN STREAK" value={user?.current_streak || 0} icon={Flame} accent="text-amber-300" />
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <section className="cyber-panel rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 pb-5 border-b cyber-divider">
              <div>
                <div className="cyber-kicker"><Activity size={12} /> operator telemetry</div>
                <h2 className="text-2xl font-black text-white mt-2 tracking-tight">Operational Readiness</h2>
              </div>
              <RankBadge rank={user?.rank} size="md" />
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-5">
              <Metric label="ELO RATING" value={user?.rating || 1200} suffix="MMR" detail={`Peak ${user?.peak_rating || 1200}`} />
              <Metric label="BATTLE RECORD" value={`${user?.wins || 0}-${user?.losses || 0}`} suffix="W/L" detail={`${user?.battles_played || 0} total battles`} />
              <Metric label="CURRENT STREAK" value={user?.current_streak || 0} suffix="WINS" detail={`Best ${user?.best_streak || 0}`} amber />
            </div>

            <div className="mt-5 p-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[.035] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="cyber-mono text-[9px] uppercase tracking-[.16em] text-emerald-300 font-black">ranked network // online</div>
                <div className="text-sm font-black text-white mt-1">1v1 matchmaking ready</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Ciberseguridad · Redes · Informática Forense</div>
              </div>
              <button
                onClick={() => onNavigate("battle")}
                className="h-10 px-4 rounded-lg bg-emerald-300 text-black font-black text-[11px] flex items-center justify-center gap-2 hover:bg-emerald-200"
              >
                FIND OPPONENT <ArrowRight size={13} />
              </button>
            </div>
          </section>

          <section className="cyber-panel rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="cyber-kicker"><History size={12} /> latest engagement</div>
                <h3 className="text-lg font-black text-white mt-2">Combat Log</h3>
              </div>
              <button onClick={() => onNavigate("history")} className="text-[10px] cyber-mono uppercase tracking-wider text-zinc-500 hover:text-emerald-300">open intel log →</button>
            </div>

            {recentMatch ? (
              <div className="cyber-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-xl grid place-items-center cyber-mono text-[10px] font-black border ${recentMatch.winner_id === user?.id ? "bg-emerald-300/[.08] text-emerald-300 border-emerald-300/20" : "bg-red-400/[.07] text-red-300 border-red-400/20"}`}>
                    {recentMatch.winner_id === user?.id ? "WIN" : "LOSS"}
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">vs {user?.id === recentMatch.player1_id ? recentMatch.p2_username : recentMatch.p1_username}</div>
                    <div className="cyber-mono text-[10px] text-zinc-600 mt-1">SCORE {recentMatch.player1_score} : {recentMatch.player2_score}</div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="cyber-mono text-[9px] text-zinc-600 uppercase tracking-wider">battle mode</div>
                  <div className="text-xs font-bold text-zinc-300 mt-1">{recentMatch.mode}</div>
                </div>
              </div>
            ) : (
              <div className="cyber-card rounded-xl p-7 text-center">
                <Crosshair size={22} className="mx-auto text-zinc-700" />
                <div className="text-sm font-bold text-zinc-300 mt-3">No combat telemetry yet</div>
                <div className="text-[11px] text-zinc-600 mt-1">Enter a 1v1 battle to begin recording engagements.</div>
              </div>
            )}
          </section>
        </div>

        <div className="xl:col-span-4 space-y-6">
          {weakestArea && (
            <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[.035] p-5 shadow-xl relative overflow-hidden">
              <div className="cyber-kicker !text-amber-300"><AlertTriangle size={12} /> vulnerability in skill profile</div>
              <h3 className="text-lg font-black text-white mt-3">{weakestArea.category}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                Tasa de acierto actual: {Math.round((weakestArea.correct_count / (weakestArea.total_count || 1)) * 100)}%. Refuerza este vector antes del próximo duelo.
              </p>
              <button
                onClick={() => onPracticeTopic(weakestArea.category.toLowerCase().includes("red") ? "redes" : weakestArea.category.toLowerCase().includes("forense") ? "forense" : "ciberseguridad")}
                className="w-full h-10 mt-4 rounded-lg border border-amber-300/30 bg-amber-300 text-black font-black text-[11px] flex items-center justify-center gap-2"
              >
                <GraduationCap size={14} /> PATCH THIS SKILL GAP
              </button>
            </section>
          )}

          <section className="cyber-panel rounded-2xl p-5">
            <div className="cyber-kicker"><GraduationCap size={12} /> training modules</div>
            <h3 className="text-xl font-black text-white mt-2">Select a discipline</h3>
            <div className="space-y-3 mt-5">
              {tracks.map((track) => {
                const Icon = track.icon;
                const color = track.accent === "cyan" ? "text-sky-300 border-sky-300/15 bg-sky-300/[.03]" : track.accent === "amber" ? "text-amber-300 border-amber-300/15 bg-amber-300/[.03]" : "text-emerald-300 border-emerald-300/15 bg-emerald-300/[.03]";
                return (
                  <button
                    key={track.id}
                    onClick={() => onPracticeTopic(track.id)}
                    className="cyber-card w-full rounded-xl p-4 text-left flex items-center gap-4 group"
                  >
                    <div className={`h-11 w-11 rounded-xl border grid place-items-center ${color}`}><Icon size={19} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="cyber-mono text-[8px] text-zinc-600 tracking-wider">{track.code}</span>
                        <span className="h-px flex-1 bg-emerald-300/[.06]" />
                      </div>
                      <div className="text-sm font-black text-white mt-1 group-hover:text-emerald-300 transition-colors">{track.title}</div>
                      <div className="text-[10px] text-zinc-600 mt-1 truncate">{track.sub}</div>
                    </div>
                    <ArrowRight size={15} className="text-zinc-700 group-hover:text-emerald-300" />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SignalCell({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-emerald-300/[.09] bg-black/25 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="cyber-mono text-[8px] uppercase tracking-[.14em] text-zinc-600">{label}</span>
        <Icon size={13} className={accent} />
      </div>
      <div className={`text-2xl font-black mt-3 ${accent}`}>{value}</div>
    </div>
  );
}

function Metric({ label, value, suffix, detail, amber = false }) {
  return (
    <div className="cyber-card rounded-xl p-4">
      <div className="cyber-mono text-[8px] uppercase tracking-[.15em] text-zinc-600">{label}</div>
      <div className={`text-2xl font-black mt-2 ${amber ? "text-amber-300" : "text-white"}`}>
        {value} <span className="text-[9px] text-emerald-300 cyber-mono">{suffix}</span>
      </div>
      <div className="text-[10px] text-zinc-600 mt-1.5">{detail}</div>
    </div>
  );
}
