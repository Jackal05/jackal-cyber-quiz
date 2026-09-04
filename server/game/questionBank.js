import { CYBER_QUESTIONS } from "../../src/data/cyberQuestions.js";
import { NETWORK_QUESTIONS } from "../../src/data/networkQuestions.js";
import { FORENSICS_QUESTIONS } from "../../src/data/forensicsQuestions.js";
import { dbService } from "../db/index.js";

function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function deriveSubcategory(prompt, category) {
  const lower = prompt.toLowerCase();
  if (category === "Ciberseguridad") {
    if (lower.includes("firewall") || lower.includes("segmentaci") || lower.includes("ddos")) return "Perimeter & Network Defense";
    if (lower.includes("ransomware") || lower.includes("malware") || lower.includes("edr")) return "Endpoint & Malware";
    if (lower.includes("autentica") || lower.includes("mfa") || lower.includes("kerberos") || lower.includes("password")) return "Identity & Access";
    if (lower.includes("cifrado") || lower.includes("hash") || lower.includes("tls") || lower.includes("crypto")) return "Cryptography";
    if (lower.includes("cloud") || lower.includes("kubernetes") || lower.includes("ssrf") || lower.includes("imds")) return "Cloud & Application Security";
    return "Security Operations";
  }
  if (category === "Redes") {
    if (lower.includes("bgp") || lower.includes("ospf") || lower.includes("routing") || lower.includes("enrutamiento")) return "Routing & Protocols";
    if (lower.includes("vlan") || lower.includes("switching") || lower.includes("stp") || lower.includes("arp")) return "Switching & Layer 2";
    if (lower.includes("subnet") || lower.includes("ip") || lower.includes("dhcp") || lower.includes("dns")) return "Addressing & Core Services";
    if (lower.includes("mpls") || lower.includes("evpn") || lower.includes("qos") || lower.includes("multicast")) return "Advanced Infrastructure";
    return "Network Architecture";
  }
  if (category === "Informática Forense") {
    if (lower.includes("evidencia") || lower.includes("cadena") || lower.includes("custodia") || lower.includes("iso")) return "Standards & Evidence Chain";
    if (lower.includes("ram") || lower.includes("memoria") || lower.includes("volcado")) return "Memory Forensics";
    if (lower.includes("ntfs") || lower.includes("disco") || lower.includes("artefactos") || lower.includes("mft")) return "Disk & File System Forensics";
    if (lower.includes("timeline") || lower.includes("anti-forense") || lower.includes("rootkit")) return "Advanced Analysis";
    return "Digital Forensics & IR";
  }
  return "General Cybersecurity";
}

let allQuestions = [];

function initQuestionBank() {
  const normalized = [];

  const rawSources = [
    { name: "Ciberseguridad", slug: "ciberseguridad", source: CYBER_QUESTIONS },
    { name: "Redes", slug: "redes", source: NETWORK_QUESTIONS },
    { name: "Informática Forense", slug: "forense", source: FORENSICS_QUESTIONS },
  ];

  for (const { name, slug, source } of rawSources) {
    for (const [diffKey, questionList] of Object.entries(source)) {
      if (!Array.isArray(questionList)) continue;
      questionList.forEach((q, idx) => {
        const [prompt, rawOptions, rawCorrect, explanation] = q;
        const correctIndices = Array.isArray(rawCorrect) ? rawCorrect : [rawCorrect];

        // Format options with stable internal IDs (opt_0, opt_1, etc.)
        const options = rawOptions.map((optText, optIdx) => ({
          id: `opt_${optIdx}`,
          text: optText,
        }));

        const correctOptionIds = correctIndices.map((ci) => `opt_${ci}`);

        normalized.push({
          id: `${slug}_${diffKey}_${idx}`,
          category: name,
          categorySlug: slug,
          subcategory: deriveSubcategory(prompt, name),
          difficulty: diffKey,
          prompt,
          options,
          correctOptionIds,
          explanation: explanation || "",
        });
      });
    }
  }

  allQuestions = normalized;
}

initQuestionBank();

export const questionBank = {
  getAllQuestions() {
    return allQuestions;
  },

  getQuestionById(id) {
    const staticQ = allQuestions.find((q) => q.id === id);
    if (staticQ) return staticQ;
    try {
      const dbQ = dbService.getQuestionById(id);
      if (dbQ) {
        return {
          id: dbQ.id,
          category: dbQ.category || dbQ.domain,
          categorySlug: (dbQ.category || dbQ.domain || "").toLowerCase().replace(/\s+/g, "-"),
          subcategory: dbQ.subcategory,
          difficulty: dbQ.difficulty,
          prompt: dbQ.prompt,
          options: (dbQ.options || []).map((o, idx) => ({ id: o.id || `opt_${idx}`, text: o.text })),
          correctOptionIds: (dbQ.options || [])
            .filter((o) => o.is_correct)
            .map((o, idx) => o.id || `opt_${idx}`),
          explanation: dbQ.explanation || "",
        };
      }
    } catch {
      // Ignore if dbService unavailable
    }
    return null;
  },

  getRandomQuestions({ count = 5, category = null, excludeIds = [] } = {}) {
    let pool = allQuestions.filter((q) => !excludeIds.includes(q.id));
    if (category && category !== "general") {
      pool = pool.filter((q) => q.categorySlug === category || q.category === category);
    }

    if (pool.length < count) {
      pool = allQuestions; // Fallback to entire pool
    }

    const shuffled = shuffleArray(pool);
    return shuffled.slice(0, count);
  },

  getSuddenDeathQuestion(excludeIds = []) {
    const candidates = allQuestions.filter(
      (q) => !excludeIds.includes(q.id) && (q.difficulty === "dificil" || q.difficulty === "extraDificil")
    );
    const pool = candidates.length > 0 ? candidates : allQuestions;
    const shuffled = shuffleArray(pool);
    return shuffled[0];
  },

  // Authoritative Sanitization: Strips correctOptionIds and explanation, shuffles options for player
  getSanitizedQuestionForPlayer(question, randomizeOptions = true) {
    if (!question) return null;
    const options = randomizeOptions ? shuffleArray(question.options) : question.options;

    return {
      id: question.id,
      category: question.category,
      categorySlug: question.categorySlug,
      subcategory: question.subcategory,
      difficulty: question.difficulty,
      prompt: question.prompt,
      options: options.map((o) => ({ id: o.id, text: o.text })),
    };
  },

  // Server-authoritative answer check
  checkAnswer(questionId, selectedOptionId) {
    const q = this.getQuestionById(questionId);
    if (!q) return { valid: false, isCorrect: false, explanation: "" };

    const isCorrect = q.correctOptionIds.includes(selectedOptionId);
    return {
      valid: true,
      isCorrect,
      correctOptionIds: q.correctOptionIds,
      explanation: q.explanation,
    };
  },
};
