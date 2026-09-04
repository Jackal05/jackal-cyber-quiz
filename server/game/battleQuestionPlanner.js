import { questionRepository } from "./questionRepository.js";
import { dbService } from "../db/index.js";
import { ratingEngine } from "./ratingEngine.js";

/**
 * Competitive Battle Question Planner
 * 
 * Enforces:
 * 1. 30-day cross-mode anti-repetition cooldown (neither player has seen it in Training or Battle).
 * 2. 5-round thematic diversity progression:
 *    - Round 1: Networking & Fundamentals (speed / warmup)
 *    - Round 2: SOC & Detection (defensive reasoning)
 *    - Round 3: Web, Cloud & Identity (application / cloud vectors)
 *    - Round 4: Forensics & Incident Response (evidence / triage)
 *    - Round 5: Advanced Scenario & Threat Hunting (comprehensive synthesis)
 * 3. Rating (MMR) Calibration:
 *    - Bronze / Silver (<1300): Beginner / Intermediate
 *    - Gold / Platinum (1300-1600): Intermediate / Advanced
 *    - Diamond / Master (>1600): Advanced / Expert
 * 4. High Battle Fairness (battle_fairness_score >= 0.7, available_in_battle = 1)
 */

function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const ROUND_THEMES = [
  {
    round: 1,
    name: "Redes y Fundamentos",
    domains: ["seguridad-redes", "network", "networking", "fundamentos", "general"],
    subcategories: ["protocolos", "firewall", "dns", "puertos", "tcp/ip", "osi"],
  },
  {
    round: 2,
    name: "Operaciones SOC y Detección",
    domains: ["soc-operaciones", "soc", "siem", "deteccion", "monitoreo"],
    subcategories: ["siem", "ids/ips", "alertas", "triaje", "edr", "mitre"],
  },
  {
    round: 3,
    name: "Seguridad Web, Cloud e Identidad",
    domains: ["seguridad-web", "web", "cloud", "iam", "identidad"],
    subcategories: ["owasp", "sql-injection", "xss", "autenticacion", "jwt", "cloud"],
  },
  {
    round: 4,
    name: "Forense Digital y Respuesta a Incidentes",
    domains: ["forense-incidentes", "forense", "incidentes", "ir", "malware"],
    subcategories: ["memoria", "disco", "logs", "cadena-custodia", "ransomware", "contencion"],
  },
  {
    round: 5,
    name: "Escenario Avanzado y Threat Hunting",
    domains: ["threat-hunting", "arquitectura", "criptografia", "escenarios", "general"],
    subcategories: ["amenazas-persistentes", "apt", "cifrado", "hardening", "privilegios"],
  },
];

export class BattleQuestionPlanner {
  constructor(daysCooldown = 30) {
    this.daysCooldown = daysCooldown;
  }

  /**
   * Plans a competitive 5-round question set calibrated to player MMR and enforced fairness
   */
  planBattleMatch(player1Id, player2Id, { mode = "general", p1Rating = 1200, p2Rating = 1200 } = {}) {
    const avgRating = Math.round((p1Rating + p2Rating) / 2);

    // 1. Get 30-day cross-mode history for both players
    const p1Seen = player1Id ? dbService.getUserRecentQuestionIds(player1Id, this.daysCooldown) : new Set();
    const p2Seen = player2Id ? dbService.getUserRecentQuestionIds(player2Id, this.daysCooldown) : new Set();

    // 2. Fetch approved pool from questionRepository
    const fullPool = questionRepository.getAllQuestions({
      availableOnly: true,
      battleOnly: true,
      minFairnessScore: 0.7,
    });

    // 3. Filter by mode if specific category requested and not general
    let pool = fullPool;
    if (mode && mode !== "general") {
      const modeLower = mode.toLowerCase();
      const filtered = pool.filter(
        (q) =>
          (q.categorySlug && q.categorySlug.includes(modeLower)) ||
          (q.category && q.category.toLowerCase().includes(modeLower)) ||
          (q.domain && q.domain.toLowerCase().includes(modeLower))
      );
      if (filtered.length >= 10) {
        pool = filtered;
      }
    }

    // 4. Cross-mode intersection filtering: neither player has seen it in the past 30 days
    let candidatePool = pool.filter((q) => !p1Seen.has(q.id) && !p2Seen.has(q.id));

    // Fallback: If pool is restricted (< 15 items), relax to neither seen in last 7 days or union
    if (candidatePool.length < 15) {
      candidatePool = pool.filter((q) => !p1Seen.has(q.id) || !p2Seen.has(q.id));
      if (candidatePool.length < 10) {
        candidatePool = pool;
      }
    }

    // 5. Determine target difficulty ladder based on average MMR
    const targetDifficulties = this.getDifficultyLadderForRating(avgRating);

    const selectedQuestions = [];
    const usedIds = new Set();

    for (let roundIdx = 0; roundIdx < 5; roundIdx++) {
      const theme = ROUND_THEMES[roundIdx];
      const targetDiffs = targetDifficulties[roundIdx];

      // Try to match theme + difficulty
      const themeMatches = candidatePool.filter((q) => {
        if (usedIds.has(q.id)) return false;
        const diffMatch = targetDiffs.includes(q.difficulty?.toLowerCase());
        const catStr = `${q.category || ""} ${q.categorySlug || ""} ${q.domain || ""} ${q.subcategory || ""}`.toLowerCase();
        const themeMatch =
          theme.domains.some((d) => catStr.includes(d)) ||
          theme.subcategories.some((s) => catStr.includes(s));
        return diffMatch && themeMatch;
      });

      let chosen = null;
      if (themeMatches.length > 0) {
        chosen = shuffle(themeMatches)[0];
      } else {
        // Fallback: Match difficulty regardless of theme
        const diffMatches = candidatePool.filter(
          (q) => !usedIds.has(q.id) && targetDiffs.includes(q.difficulty?.toLowerCase())
        );
        if (diffMatches.length > 0) {
          chosen = shuffle(diffMatches)[0];
        } else {
          // Fallback: Any unused candidate
          const remaining = candidatePool.filter((q) => !usedIds.has(q.id));
          chosen = remaining.length > 0 ? shuffle(remaining)[0] : shuffle(pool)[0];
        }
      }

      if (chosen) {
        usedIds.add(chosen.id);
        selectedQuestions.push(chosen);
      }
    }

    // Fallback if less than 5 selected
    while (selectedQuestions.length < 5) {
      const leftover = pool.filter((q) => !usedIds.has(q.id));
      const pick = leftover.length > 0 ? shuffle(leftover)[0] : pool[0];
      usedIds.add(pick.id);
      selectedQuestions.push(pick);
    }

    return selectedQuestions;
  }

  /**
   * Generates difficulty progression based on player MMR
   */
  getDifficultyLadderForRating(avgRating) {
    if (avgRating < 1300) {
      // Bronze / Silver
      return [
        ["facil", "easy", "beginner"],
        ["facil", "easy", "beginner", "medio", "medium"],
        ["medio", "medium", "intermediate"],
        ["medio", "medium", "intermediate"],
        ["medio", "medium", "dificil", "hard"],
      ];
    } else if (avgRating <= 1600) {
      // Gold / Platinum
      return [
        ["facil", "easy", "medio", "medium"],
        ["medio", "medium", "intermediate"],
        ["medio", "medium", "intermediate", "dificil", "hard"],
        ["dificil", "hard", "advanced"],
        ["dificil", "hard", "advanced", "extraDificil", "expert"],
      ];
    } else {
      // Diamond / Master
      return [
        ["medio", "medium", "intermediate"],
        ["medio", "medium", "dificil", "hard"],
        ["dificil", "hard", "advanced"],
        ["dificil", "hard", "advanced"],
        ["dificil", "hard", "advanced", "extraDificil", "expert"],
      ];
    }
  }

  /**
   * Selects an advanced, high-stakes question for sudden death round
   */
  selectSuddenDeathQuestion(player1Id, player2Id, excludeIds = []) {
    const p1Seen = player1Id ? dbService.getUserRecentQuestionIds(player1Id, this.daysCooldown) : new Set();
    const p2Seen = player2Id ? dbService.getUserRecentQuestionIds(player2Id, this.daysCooldown) : new Set();

    const pool = questionRepository.getAllQuestions({
      availableOnly: true,
      battleOnly: true,
      minFairnessScore: 0.8,
    });

    const excludeSet = new Set(excludeIds);
    const hardDiffs = ["dificil", "hard", "advanced", "extradificil", "expert"];

    let candidate = pool.filter(
      (q) =>
        !excludeSet.has(q.id) &&
        !p1Seen.has(q.id) &&
        !p2Seen.has(q.id) &&
        hardDiffs.includes(q.difficulty?.toLowerCase())
    );

    if (candidate.length === 0) {
      candidate = pool.filter(
        (q) => !excludeSet.has(q.id) && hardDiffs.includes(q.difficulty?.toLowerCase())
      );
    }

    if (candidate.length === 0) {
      candidate = pool.filter((q) => !excludeSet.has(q.id));
    }

    return candidate.length > 0 ? shuffle(candidate)[0] : pool[0];
  }
}

export const battleQuestionPlanner = new BattleQuestionPlanner(30);
