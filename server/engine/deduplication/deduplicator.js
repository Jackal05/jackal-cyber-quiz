import crypto from "node:crypto";

/**
 * Multi-layer Cybersecurity Question Deduplication Engine
 * - Layer 1: Canonical Hash (Exact structural & normalized text match)
 * - Layer 2: Lexical Fuzzy Match (Jaccard + Bigram Token Dice Similarity)
 * - Layer 3: Vector / Semantic Cosine Similarity
 * - Syntactic Template Signature Detector (prevents slot-filling clone questions)
 */

const STOPWORDS_ES = new Set([
  "de", "la", "que", "el", "en", "y", "a", "los", "del", "se", "las", "por", "un", "para", "con",
  "no", "una", "su", "al", "lo", "como", "mas", "pero", "sus", "le", "ya", "o", "este", "si", "porque",
  "esta", "entre", "cuando", "muy", "sin", "sobre", "tambien", "me", "hasta", "hay", "donde", "quien",
  "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra", "otros", "ese", "eso",
  "cual", "cuales", "siguiente", "siguientes", "indica", "selecciona", "indique",
]);

/**
 * Normalizes text for canonical hashing:
 * - lowercase, diacritic removal, stripping punctuation, stopword removal, whitespace compaction
 */
export function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenizes normalized text, optionally removing stopwords
 */
export function tokenize(text, removeStopwords = true) {
  const norm = normalizeText(text);
  const rawTokens = norm.split(" ").filter((t) => t.length > 1);
  if (!removeStopwords) return rawTokens;
  return rawTokens.filter((t) => !STOPWORDS_ES.has(t));
}

/**
 * Layer 1: Canonical Hash calculation
 * Computes a deterministic SHA-256 hash from the prompt + sorted options
 */
export function computeCanonicalHash(prompt, options = []) {
  const normPrompt = normalizeText(prompt);
  const sortedOptionTexts = options
    .map((o) => normalizeText(typeof o === "string" ? o : o.text || ""))
    .sort()
    .join("|");

  const canonicalPayload = `${normPrompt}:::${sortedOptionTexts}`;
  return crypto.createHash("sha256").update(canonicalPayload).digest("hex");
}

/**
 * Template Signature Extractor
 * Replaces dynamic variables (IPs, Ports, CVEs, file extensions, commands)
 * to detect lazy template-based duplicates (e.g. "¿Qué puerto usa el servicio <X>?")
 */
export function extractTemplateSignature(prompt) {
  if (!prompt) return "";
  let sig = prompt.toLowerCase();

  // Replace IPv4 and CIDR before dots are stripped
  sig = sig.replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/g, "<IP>");
  // Replace ports
  sig = sig.replace(/\b(?:puerto\s+)?(?:8080|8443|443|80|22|53|88|389|636|445|3389|139|135)\b/g, "<PORT>");
  // Replace CVEs
  sig = sig.replace(/cve-\d{4}-\d{4,7}/gi, "<CVE>");
  // Replace MITRE IDs
  sig = sig.replace(/t\d{4}(?:\.\d{3})?/gi, "<MITRE_TECHNIQUE>");
  // Replace hashes
  sig = sig.replace(/\b[a-f0-9]{32,64}\b/gi, "<HASH>");
  // Replace filenames/extensions
  sig = sig.replace(/\b\w+\.(?:exe|dll|ps1|sh|pcap|elf|php|jsp|asp)\b/gi, "<FILE>");

  return normalizeText(sig);
}

/**
 * Jaccard token similarity: |A ∩ B| / |A ∪ B|
 */
export function calculateJaccardSimilarity(textA, textB) {
  const tokensA = new Set(tokenize(textA));
  const tokensB = new Set(tokenize(textB));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersectionCount++;
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Bigram Dice coefficient for character n-grams (sub-token fuzzy distance)
 */
export function calculateBigramDice(str1, str2) {
  const s1 = normalizeText(str1).replace(/\s/g, "");
  const s2 = normalizeText(str2).replace(/\s/g, "");

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0;

  const getBigrams = (str) => {
    const bigrams = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);

  let intersection = 0;
  for (const [bg, count1] of bg1.entries()) {
    if (bg2.has(bg)) {
      intersection += Math.min(count1, bg2.get(bg));
    }
  }

  const total = (s1.length - 1) + (s2.length - 1);
  return (2 * intersection) / total;
}

/**
 * Cosine similarity between two float vectors (for embedding layer)
 */
export function calculateCosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Deduplication Engine Class
 */
export class DeduplicationEngine {
  constructor(options = {}) {
    this.lexicalThreshold = options.lexicalThreshold ?? 0.82; // Above 0.82 is considered duplicate wording
    this.vectorThreshold = options.vectorThreshold ?? 0.88; // Above 0.88 cosine is semantic duplicate
    this.jaccardThreshold = options.jaccardThreshold ?? 0.80;
  }

  /**
   * Evaluates a candidate question against a collection of existing questions
   * @param {Object} candidate - { prompt, options, embedding }
   * @param {Array<Object>} existingQuestions - List of questions to compare against
   * @returns {Object} - { isDuplicate: boolean, reason: string|null, score: number, matchedQuestionId: string|null }
   */
  evaluateCandidate(candidate, existingQuestions = []) {
    const candidateHash = computeCanonicalHash(candidate.prompt, candidate.options);
    const candidateTemplate = extractTemplateSignature(candidate.prompt);

    for (const existing of existingQuestions) {
      // 1. Exact Canonical Hash Match
      const existingHash = existing.canonical_hash || computeCanonicalHash(existing.prompt, existing.options);
      if (candidateHash === existingHash) {
        return {
          isDuplicate: true,
          layer: 1,
          reason: "Canonical Hash Collision (Exact duplicate prompt and options)",
          score: 1.0,
          matchedQuestionId: existing.id,
        };
      }

      // 2. Lexical & Bigram Fuzzy Match
      const jaccard = calculateJaccardSimilarity(candidate.prompt, existing.prompt);
      const dice = calculateBigramDice(candidate.prompt, existing.prompt);
      const compositeLexical = 0.5 * jaccard + 0.5 * dice;

      if (compositeLexical >= this.lexicalThreshold) {
        return {
          isDuplicate: true,
          layer: 2,
          reason: `High Lexical Similarity (${(compositeLexical * 100).toFixed(1)}% match)`,
          score: compositeLexical,
          matchedQuestionId: existing.id,
        };
      }

      // 3. Template Signature exact collision (structural clone with swapped numbers/variables)
      const existingTemplate = existing.template_signature || extractTemplateSignature(existing.prompt);
      if (candidateTemplate && existingTemplate && candidateTemplate === existingTemplate) {
        return {
          isDuplicate: true,
          layer: 2,
          reason: `Template Signature Collision (Syntactic template clone with variable swap)`,
          score: 0.95,
          matchedQuestionId: existing.id,
        };
      }

      // 4. Vector Embedding Similarity (if embeddings exist)
      if (candidate.embedding && existing.embedding) {
        const cosine = calculateCosineSimilarity(candidate.embedding, existing.embedding);
        if (cosine >= this.vectorThreshold) {
          return {
            isDuplicate: true,
            layer: 3,
            reason: `Semantic Embedding Similarity (${(cosine * 100).toFixed(1)}% cosine similarity)`,
            score: cosine,
            matchedQuestionId: existing.id,
          };
        }
      }
    }

    return {
      isDuplicate: false,
      canonicalHash: candidateHash,
      templateSignature: candidateTemplate,
      reason: null,
      score: 0,
      matchedQuestionId: null,
    };
  }
}
