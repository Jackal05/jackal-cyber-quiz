import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import RankBadge from "../common/RankBadge.jsx";
import { Trophy, Medal, Target, Swords, Search, Flame, Radio } from "lucide-react";

export default function LeaderboardView() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(data.leaderboard || []);
      })
      .catch((err) => console.error("Leaderboard load failed:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = leaderboard.filter((item) =>
    item.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-400/10 border border-amber-400/20 text-[11px] font-black tracking-widest text-amber-300 uppercase mb-2">
            <Trophy size={13} /> Global Rankings
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            COMPETITIVE <span className="text-amber-400">LEADERBOARD</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Los analistas de ciberseguridad con mayor Elo rating y consistencia táctica.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar operador..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 bg-[#090d0a] shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-zinc-500 font-bold">
            <div className="h-8 w-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Cargando clasificaciones globales...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            No se encontraron analistas con ese callsign.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800/80 bg-zinc-950/70 text-[10px] uppercase tracking-wider font-black text-zinc-500">
                <tr>
                  <th className="py-3.5 px-4 text-center w-16">#</th>
                  <th className="py-3.5 px-4">Operador</th>
                  <th className="py-3.5 px-4">Rango</th>
                  <th className="py-3.5 px-4 text-right">Rating MMR</th>
                  <th className="py-3.5 px-4 text-center">W - L</th>
                  <th className="py-3.5 px-4 text-right">Win Rate</th>
                  <th className="py-3.5 px-4 text-center">Racha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filtered.map((item) => {
                  const isCurrentUser = user?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isCurrentUser ? "bg-emerald-500/[.07]" : "hover:bg-zinc-900/40"
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        {item.rankPosition === 1 ? (
                          <span className="inline-flex h-6 w-6 rounded-md bg-amber-400 text-black items-center justify-center font-black">
                            1
                          </span>
                        ) : item.rankPosition === 2 ? (
                          <span className="inline-flex h-6 w-6 rounded-md bg-slate-300 text-black items-center justify-center font-black">
                            2
                          </span>
                        ) : item.rankPosition === 3 ? (
                          <span className="inline-flex h-6 w-6 rounded-md bg-amber-700 text-white items-center justify-center font-black">
                            3
                          </span>
                        ) : (
                          <span className="text-zinc-500">{item.rankPosition}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white text-sm">{item.username}</span>
                          {isCurrentUser && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-400 text-black">
                              TÚ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Nivel {item.level}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <RankBadge rank={item.rank} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-white text-sm">
                        {item.rating}
                      </td>

                      <td className="py-3.5 px-4 text-center text-zinc-400 font-medium">
                        <span className="text-emerald-400 font-bold">{item.wins}</span> -{" "}
                        <span className="text-zinc-500">{item.losses}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black">
                        <span className={item.winRate >= 60 ? "text-emerald-400" : "text-zinc-400"}>
                          {item.winRate}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.current_streak > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                            <Flame size={12} /> {item.current_streak}
                          </span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
