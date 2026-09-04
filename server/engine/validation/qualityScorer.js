import { DistractorValidator } from "./distractorValidator.js";
import { TechnicalValidator } from "./technicalValidator.js";

/**
 * Quality Scorer & Certification Engine
 * Combines distractor quality, technical accuracy, deduplication freshness,
 * and cognitive depth into an authoritative 0-100 score.
 */

export class QualityScorer {
  constructor() {
    this.distractorValidator = new DistractorValidator();
    this.technicalValidator = new TechnicalValidator();
  }

  /**
   * Evaluates and scores a candidate question
   * @param {Object} candidate - Question object with { prompt, options, explanation, cognitive_level, difficulty, ... }
   * @param {Object} deduplicationResult - Result from DeduplicationEngine
   * @returns {Object} Full score report with status: 'approved' | 'needs_review' | 'rejected'
   */
  evaluate(candidate, deduplicationResult = { isDuplicate: false }) {
    if (deduplicationResult.isDuplicate) {
      return {
        qualityScore: 0,
        status: "rejected",
        approved: false,
        breakdown: {
          distractorScore: 0,
          technicalScore: 0,
          freshnessScore: 0,
          depthScore: 0,
        },
        issues: [`Duplicate rejected: ${deduplicationResult.reason}`],
        metrics: {},
      };
    }

    const distResult = this.distractorValidator.validate(candidate.options);
    const techResult = this.technicalValidator.validate(candidate);

    // Freshness score based on similarity
    const simScore = deduplicationResult.score || 0;
    const freshnessScore = Math.max(0, Math.round((1 - simScore) * 100));

    // Depth score based on explanation and cognitive level
    let depthScore = 70;
    if (candidate.explanation && candidate.explanation.length > 100) depthScore += 15;
    if (["Analyze", "Evaluate", "Apply"].includes(candidate.cognitive_level)) depthScore += 15;
    depthScore = Math.min(100, depthScore);

    // Weighted composite calculation:
    // Distractor Quality: 35%
    // Technical Compliance: 35%
    // Freshness / Uniqueness: 15%
    // Depth / Pedagogy: 15%
    const compositeScore = Math.round(
      distResult.score * 0.35 +
      techResult.score * 0.35 +
      freshnessScore * 0.15 +
      depthScore * 0.15
    );

    const allIssues = [...distResult.issues, ...techResult.issues];

    // Status classification:
    // >= 85: Approved automatically
    // 70 - 84: Needs human review
    // < 70: Rejected
    let status = "rejected";
    if (compositeScore >= 85 && distResult.isValid && techResult.isValid) {
      status = "approved";
    } else if (compositeScore >= 70) {
      status = "needs_review";
    }

    return {
      qualityScore: compositeScore,
      status,
      approved: status === "approved",
      breakdown: {
        distractorScore: distResult.score,
        technicalScore: techResult.score,
        freshnessScore,
        depthScore,
      },
      issues: allIssues,
      metrics: {
        ...distResult.metrics,
        hasMitre: techResult.hasMitre,
        hasCve: techResult.hasCve,
      },
    };
  }
}
