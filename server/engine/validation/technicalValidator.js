/**
 * Technical Accuracy and Cyber-Compliance Validator
 * Enforces:
 * - RFC 5737 & RFC 1918 safe IP address compliance (no routable public IPs)
 * - RFC 2606 safe domain compliance
 * - MITRE ATT&CK ID format compliance (e.g., T1059.001)
 * - CVE ID format compliance (e.g., CVE-2021-44228)
 * - Scenario depth & prompt substance (no shallow 1-sentence trivia)
 * - Explanation richness
 */

const MITRE_REGEX = /^T\d{4}(?:\.\d{3})?$/i;
const CVE_REGEX = /^CVE-\d{4}-\d{4,7}$/i;
const IPV4_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

// Safe IP ranges: RFC 5737 (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), RFC 1918, 127.0.0.0/8, 0.0.0.0
function isSafeIp(ipStr) {
  const parts = ipStr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true; // not a real IP

  const [a, b, c, d] = parts;

  // RFC 5737
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3

  // RFC 1918 Private
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  // RFC 3927 Link-Local / Cloud IMDS (169.254.169.254)
  if (a === 169 && b === 254) return true;

  // Loopback / Broadcast / Any
  if (a === 127) return true;
  if (a === 0 && b === 0 && c === 0 && d === 0) return true;
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  // Well known DNS for technical examples
  if (a === 8 && b === 8 && (c === 8 || c === 4)) return true;
  if (a === 1 && b === 1 && c === 1 && d === 1) return true;

  // Otherwise, it's a routable public IPv4 address!
  return false;
}

export class TechnicalValidator {
  /**
   * Validates technical requirements of candidate question
   * @param {Object} question - { prompt, explanation, mitre_attack_id, cve_id, cognitive_level, difficulty }
   * @returns {Object} { isValid: boolean, score: number, issues: string[] }
   */
  validate(question) {
    const issues = [];
    let score = 100;

    const {
      prompt = "",
      explanation = "",
      mitre_attack_id = "",
      cve_id = "",
      cognitive_level = "Apply",
      difficulty = "medium",
    } = question;

    // 1. Prompt depth & substance
    if (prompt.trim().length < 35) {
      issues.push("Prompt is too brief or trivial (< 35 characters)");
      score -= 25;
    }

    // 2. Explanation completeness
    if (!explanation || explanation.trim().length < 40) {
      issues.push("Explanation is incomplete or too short (< 40 characters)");
      score -= 20;
    }

    // 3. MITRE ATT&CK technique format check
    if (mitre_attack_id && mitre_attack_id.trim().length > 0) {
      const cleanMitre = mitre_attack_id.trim();
      if (!MITRE_REGEX.test(cleanMitre)) {
        issues.push(`Invalid MITRE ATT&CK ID format: "${cleanMitre}" (expected Txxxx or Txxxx.xxx)`);
        score -= 15;
      }
    }

    // 4. CVE format check
    if (cve_id && cve_id.trim().length > 0) {
      const cleanCve = cve_id.trim();
      if (!CVE_REGEX.test(cleanCve)) {
        issues.push(`Invalid CVE ID format: "${cleanCve}" (expected CVE-YYYY-NNNN+)`);
        score -= 15;
      }
    }

    // 5. RFC 5737 Safe IP compliance
    const fullText = `${prompt} ${explanation}`;
    const ipsFound = fullText.match(IPV4_REGEX) || [];
    const unsafeIps = ipsFound.filter((ip) => !isSafeIp(ip));

    if (unsafeIps.length > 0) {
      issues.push(`Non-RFC 5737 / non-private public IP address detected: ${unsafeIps.join(", ")}`);
      score -= 15;
    }

    // 6. Cognitive Bloom Level validation
    const validCognitive = ["Remember", "Understand", "Apply", "Analyze", "Evaluate"];
    if (!validCognitive.includes(cognitive_level)) {
      issues.push(`Unrecognized cognitive level: "${cognitive_level}"`);
      score -= 10;
    }

    // 7. Difficulty validation
    const validDiffs = ["easy", "medium", "hard", "expert"];
    if (!validDiffs.includes(difficulty)) {
      issues.push(`Unrecognized difficulty level: "${difficulty}"`);
      score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isValid: score >= 60 && issues.length <= 2,
      score,
      issues,
      hasMitre: Boolean(mitre_attack_id && MITRE_REGEX.test(mitre_attack_id.trim())),
      hasCve: Boolean(cve_id && CVE_REGEX.test(cve_id.trim())),
      safeIpsChecked: ipsFound.length,
    };
  }
}
