import { CYBER_QUESTIONS } from "../../src/data/cyberQuestions.js";
import { NETWORK_QUESTIONS } from "../../src/data/networkQuestions.js";
import { FORENSICS_QUESTIONS } from "../../src/data/forensicsQuestions.js";
import { dbService } from "../db/index.js";

/**
 * Single Central Question Repository
 * Unifies curated static questions and AI-generated dynamic questions.
 * Serves both Training Mode and Battle 1v1.
 */

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
  if (category === "Ciberseguridad" || category === "Security Operations & Defense") {
    if (lower.includes("firewall") || lower.includes("segmentaci") || lower.includes("ddos")) return "Perimeter & Network Defense";
    if (lower.includes("ransomware") || lower.includes("malware") || lower.includes("edr")) return "Endpoint & Malware";
    if (lower.includes("autentica") || lower.includes("mfa") || lower.includes("kerberos") || lower.includes("password")) return "Identity & Access";
    if (lower.includes("cifrado") || lower.includes("hash") || lower.includes("tls") || lower.includes("crypto")) return "Cryptography";
    if (lower.includes("cloud") || lower.includes("kubernetes") || lower.includes("ssrf") || lower.includes("imds")) return "Cloud & Application Security";
    return "Security Operations";
  }
  if (category === "Redes" || category === "Network Security & Architecture") {
    if (lower.includes("bgp") || lower.includes("ospf") || lower.includes("routing") || lower.includes("enrutamiento")) return "Routing & Protocols";
    if (lower.includes("vlan") || lower.includes("switching") || lower.includes("stp") || lower.includes("arp")) return "Switching & Layer 2";
    if (lower.includes("subnet") || lower.includes("ip") || lower.includes("dhcp") || lower.includes("dns")) return "Addressing & Core Services";
    if (lower.includes("mpls") || lower.includes("evpn") || lower.includes("qos") || lower.includes("multicast")) return "Advanced Infrastructure";
    return "Network Architecture";
  }
  if (category === "Informática Forense" || category === "Digital Forensics & Incident Response") {
    if (lower.includes("evidencia") || lower.includes("cadena") || lower.includes("custodia") || lower.includes("iso")) return "Standards & Evidence Chain";
    if (lower.includes("ram") || lower.includes("memoria") || lower.includes("volcado")) return "Memory Forensics";
    if (lower.includes("ntfs") || lower.includes("disco") || lower.includes("artefactos") || lower.includes("mft")) return "Disk & File System Forensics";
    if (lower.includes("timeline") || lower.includes("anti-forense") || lower.includes("rootkit")) return "Advanced Analysis";
    return "Digital Forensics & IR";
  }
  return "General Cybersecurity";
}

function deriveConceptId(prompt, subcategory) {
  const norm = prompt.toLowerCase();
  if (norm.includes("handshake") || norm.includes("syn")) return "tcp_three_way_handshake";
  if (norm.includes("dnssec") || norm.includes("rrsig") || norm.includes("poisoning")) return "dns_security_dnssec";
  if (norm.includes("tls") || norm.includes("pfs") || norm.includes("forward secrecy")) return "tls_handshake_crypto";
  if (norm.includes("bgp") || norm.includes("rpki")) return "bgp_routing_security";
  if (norm.includes("arp") || norm.includes("dai") || norm.includes("dhcp snooping")) return "l2_mitigation_dai_dhcp_snooping";
  if (norm.includes("kerberos") || norm.includes("spn") || norm.includes("tgs")) return "ad_kerberoast_mitigation";
  if (norm.includes("dcsync") || norm.includes("drsuapi")) return "ad_dcsync_replication";
  if (norm.includes("imds") || norm.includes("169.254")) return "cloud_imds_ssrf";
  if (norm.includes("hollowing") || norm.includes("unmapview")) return "proc_hollowing_detection";
  if (norm.includes("shimcache") || norm.includes("appcompatcache")) return "forensics_shimcache_amcache";
  if (norm.includes("prefetch") || norm.includes(".pf")) return "forensics_prefetch_execution";
  return subcategory.toLowerCase().replace(/[^\w]/g, "_");
}

let staticInitialized = false;
let normalizedStatic = [];

function initStaticQuestions() {
  if (staticInitialized) return;

  const rawSources = [
    { name: "Ciberseguridad", domain: "Security Operations & Defense", slug: "ciberseguridad", source: CYBER_QUESTIONS },
    { name: "Redes", domain: "Network Security & Architecture", slug: "redes", source: NETWORK_QUESTIONS },
    { name: "Informática Forense", domain: "Digital Forensics & Incident Response", slug: "forense", source: FORENSICS_QUESTIONS },
  ];

  for (const { name, domain, slug, source } of rawSources) {
    for (const [diffKey, questionList] of Object.entries(source)) {
      if (!Array.isArray(questionList)) continue;
      questionList.forEach((q, idx) => {
        const [prompt, rawOptions, rawCorrect, explanation] = q;
        const correctIndices = Array.isArray(rawCorrect) ? rawCorrect : [rawCorrect];
        const subcategory = deriveSubcategory(prompt, name);

        const options = rawOptions.map((optText, optIdx) => ({
          id: `opt_${optIdx}`,
          text: optText,
          is_correct: correctIndices.includes(optIdx),
          rationale: correctIndices.includes(optIdx) ? "Respuesta técnica fundamentada." : "Distractor verosímil pero inexacto para el vector planteado.",
        }));

        const isConcise = prompt.length <= 260 && options.every((o) => o.text.length <= 150);

        normalizedStatic.push({
          id: `${slug}_${diffKey}_${idx}`,
          domain,
          category: name,
          categorySlug: slug,
          subcategory,
          concept_id: deriveConceptId(prompt, subcategory),
          difficulty: diffKey === "facil" ? "easy" : diffKey === "medio" ? "medium" : diffKey === "dificil" ? "hard" : "expert",
          cognitive_level: diffKey === "facil" ? "Remember" : diffKey === "medio" ? "Apply" : "Analyze",
          prompt,
          options,
          correctOptionIds: correctIndices.map((ci) => `opt_${ci}`),
          explanation: explanation || "",
          available_in_training: true,
          available_in_battle: isConcise,
          battle_fairness_score: 95.0,
          estimated_duration_sec: isConcise ? 20 : 35,
          quality_score: 90.0,
          status: "approved",
          mitre_attack_id: "",
          cve_id: "",
        });
      });
    }
  }

  staticInitialized = true;
}

export class QuestionRepository {
  constructor() {
    initStaticQuestions();
  }

  /**
   * Retrieves all approved questions from both static memory and dynamic database
   * @param {Object} filters
   * @returns {Array<Object>}
   */
  getAllApprovedQuestions({
    mode = null, // 'training' | 'battle' | null
    domain = null,
    category = null,
    subcategory = null,
    conceptId = null,
    difficulty = null,
  } = {}) {
    initStaticQuestions();

    // 1. Fetch approved questions from database
    let dbQuestions = [];
    try {
      dbQuestions = dbService.getAllEngineQuestions({ status: "approved", limit: 3000 });
    } catch {
      // Fallback to static
    }

    const unified = [...normalizedStatic];
    const seenIds = new Set(unified.map((q) => q.id));

    for (const dq of dbQuestions) {
      if (!seenIds.has(dq.id)) {
        seenIds.add(dq.id);
        const options = (dq.options || []).map((o, idx) => ({
          id: o.id || `opt_${idx}`,
          text: o.text,
          is_correct: Boolean(o.is_correct),
          rationale: o.rationale || o.distractor_rationale || "",
        }));

        const isConcise = dq.prompt?.length <= 260;

        unified.push({
          id: dq.id,
          domain: dq.domain,
          category: dq.category || dq.domain,
          categorySlug: (dq.category || dq.domain || "").toLowerCase().replace(/[^\w]/g, "-"),
          subcategory: dq.subcategory,
          concept_id: dq.concept_id || dq.conceptId || deriveConceptId(dq.prompt, dq.subcategory || ""),
          difficulty: dq.difficulty || "medium",
          cognitive_level: dq.cognitive_level || "Apply",
          prompt: dq.prompt,
          options,
          correctOptionIds: options.filter((o) => o.is_correct).map((o) => o.id),
          explanation: dq.explanation || "",
          available_in_training: dq.available_in_training !== 0 && dq.available_in_training !== false,
          available_in_battle: dq.available_in_battle !== 0 && dq.available_in_battle !== false && isConcise,
          battle_fairness_score: dq.battle_fairness_score ?? 100,
          estimated_duration_sec: dq.estimated_duration_sec ?? 20,
          quality_score: dq.quality_score ?? 85,
          status: dq.status || "approved",
          mitre_attack_id: dq.mitre_attack_id || "",
          cve_id: dq.cve_id || "",
        });
      }
    }

    // Apply Filters
    let pool = unified.filter((q) => q.status === "approved");

    if (mode === "training") {
      pool = pool.filter((q) => q.available_in_training);
    } else if (mode === "battle") {
      pool = pool.filter((q) => q.available_in_battle);
    }

    if (domain && domain !== "all") {
      pool = pool.filter((q) => q.domain?.toLowerCase() === domain.toLowerCase());
    }

    if (category && category !== "all" && category !== "general") {
      pool = pool.filter(
        (q) => q.categorySlug?.toLowerCase() === category.toLowerCase() || q.category?.toLowerCase() === category.toLowerCase()
      );
    }

    if (subcategory && subcategory !== "all") {
      pool = pool.filter((q) => q.subcategory?.toLowerCase() === subcategory.toLowerCase());
    }

    if (conceptId && conceptId !== "all") {
      pool = pool.filter((q) => q.concept_id === conceptId);
    }

    if (difficulty && difficulty !== "all") {
      pool = pool.filter((q) => q.difficulty?.toLowerCase() === difficulty.toLowerCase());
    }

    return pool;
  }

  /**
   * Universal getter for question bank with flexible filtering
   */
  getAllQuestions(options = {}) {
    const {
      mode,
      battleOnly = false,
      trainingOnly = false,
      minFairnessScore = null,
      ...rest
    } = options;

    let targetMode = mode;
    if (battleOnly) targetMode = "battle";
    if (trainingOnly) targetMode = "training";

    let pool = this.getAllApprovedQuestions({ mode: targetMode, ...rest });

    if (minFairnessScore !== null) {
      pool = pool.filter((q) => (q.battle_fairness_score ?? 100) >= (minFairnessScore <= 1 ? minFairnessScore * 100 : minFairnessScore));
    }

    return pool;
  }

  /**
   * Resolves a single question by ID
   */
  getQuestionById(id) {
    const staticQ = normalizedStatic.find((q) => q.id === id);
    if (staticQ) return staticQ;

    try {
      const dbQ = dbService.getQuestionById(id);
      if (dbQ) {
        const options = (dbQ.options || []).map((o, idx) => ({
          id: o.id || `opt_${idx}`,
          text: o.text,
          is_correct: Boolean(o.is_correct),
          rationale: o.rationale || o.distractor_rationale || "",
        }));

        return {
          id: dbQ.id,
          domain: dbQ.domain,
          category: dbQ.category || dbQ.domain,
          categorySlug: (dbQ.category || dbQ.domain || "").toLowerCase().replace(/[^\w]/g, "-"),
          subcategory: dbQ.subcategory,
          concept_id: dbQ.concept_id || deriveConceptId(dbQ.prompt, dbQ.subcategory || ""),
          difficulty: dbQ.difficulty || "medium",
          cognitive_level: dbQ.cognitive_level || "Apply",
          prompt: dbQ.prompt,
          options,
          correctOptionIds: options.filter((o) => o.is_correct).map((o) => o.id),
          explanation: dbQ.explanation || "",
          available_in_training: dbQ.available_in_training !== 0 && dbQ.available_in_training !== false,
          available_in_battle: dbQ.available_in_battle !== 0 && dbQ.available_in_battle !== false,
          battle_fairness_score: dbQ.battle_fairness_score ?? 100,
          estimated_duration_sec: dbQ.estimated_duration_sec ?? 20,
          quality_score: dbQ.quality_score ?? 85,
          status: dbQ.status || "approved",
          mitre_attack_id: dbQ.mitre_attack_id || "",
          cve_id: dbQ.cve_id || "",
        };
      }
    } catch {}

    return null;
  }

  /**
   * Authoritatively sanitizes question for client delivery:
   * - Strips correctOptionIds and is_correct flags
   * - Strips explanation
   * - Optionally shuffles options
   */
  getSanitizedQuestion(question, randomizeOptions = true) {
    if (!question) return null;
    const rawOptions = question.options || [];
    const options = randomizeOptions ? shuffleArray(rawOptions) : rawOptions;

    return {
      id: question.id,
      domain: question.domain,
      category: question.category,
      categorySlug: question.categorySlug,
      subcategory: question.subcategory,
      concept_id: question.concept_id,
      difficulty: question.difficulty,
      cognitive_level: question.cognitive_level,
      prompt: question.prompt,
      estimated_duration_sec: question.estimated_duration_sec,
      mitre_attack_id: question.mitre_attack_id,
      options: options.map((o) => ({ id: o.id, text: o.text })),
    };
  }

  /**
   * Server-authoritative answer verification
   * Logs exposure to user_question_history and updates stats
   */
  checkAnswer(
    questionId,
    selectedOptionId,
    { userId = "anonymous", mode = "training", sessionId = null, matchId = null, responseTimeMs = 0 } = {}
  ) {
    const q = this.getQuestionById(questionId);
    if (!q) {
      return {
        valid: false,
        isCorrect: false,
        explanation: "Pregunta no encontrada.",
        correctOptionIds: [],
        options: [],
      };
    }

    const isCorrect = q.correctOptionIds.includes(selectedOptionId);

    // Record exposure in shared global history
    if (userId) {
      try {
        dbService.recordUserQuestionHistory({
          userId,
          questionId,
          matchId,
          sessionId,
          mode,
          wasCorrect: isCorrect,
          responseTimeMs,
        });
      } catch (err) {
        console.warn("Notice: Question exposure tracking deferred:", err.message);
      }
    }

    const rationales = {};
    q.options.forEach((o) => {
      if (o.rationale) rationales[o.id] = o.rationale;
    });

    return {
      valid: true,
      isCorrect,
      correctOptionIds: q.correctOptionIds,
      explanation: q.explanation,
      rationales,
      optionsWithRationales: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: o.is_correct,
        rationale: o.rationale,
      })),
      questionMetadata: {
        id: q.id,
        domain: q.domain,
        category: q.category,
        subcategory: q.subcategory,
        concept_id: q.concept_id,
        difficulty: q.difficulty,
        mitre_attack_id: q.mitre_attack_id,
        cve_id: q.cve_id,
      },
    };
  }

  /**
   * Alias for authoritative answer verification
   */
  verifyAnswer(questionId, selectedOptionId, options = {}) {
    return this.checkAnswer(questionId, selectedOptionId, options);
  }
}

export const questionRepository = new QuestionRepository();
