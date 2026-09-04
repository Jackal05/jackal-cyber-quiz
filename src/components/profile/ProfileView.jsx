import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import RankBadge from "../common/RankBadge.jsx";
import {
  User,
  ShieldCheck,
  Trophy,
  Flame,
  Target,
  Clock,
  Edit2,
  Check,
  X,
  Zap,
  BarChart3,
  LogOut,
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
        .then((data) => {
          setStats(data.categoryStats || []);
        })
        .catch((err) => console.error("Profile stats load failed:", err));
    }
  }, [user?.username]);

  const handleSaveCallsign = async () => {
    setEditError("");
    const res = await updateCallsign(newCallsign);
    if (res.success) {
      setIsEditingCallsign(false);
    } else {
      setEditError(res.error || "Failed to update");
    }
  };

  const winRate = user?.battles_played > 0 ? Math.round((user.wins / user.battles_played) * 100) : 0;
  const accuracy = user?.total_questions > 0 ? Math.round((user.total_correct / user.total_questions) * 100) : 0;
  const avgSpeed = user?.total_questions > 0 ? (user.total_response_time_ms / user.total_questions / 1000).toFixed(2) : "0.00";

  // XP progression calculation
  const currentLvlXp = Math.pow((user?.level || 1) - 1, 2) * 100;
  const nextLvlXp = Math.pow(user?.level || 1, 2) * 100;
  const xpInLevel = (user?.xp || 0) - currentLvlXp;
  const needed = nextLvlXp - currentLvlXp;
  const levelProgressPct = Math.min(100, Math.max(0, Math.round((xpInLevel / (needed || 100)) * 100)));

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-300">
      {/* Header Profile Card */}
      <div className="rounded-3xl border border-zinc-800 bg-[#090d0a] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center text-2xl font-black text-white shadow-inner">
              {user?.username?.slice(0, 2).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-3">
                {isEditingCallsign ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCallsign}
                      onChange={(e) => setNewCallsign(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-emerald-400 bg-zinc-950 text-sm font-black text-white focus:outline-none"
                      maxLength={20}
                    />
                    <button
                      onClick={handleSaveCallsign}
                      className="h-8 w-8 rounded-lg bg-emerald-400 text-black grid place-items-center cursor-pointer"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setIsEditingCallsign(false)}
                      className="h-8 w-8 rounded-lg bg-zinc-800 text-zinc-400 grid place-items-center cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white">{user?.username}</h1>
                    <button
                      onClick={() => setIsEditingCallsign(true)}
                      className="p-1 text-zinc-500 hover:text-white transition-colors"
                      title="Cambiar Callsign"
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {editError && <div className="text-xs text-red-400 mt-1">{editError}</div>}

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-400 font-bold">Nivel {user?.level || 1} Operador</span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-400">{user?.xp || 0} XP acumulados</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <RankBadge rank={user?.rank} size="lg" />
            <span className="text-xs text-zinc-500 font-mono">
              Peak: {user?.peak_rating || user?.rating || 1200} MMR
            </span>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="pt-6 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400 font-bold flex items-center gap-1.5">
              <Zap size={14} className="text-emerald-400" /> Progreso de Nivel {user?.level || 1}
            </span>
            <span className="text-zinc-400 font-mono">
              {xpInLevel} / {needed} XP ({levelProgressPct}%)
            </span>
          </div>
          <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${levelProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Combat Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-zinc-800 bg-[#090d0a]">
          <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Batallas 1v1</span>
          <div className="text-2xl font-black text-white">{user?.battles_played || 0}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {user?.wins || 0}V - {user?.losses || 0}D
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-800 bg-[#090d0a]">
          <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Win Rate</span>
          <div className="text-2xl font-black text-emerald-400">{winRate}%</div>
          <div className="text-xs text-zinc-500 mt-1">Efectividad global</div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-800 bg-[#090d0a]">
          <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Precisión</span>
          <div className="text-2xl font-black text-white">{accuracy}%</div>
          <div className="text-xs text-zinc-500 mt-1">
            {user?.total_correct || 0}/{user?.total_questions || 0} correctas
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-800 bg-[#090d0a]">
          <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Racha Victorias</span>
          <div className="text-2xl font-black text-amber-400 flex items-center gap-1">
            <Flame size={20} /> {user?.current_streak || 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Mejor récord: {user?.best_streak || 0}</div>
        </div>
      </div>

      {/* Category Performance Breakdown */}
      {stats.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-400" /> Rendimiento por Área Técnica
            </h3>
            <span className="text-xs text-zinc-500">Acumulado en combates</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {stats.map((s) => {
              const pct = Math.round((s.correct_count / (s.total_count || 1)) * 100);
              return (
                <div key={s.category} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-xs font-bold text-zinc-300 truncate mb-1">{s.category}</div>
                  <div className="text-xl font-black text-white mb-2">{pct}%</div>
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pct >= 70 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-2">
                    {s.correct_count} de {s.total_count} correctas
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account Settings / Switch */}
      <div className="pt-4 flex items-center justify-between">
        <button
          onClick={onOpenAuthModal}
          className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
        >
          Iniciar sesión con otra cuenta o cambiar contraseña
        </button>

        <button
          onClick={logout}
          className="text-xs font-bold text-zinc-500 hover:text-red-400 flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut size={14} /> Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
