import { AiProvider } from "../providers/aiProvider.js";
import { CONCEPT_GRAPH } from "../taxonomy/conceptGraph.js";
import { buildGenerationPrompt } from "../promptBuilder.js";
import { DeduplicationEngine, computeCanonicalHash, extractTemplateSignature } from "../deduplication/deduplicator.js";
import { QualityScorer } from "../validation/qualityScorer.js";
import { dbService } from "../../db/index.js";

/**
 * Enterprise Asynchronous Batch Question Generation Job Runner
 * Enforces:
 * - Quality > Quantity
 * - Sequential or throttled multi-stage pipeline
 * - Real-time progress updates in generation_jobs table
 */

export class JobRunner {
  constructor(options = {}) {
    this.aiProvider = new AiProvider(options.providerConfig || {});
    this.deduplicator = new DeduplicationEngine();
    this.qualityScorer = new QualityScorer();
  }

  /**
   * Finds concepts matching domain and/or topic in the concept graph
   */
  findConcepts(domain, topic) {
    let domainMatches = CONCEPT_GRAPH;
    if (domain && domain !== "all") {
      domainMatches = domainMatches.filter(
        (d) => d.domain.toLowerCase() === domain.toLowerCase() || d.category.toLowerCase() === domain.toLowerCase()
      );
    }
    if (domainMatches.length === 0) domainMatches = CONCEPT_GRAPH;

    const allConcepts = [];
    for (const d of domainMatches) {
      for (const c of d.concepts) {
        allConcepts.push({
          ...c,
          domain: d.domain,
          category: d.category,
          subcategory: d.subcategory,
        });
      }
    }

    if (topic && topic !== "all") {
      const topicLower = topic.toLowerCase();
      const filtered = allConcepts.filter(
        (c) =>
          c.name.toLowerCase().includes(topicLower) ||
          c.id.toLowerCase().includes(topicLower) ||
          c.tags.some((t) => t.toLowerCase().includes(topicLower))
      );
      if (filtered.length > 0) return filtered;
    }

    return allConcepts;
  }

  /**
   * Executes a batch generation job asynchronously
   * @param {string} jobId - ID of the generation_jobs record
   */
  async runJob(jobId) {
    const job = dbService.getJobById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    dbService.updateJob(jobId, { status: "running" });

    const targetCount = job.target_count || 5;
    const domain = job.domain;
    const topic = job.topic;
    const difficulty = job.difficulty || "medium";

    const candidateConcepts = this.findConcepts(domain, topic);
    if (candidateConcepts.length === 0) {
      dbService.updateJob(jobId, {
        status: "failed",
        error_message: "No matching concepts found for domain/topic",
      });
      return;
    }

    // Load existing questions for deduplication checks
    const existingQuestions = dbService.getAllEngineQuestions({ limit: 1000 });

    let acceptedCount = 0;
    let rejectedCount = 0;
    let generatedCount = 0;
    const maxAttempts = targetCount * 3; // Prevent infinite loops

    try {
      while (acceptedCount < targetCount && generatedCount < maxAttempts) {
        generatedCount++;
        const concept = candidateConcepts[Math.floor(Math.random() * candidateConcepts.length)];

        // 1. Build prompt
        const { systemPrompt, userPrompt, schema } = buildGenerationPrompt({
          domain: concept.domain,
          category: concept.category,
          subcategory: concept.subcategory,
          concept,
          difficulty,
          cognitiveLevel: concept.cognitiveLevel || "Apply",
        });

        // 2. Generate structured JSON via AI Provider
        let rawResult;
        try {
          rawResult = await this.aiProvider.generateStructuredJson({
            systemPrompt,
            userPrompt,
            schema,
            domain: concept.domain,
            concept: concept,
            difficulty,
          });
        } catch (genErr) {
          console.error("AI Generation error:", genErr.message);
          continue;
        }

        const candidateData = rawResult.data;
        if (!candidateData || !candidateData.prompt || !Array.isArray(candidateData.options)) {
          rejectedCount++;
          continue;
        }

        // 3. Deduplication Check across all 3 layers
        const dedupResult = this.deduplicator.evaluateCandidate(candidateData, existingQuestions);
        if (dedupResult.isDuplicate) {
          rejectedCount++;
          dbService.updateJob(jobId, {
            generated_count: generatedCount,
            accepted_count: acceptedCount,
            rejected_count: rejectedCount,
          });
          continue;
        }

        // 4. Quality Scoring & Certification
        const scoreReport = this.qualityScorer.evaluate(candidateData, dedupResult);

        // 5. Build question entity
        const canonicalHash = dedupResult.canonicalHash || computeCanonicalHash(candidateData.prompt, candidateData.options);
        const templateSig = dedupResult.templateSignature || extractTemplateSignature(candidateData.prompt);

        const questionRecord = {
          domain: concept.domain,
          category: concept.category,
          subcategory: concept.subcategory,
          concept_id: concept.id,
          difficulty,
          cognitive_level: candidateData.cognitive_level || concept.cognitiveLevel || "Apply",
          prompt: candidateData.prompt,
          explanation: candidateData.explanation,
          mitre_attack_id: candidateData.mitre_attack_id || "",
          cve_id: candidateData.cve_id || "",
          quality_score: scoreReport.qualityScore,
          status: scoreReport.status, // 'approved' or 'needs_review' or 'rejected'
          validation_notes: scoreReport.issues,
          canonical_hash: canonicalHash,
          template_signature: templateSig,
          options: candidateData.options,
          source_job_id: jobId,
        };

        if (scoreReport.status === "rejected") {
          rejectedCount++;
        } else {
          // Persist to database
          const savedId = dbService.saveQuestion(questionRecord);
          existingQuestions.push({ ...questionRecord, id: savedId });
          acceptedCount++;
        }

        // Update Job progress in real time
        dbService.updateJob(jobId, {
          generated_count: generatedCount,
          accepted_count: acceptedCount,
          rejected_count: rejectedCount,
        });

        // Slight micro-pause to prevent CPU starvation
        await new Promise((r) => setTimeout(r, 10));
      }

      dbService.updateJob(jobId, {
        status: acceptedCount > 0 ? "completed" : "failed",
        completed_at: Date.now(),
        generated_count: generatedCount,
        accepted_count: acceptedCount,
        rejected_count: rejectedCount,
      });
    } catch (err) {
      console.error(`Job ${jobId} failed:`, err);
      dbService.updateJob(jobId, {
        status: "failed",
        error_message: err.message,
        completed_at: Date.now(),
      });
    }
  }
}
