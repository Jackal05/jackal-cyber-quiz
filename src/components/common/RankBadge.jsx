import React from "react";
import { Shield, Award, Flame, Zap, Crown, Target, Star } from "lucide-react";
import { RANKS } from "../../config/constants.js";

const ICONS = {
  bronze: Shield,
  silver: Award,
  gold: Star,
  platinum: Target,
  diamond: Zap,
  master: Flame,
  elite: Crown,
};

export default function RankBadge({ rank, size = "md", showName = true, className = "" }) {
  if (!rank) return null;

  const tierKey = (rank.id || rank.name || "bronze").toLowerCase();
  const config = RANKS[tierKey] || RANKS.bronze;
  const IconComponent = ICONS[tierKey] || Shield;

  const sizeStyles = {
    sm: "h-6 px-2 text-[10px] gap-1",
    md: "h-8 px-3 text-xs gap-1.5",
    lg: "h-11 px-4 text-sm gap-2 font-black",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-bold uppercase tracking-wider select-none ${config.border} ${config.bg} ${config.text} ${sizeStyles[size]} ${className}`}
      title={`${rank.displayName || config.name} (${rank.minRating || config.min}+ MMR)`}
    >
      <IconComponent size={iconSizes[size]} className="shrink-0" />
      {showName && <span>{rank.displayName || config.name}</span>}
    </span>
  );
}
