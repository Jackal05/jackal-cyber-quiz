import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useBattleSocket } from "../../context/BattleSocketContext.jsx";
import RankBadge from "../common/RankBadge.jsx";
import {
  ShieldCheck,
  LayoutDashboard,
  Swords,
  GraduationCap,
  Trophy,
  History,
  Menu,
  X,
  Activity,
  Radio,
} from "lucide-react";

export default function Navbar({ currentRoute, onRouteChange, onOpenAuthModal }) {
  const { user } = useAuth();
  const { onlineCount } = useBattleSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Command", icon: LayoutDashboard },
    { id: "training", label: "Training Lab", icon: GraduationCap },
    { id: "battle", label: "Battle 1v1", icon: Swords, badge: "LIVE" },
    { id: "leaderboard", label: "Ranking", icon: Trophy },
    { id: "history", label: "Intel Log", icon: History },
  ];

  const handleNavClick = (id) => {
    onRouteChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="cyber-nav sticky top-0 z-40 border-b backdrop-blur-xl relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-[70px] flex items-center justify-between gap-4">
        <button
          onClick={() => handleNavClick("dashboard")}
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 rounded-xl group"
        >
          <div className="relative h-11 w-11 rounded-[14px] border border-emerald-300/25 bg-emerald-300/[.08] text-emerald-300 grid place-items-center shadow-[0_0_28px_rgba(80,245,165,.10)] group-hover:border-emerald-300/50 transition-colors">
            <ShieldCheck size={22} className="stroke-[2.2]" />
            <span className="absolute -right-1 -bottom-1 h-2.5 w-2.5 rounded-full bg-emerald-300 border-2 border-[#020705] cyber-status-dot" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-[15px] tracking-[.08em] leading-none">JACKAL</span>
              <span className="cyber-mono text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-300/20 bg-emerald-300/[.07] text-emerald-300 tracking-[.12em]">
                PROVING GROUND
              </span>
            </div>
            <div className="cyber-mono text-[8px] tracking-[.24em] text-zinc-500 font-bold mt-1.5">
              CYBER OPERATIONS PLATFORM
            </div>
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-1 rounded-xl border border-emerald-300/[.08] bg-black/20 p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-extrabold transition-all ${
                  isActive
                    ? "bg-emerald-300/[.09] text-white border border-emerald-300/15"
                    : "text-zinc-500 border border-transparent hover:text-zinc-200 hover:bg-white/[.025]"
                }`}
              >
                <Icon size={14} className={isActive ? "text-emerald-300" : "text-zinc-600"} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="cyber-mono text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-300 text-[#031008] tracking-wide shadow-[0_0_12px_rgba(80,245,165,.18)]">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute left-3 right-3 -bottom-[6px] h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <div
            className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-300/[.10] bg-black/25 text-[10px] text-zinc-500 font-semibold"
            title="Analistas conectados en tiempo real"
          >
            <Radio size={13} className="text-emerald-300" />
            <span className="cyber-mono uppercase tracking-[.12em]">node status</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
            </span>
            <span className="text-zinc-300 cyber-mono">{onlineCount}</span>
          </div>

          {user ? (
            <button
              onClick={() => handleNavClick("profile")}
              className={`flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border transition-all text-left group ${
                currentRoute === "profile"
                  ? "border-emerald-300/30 bg-emerald-300/[.06]"
                  : "border-emerald-300/[.09] bg-black/25 hover:border-emerald-300/20"
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-[#0b1510] grid place-items-center text-zinc-200 font-black text-[11px] border border-emerald-300/10 group-hover:border-emerald-300/30">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden xl:block min-w-[92px]">
                <div className="text-[11px] font-black text-white leading-tight truncate max-w-[105px]">{user.username}</div>
                <div className="cyber-mono text-[9px] text-zinc-600 flex items-center gap-1.5 mt-0.5">
                  <Activity size={10} className="text-emerald-300" />
                  <span className="text-emerald-300">{user.rating} MMR</span>
                  <span>LVL {user.level}</span>
                </div>
              </div>
              <RankBadge rank={user.rank} size="sm" showName={false} />
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="h-9 px-4 rounded-lg border border-emerald-300/30 bg-emerald-300 text-[#021008] font-extrabold text-xs hover:bg-emerald-200 transition-colors"
            >
              AUTHENTICATE
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-emerald-300/[.08] text-zinc-400 hover:text-white hover:bg-emerald-300/[.05]"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-emerald-300/[.08] bg-[#030806]/95 px-4 py-4 space-y-1.5 backdrop-blur-xl">
          <div className="cyber-kicker mb-3">
            <Activity size={12} /> operational menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-bold ${
                  isActive
                    ? "bg-emerald-300/[.07] text-emerald-300 border-emerald-300/20"
                    : "text-zinc-300 border-transparent hover:bg-white/[.025]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="cyber-mono text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-300 text-black">{item.badge}</span>
                )}
              </button>
            );
          })}
          <div className="pt-3 mt-2 border-t border-emerald-300/[.08] flex items-center justify-between px-2 text-[10px] text-zinc-500 cyber-mono uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300 cyber-status-dot" />
              {onlineCount} nodes online
            </span>
            <button onClick={() => handleNavClick("profile")} className="text-emerald-300 font-bold">Operator →</button>
          </div>
        </div>
      )}
    </header>
  );
}
