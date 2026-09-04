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
  User,
  Menu,
  X,
  Radio,
  Cpu,
} from "lucide-react";

export default function Navbar({ currentRoute, onRouteChange, onOpenAuthModal }) {
  const { user } = useAuth();
  const { onlineCount } = useBattleSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "training", label: "Training", icon: GraduationCap },
    { id: "battle", label: "Battle 1v1", icon: Swords, badge: "LIVE" },
    { id: "engine", label: "Engine AI", icon: Cpu, badge: "AI" },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "history", label: "Battle History", icon: History },
  ];

  const handleNavClick = (id) => {
    onRouteChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#050806]/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <button
          onClick={() => handleNavClick("dashboard")}
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-400 text-black grid place-items-center shadow-[0_0_20px_rgba(52,211,153,.25)]">
            <ShieldCheck size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-tight leading-none">JACKAL</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PROVING GROUND
              </span>
            </div>
            <div className="text-[9px] tracking-[.25em] text-zinc-400 font-bold mt-1">
              COMPETITIVE CYBERSECURITY
            </div>
          </div>
        </button>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-zinc-800/70 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
              >
                <Icon size={15} className={isActive ? "text-emerald-400" : "text-zinc-500"} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-400 text-black">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-6 h-[2px] bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Online count & Profile chip */}
        <div className="flex items-center gap-3">
          {/* Online count */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800/80 bg-zinc-950/60 text-[11px] text-zinc-400 font-semibold"
            title="Analistas conectados en tiempo real"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>{onlineCount} online</span>
          </div>

          {/* Profile chip */}
          {user ? (
            <button
              onClick={() => handleNavClick("profile")}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 transition-colors text-left group"
            >
              <div className="h-7 w-7 rounded-lg bg-zinc-900 grid place-items-center text-zinc-300 font-black text-xs border border-zinc-800 group-hover:border-emerald-400/40">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-black text-white leading-tight">{user.username}</div>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">{user.rating} MMR</span>
                  <span>·</span>
                  <span>LVL {user.level}</span>
                </div>
              </div>
              <RankBadge rank={user.rank} size="sm" showName={false} />
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="h-9 px-4 rounded-xl bg-emerald-400 text-black font-extrabold text-xs hover:bg-emerald-300 transition-colors"
            >
              Entrar
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-[#070b08] px-4 py-4 space-y-1 animate-in slide-in-from-top-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold ${
                  isActive ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-400 text-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-3 border-t border-zinc-900 flex items-center justify-between px-2 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {onlineCount} analistas en línea
            </span>
            <button
              onClick={() => {
                handleNavClick("profile");
                setMobileMenuOpen(false);
              }}
              className="text-emerald-400 font-bold"
            >
              Mi Perfil →
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
