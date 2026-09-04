export const RANKS = {
  bronze: { id: "bronze", name: "Bronze", min: 0, max: 1099, color: "#cd7f32", border: "border-[#cd7f32]/40", bg: "bg-[#cd7f32]/10", text: "text-[#cd7f32]" },
  silver: { id: "silver", name: "Silver", min: 1100, max: 1299, color: "#cbd5e1", border: "border-slate-300/40", bg: "bg-slate-300/10", text: "text-slate-200" },
  gold: { id: "gold", name: "Gold", min: 1300, max: 1499, color: "#fbbf24", border: "border-amber-400/40", bg: "bg-amber-400/10", text: "text-amber-300" },
  platinum: { id: "platinum", name: "Platinum", min: 1500, max: 1699, color: "#38bdf8", border: "border-sky-400/40", bg: "bg-sky-400/10", text: "text-sky-300" },
  diamond: { id: "diamond", name: "Diamond", min: 1700, max: 1899, color: "#a855f7", border: "border-purple-400/40", bg: "bg-purple-400/10", text: "text-purple-300" },
  master: { id: "master", name: "Master", min: 1900, max: 2099, color: "#f43f5e", border: "border-rose-400/40", bg: "bg-rose-400/10", text: "text-rose-300" },
  elite: { id: "elite", name: "Elite", min: 2100, max: 9999, color: "#34d399", border: "border-emerald-400/50", bg: "bg-emerald-400/15", text: "text-emerald-300" },
};

export const BATTLE_MODES = [
  {
    id: "general",
    title: "General Cybersecurity",
    description: "Multi-domain tactical evaluation: Network defense, cryptography, SOC operations, forensics, and incident response.",
    status: "active",
    badge: "1v1 RANKED",
  },
  {
    id: "soc",
    title: "SOC Analyst",
    description: "SIEM log correlation, IoC triage, alert validation, and MITRE ATT&CK tactical mapping.",
    status: "upcoming",
    badge: "SEASON 2",
  },
  {
    id: "network",
    title: "Network Security",
    description: "L2/L3 segmentation, BGP routing anomalies, firewall policies, and traffic inspection.",
    status: "upcoming",
    badge: "COMING SOON",
  },
  {
    id: "forensics",
    title: "Digital Forensics",
    description: "Memory volatility, artifact timeline recovery, and evidentiary preservation rigor.",
    status: "upcoming",
    badge: "COMING SOON",
  },
];
