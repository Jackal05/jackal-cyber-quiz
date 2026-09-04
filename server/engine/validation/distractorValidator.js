/**
 * Distractor Quality Validator
 * Enforces:
 * - Exactly 4 options (1 correct, 3 false)
 * - Length symmetry (correct answer must not be conspicuously longer or shorter)
 * - Absolute qualifiers ban ("siempre", "nunca", "exclusivamente")
 * - Lazy pattern ban ("todas las anteriores", "ninguna de las anteriores")
 * - Technical universe homogeneity (plausible, non-absurd distractors)
 */

const FORBIDDEN_LAZY_PATTERNS = [
  /todas las anteriores/i,
  /ninguna de las anteriores/i,
  /todas son correctas/i,
  /ninguna es correcta/i,
  /ambas son correctas/i,
  /a y b son correctas/i,
  /all of the above/i,
  /none of the above/i,
  /both a and b/i,
];

const ABSOLUTE_GIVEAWAY_TERMS = [
  /\bsiempre\b/i,
  /\bnunca\b/i,
  /\bjamás\b/i,
  /\bexclusivamente\b/i,
  /\búnicamente\b/i,
  /\bbajo ninguna circunstancia\b/i,
  /\bimposible de\b/i,
  /\balways\b/i,
  /\bnever\b/i,
  /\bsolely\b/i,
];

const RIDICULOUS_ABSURD_TERMS = [
  /\bpizza\b/i,
  /\balien(s)?\b/i,
  /\bmagia\b/i,
  /\bm[aá]gico\b/i,
  /reiniciar la pc/i,
  /desconectar el cable/i,
  /apagar la luz/i,
  /windows 95/i,
  /windows 3\.1/i,
  /hacker ruso/i,
];

export class DistractorValidator {
  /**
   * Validates options of a candidate question
   * @param {Array<{ text: string, is_correct: boolean, rationale?: string }>} options
   * @returns {Object} { isValid: boolean, score: number, issues: string[], metrics: Object }
   */
  validate(options = []) {
    const issues = [];
    let score = 100;

    // 1. Check option count and correct count
    if (!Array.isArray(options) || options.length !== 4) {
      return {
        isValid: false,
        score: 0,
        issues: [`Expected exactly 4 options, got ${options?.length || 0}`],
        metrics: {},
      };
    }

    const correctOptions = options.filter((o) => o.is_correct === true);
    if (correctOptions.length !== 1) {
      return {
        isValid: false,
        score: 0,
        issues: [`Expected exactly 1 correct option, got ${correctOptions.length}`],
        metrics: {},
      };
    }

    const correctOpt = correctOptions[0];
    const distractors = options.filter((o) => !o.is_correct);

    let hasFatalIssue = false;

    // 2. Check for lazy forbidden patterns in any option
    for (let i = 0; i < options.length; i++) {
      const text = options[i].text || "";
      for (const pattern of FORBIDDEN_LAZY_PATTERNS) {
        if (pattern.test(text)) {
          issues.push(`Option ${i + 1} uses forbidden lazy pattern: "${pattern.source}"`);
          score -= 40;
          hasFatalIssue = true;
        }
      }
    }

    // 3. Check for absolute giveaway words
    for (let i = 0; i < options.length; i++) {
      const text = options[i].text || "";
      for (const pattern of ABSOLUTE_GIVEAWAY_TERMS) {
        if (pattern.test(text)) {
          issues.push(`Option ${i + 1} contains absolute giveaway qualifier: "${text.match(pattern)?.[0]}"`);
          score -= 15;
        }
      }
    }

    // 4. Check for absurd or caricaturesque distractors
    for (let i = 0; i < distractors.length; i++) {
      const text = distractors[i].text || "";
      for (const pattern of RIDICULOUS_ABSURD_TERMS) {
        if (pattern.test(text)) {
          issues.push(`Distractor "${text}" contains absurd/unrealistic term`);
          score -= 30;
          hasFatalIssue = true;
        }
      }
    }

    // 5. Length symmetry check (Length giveaway detector)
    const lengths = options.map((o) => (o.text || "").trim().length);
    const avgLen = lengths.reduce((acc, l) => acc + l, 0) / 4;
    const correctLen = (correctOpt.text || "").trim().length;

    // Relative length delta between correct option and average
    const lengthRatio = correctLen / (avgLen || 1);
    if (lengthRatio > 1.45) {
      issues.push(`Length bias: Correct option is significantly longer (${correctLen} chars vs ${avgLen.toFixed(0)} avg)`);
      score -= 20;
    } else if (lengthRatio < 0.55) {
      issues.push(`Length bias: Correct option is significantly shorter (${correctLen} chars vs ${avgLen.toFixed(0)} avg)`);
      score -= 15;
    }

    // Max/min ratio across all options
    const maxLen = Math.max(...lengths);
    const minLen = Math.min(...lengths);
    if (minLen > 0 && maxLen / minLen > 2.5) {
      issues.push(`Excessive option length variance (min: ${minLen}, max: ${maxLen})`);
      score -= 10;
    }

    // 6. Duplicate option texts
    const uniqueTexts = new Set(options.map((o) => (o.text || "").trim().toLowerCase()));
    if (uniqueTexts.size < 4) {
      issues.push("Duplicate option texts found");
      score -= 40;
      hasFatalIssue = true;
    }

    // 7. Rationale completeness
    const missingRationales = options.filter((o) => !o.rationale || o.rationale.trim().length < 10);
    if (missingRationales.length > 0) {
      issues.push(`${missingRationales.length} options lack a detailed technical rationale`);
      score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isValid: !hasFatalIssue && score >= 60 && issues.length <= 2,
      score,
      issues,
      metrics: {
        avgLength: Math.round(avgLen),
        correctLength: correctLen,
        lengthRatio: parseFloat(lengthRatio.toFixed(2)),
        maxMinRatio: minLen > 0 ? parseFloat((maxLen / minLen).toFixed(2)) : 0,
      },
    };
  }
}
