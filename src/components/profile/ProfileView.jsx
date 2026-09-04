import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import RankBadge from "../common/RankBadge.jsx";
import {
  Flame,
  Edit2,
  Check,
  X,
  Zap,
  BarChart3,
  LogOut,
  Activity,
  ShieldCheck,
  Crosshair,
  Gauge,
  Fingerprint,
  Radio,
} from "lucide-react";

export default function ProfileView({ onOpenAuthModal }) {
  const { user, updateCallsign, logout } = useAuth();
  const [isEditingCallsign, setIsEditingCallsign] = useState(false);
  const [newCallsign, setNewCallsign] = useState(user?.username || "");
  const [editError, setEditError] = useState("");
  const [stats, setStats] = useState([]);

  useEffect(() => {
    if (user?.username) {
      setNewCallsign(user.username);
      fetch(`/api/profile/${encodeURIComponent(user.username)}`)
        .then((res) => res.json())
        .then((data) => setStats(data.categoryStats || []))
        .catch((err) => console.error("Profile stats load failed:", err));
    }
  }, [user?.username]);

  const handleSaveCallsign = async () => {
    setEditError("");
    const res = await updateCallsign(newCallsign);
    if (res.success) setIsEditingCallsign(false);
    else setEditError(res.error || "Failed to update");
  };

  const winRate = user?.battles_played > 0 ? Math.round((user.wins / user.battles_played) * 100) : 0;
  const accuracy = user?.total_questions > 0 ? Math.round((user.total_correct / user.total_questions) * 100) : 0;
  const avgSpeed = user?.total_questions > 0 ? (user.total_response_time_ms / user.total_questions / 1000).toFixed(2) : "0.00";
  const currentLvlXp = Math.pow((user?.level || 1) - 1, 2) * 100;
  const nextLvlXp = Math.pow(user?.level || 1, 2) * 100;
  const xpInLevel = (user?.xp || 0) - currentLvlXp;
  const needed = nextLvlXp - currentLvlXp;
  const levelProgressPct = Math.min(100, Math.max(0, Math.round((xpInLevel / (needed || 100)) * 100)));

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-4 space-y-6 animate-in fade-in duration-300">
      <section className="cyber-panel cyber-grid-surface rounded-[26px] p-6 sm:p-8 relative">
        <div className="absolute right-6 top-5 hidden sm:flex items-center gap-2 cyber-mono text-[9px] uppercase tracking-[.15em] text-zinc-600">
          <Radio size={11} className="text-emerald-300" /> operator identity verified
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="flex items-start gap-5">
            <div className="relative h-20 w-20 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.055] grid place-items-center text-2xl font-black text-white shadow-[0_0_30px_rgba(80,245,165,.08)]">
              {user?.username?.slice(0, 2).toUpperCase()}
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-300 border-2 border-[#06100b] cyber-status-dot" />
            </div>

            <div>
              <div className="cyber-kicker"><Fingerprint size={12} /> operator profile</div>
              <div className="flex items-center gap-3 mt-3">
                {isEditingCallsign ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={newCallsign}
                      onChange={(e) => setNewCallsign(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-emerald-300/30 bg-black/35 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/20"
                      maxLength={20}
                    />
                    <button onClick={handleSaveCallsign} className="h-10 w-10 rounded-lg bg-emerald-300 text-black grid place-items-center"><Check size={16} /></button>
                    <button onClick={() => setIsEditingCallsign(false)} className="h-10 w-10 rounded-lg border border-emerald-300/10 bg-black/25 text-zinc-400 grid place-items-center"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight cyber-glow-text">{user?.username}</h1>
                    <button onClick={() => setIsEditingCallsign(true)} className="p-1.5 text-zinc-600 hover:text-emerald-300 transition-colors" title="Cambiar Callsign"><Edit2 size={15} /></button>
                  </>
                )}
              </div>
              {editError && <div className="text-xs text-red-300 mt-2">{editError}</div>}
              <div className="cyber-mono text-[10px] text-zinc-500 mt-2 uppercase tracking-[.1em]">
                level {user?.level || 1} operator · {user?.xp || 0} xp · clearance active
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col lg:items-end gap-3">
            <RankBadge rank={user?.rank} size="lg" />
            <div className="cyber-mono text-[9px] text-zinc-600 uppercase tracking-[.12em]">peak rating {user?.peak_rating || user?.rating || 1200} mmr</div>
          </div>
        </div>

        <div className="mt-7 pt-5 border-t cyber-divider">
          <div className="flex justify-between text-[10px] mb-2.5">
            <span className="cyber-mono uppercase tracking-[.12em] text-zinc-500 flex items-center gap-2"><Zap size={13} className="text-emerald-300" /> experience progression</span>
            <span className="cyber-mono text-zinc-500">{xpInLevel} / {needed} XP · {levelProgressPct}%</span>
          </div>
          <div className="h-2 bg-black/35 rounded-full overflow-hidden border border-emerald-300/[.08]">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-200 transition-all duration-500 shadow-[0_0_16px_rgba(80,245,165,.30)]" style={{ width: `${levelProgressPct}%` }} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <TelemetryCard icon={Crosshair} label="1V1 ENGAGEMENTS" value={user?.battles_played || 0} detail={`${user?.wins || 0}W · ${user?.losses || 0}L`} />
        <TelemetryCard icon={Gauge} label="WIN RATE" value={`${winRate}%`} detail="Competitive effectiveness" accent="text-emerald-300" />
        <TelemetryCard icon={ShieldCheck} label="ACCURACY" value={`${accuracy}%`} detail={`${user?.total_correct || 0}/${user?.total_questions || 0} validated`} />
        <TelemetryCard icon={Flame} label="CURRENT STREAK" value={user?.current_streak || 0} detail={`Best ${user?.best_streak || 0}`} accent="text-amber-300" />
      </section>

      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 cyber-panel rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <div className="cyber-kicker"><BarChart3 size={12} /> technical proficiency</div>
              <h3 className="text-xl font-black text-white mt-2">Skill Telemetry</h3>
            </div>
            <div className="cyber-mono text-[9px] text-zinc-600 uppercase tracking-wider">avg response {avgSpeed}s</div>
          </div>

          {stats.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {stats.map((s) => {
                const pct = Math.round((s.correct_count / (s.total_count || 1)) * 100);
                const bar = pct >= 70 ? "bg-emerald-300" : pct >= 50 ? "bg-amber-300" : "bg-red-400";
                return (
                  <div key={s.category} className="cyber-card rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-zinc-200 truncate">{s.category}</div>
                      <div className="cyber-mono text-[9px] text-zinc-600">{pct}%</div>
                    </div>
                    <div className="h-1.5 bg-black/30 rounded-full overflow-hidden mt-4 border border-emerald-300/[.06]">
                      <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="cyber-mono text-[8px] text-zinc-600 mt-3 uppercase tracking-wider">{s.correct_count}/{s.total_count} correct vectors</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cyber-card rounded-xl p-8 text-center">
              <Activity size={22} className="mx-auto text-zinc-700" />
              <div className="text-sm font-bold text-zinc-300 mt-3">No telemetry collected</div>
              <div className="text-[11px] text-zinc-600 mt-1">Complete training or battle engagements to populate this grid.</div>
            </div>
          )}
        </section>

        <aside className="lg:col-span-4 cyber-panel rounded-2xl p-6 flex flex-col justify-between min-h-[230px]">
          <div>
            <div className="cyber-kicker"><Activity size={12} /> account control</div>
            <h3 className="text-xl font-black text-white mt-2">Operator Session</h3>
            <p className="text-xs text-zinc-500 leading-relaxed mt-3">Manage your identity or terminate this active session. Competitive telemetry remains attached to your operator profile.</p>
          </div>
          <div className="space-y-2.5 mt-6">
            <button onClick={onOpenAuthModal} className="w-full h-10 rounded-lg border border-emerald-300/15 bg-emerald-300/[.04] text-emerald-300 font-black text-[10px] uppercase tracking-wider hover:bg-emerald-300/[.07]">switch identity / credentials</button>
            <button onClick={logout} className="w-full h-10 rounded-lg border border-red-400/10 bg-red-400/[.025] text-zinc-500 hover:text-red-300 hover:border-red-400/20 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"><LogOut size={13} /> terminate session</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TelemetryCard({ icon: Icon, label, value, detail, accent = "text-white" }) {
  return (
    <div className="cyber-card rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="cyber-mono text-[8px] uppercase tracking-[.14em] text-zinc-600">{label}</span>
        <Icon size={14} className="text-emerald-300" />
      </div>
      <div className={`text-2xl sm:text-3xl font-black mt-3 ${accent}`}>{value}</div>
      <div className="text-[10px] text-zinc-600 mt-1.5">{detail}</div>
    </div>
  );
}
