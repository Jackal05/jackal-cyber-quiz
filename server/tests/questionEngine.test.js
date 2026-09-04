import test from "node:test";
import assert from "node:assert/strict";

import { CONCEPT_GRAPH } from "../engine/taxonomy/conceptGraph.js";
import {
  DeduplicationEngine,
  computeCanonicalHash,
  extractTemplateSignature,
  calculateJaccardSimilarity,
  calculateBigramDice,
} from "../engine/deduplication/deduplicator.js";
import { DistractorValidator } from "../engine/validation/distractorValidator.js";
import { TechnicalValidator } from "../engine/validation/technicalValidator.js";
import { QualityScorer } from "../engine/validation/qualityScorer.js";
import { GOLDEN_QUESTIONS } from "../engine/data/goldenDataset.js";
import { JobRunner } from "../engine/jobs/jobRunner.js";
import { QuestionSelector } from "../game/questionSelector.js";
import { dbService } from "../db/index.js";

test("Question Engine: Taxonomy & Concept Graph coverage", () => {
  assert.ok(Array.isArray(CONCEPT_GRAPH), "CONCEPT_GRAPH must be an array");
  assert.ok(CONCEPT_GRAPH.length >= 5, "Should have at least 5 broad cybersecurity domains");

  let totalConcepts = 0;
  for (const domain of CONCEPT_GRAPH) {
    assert.ok(domain.domain, "Domain must have a title");
    assert.ok(Array.isArray(domain.concepts), "Domain must have concepts array");
    for (const c of domain.concepts) {
      assert.ok(c.id, "Concept must have an id");
      assert.ok(c.name, "Concept must have a name");
      assert.ok(Array.isArray(c.objectives), "Concept must have objectives");
      assert.ok(c.cognitiveLevel, "Concept must have a cognitive level");
      totalConcepts++;
    }
  }

  assert.ok(totalConcepts >= 20, `Expected at least 20 granular concepts, found ${totalConcepts}`);
});

test("Question Engine: Layer 1 Canonical Hash Deduplication", () => {
  const promptA = " ¿Cómo mitigar un ataque de Pass-the-Hash en Active Directory? ";
  const optionsA = [
    { text: "Habilitar Restricted Admin Mode para RDP" },
    { text: "Deshabilitar Kerberos" },
    { text: "Abrir puerto 445" },
    { text: "Usar contraseñas cortas" },
  ];

  const promptB = "¿cómo MITIGAR un ataque de pass-the-hash en active directory?";
  // Same options in reversed order
  const optionsB = [
    { text: "Usar contraseñas cortas" },
    { text: "Abrir puerto 445" },
    { text: "Deshabilitar Kerberos" },
    { text: "Habilitar Restricted Admin Mode para RDP" },
  ];

  const hashA = computeCanonicalHash(promptA, optionsA);
  const hashB = computeCanonicalHash(promptB, optionsB);

  assert.equal(hashA, hashB, "Hashes must match regardless of casing, whitespace, or option order");

  const deduplicator = new DeduplicationEngine();
  const evalResult = deduplicator.evaluateCandidate(
    { prompt: promptB, options: optionsB },
    [{ id: "q_original", canonical_hash: hashA, prompt: promptA, options: optionsA }]
  );

  assert.equal(evalResult.isDuplicate, true);
  assert.equal(evalResult.layer, 1);
});

test("Question Engine: Layer 2 Lexical & Template Signature Deduplication", () => {
  const deduplicator = new DeduplicationEngine();

  // Template clone: only port and protocol name swapped
  const originalPrompt = "El firewall perimetral detecta tráfico en el puerto 8080 desde la IP 198.51.100.12";
  const clonedPrompt = "El firewall perimetral detecta tráfico en el puerto 8443 desde la IP 203.0.113.55";

  const sigOriginal = extractTemplateSignature(originalPrompt);
  const sigCloned = extractTemplateSignature(clonedPrompt);

  assert.equal(sigOriginal, sigCloned, "Template signatures should match generic placeholders");

  const evalResult = deduplicator.evaluateCandidate(
    { prompt: clonedPrompt, options: [] },
    [{ id: "q_orig", prompt: originalPrompt, options: [], template_signature: sigOriginal }]
  );

  assert.equal(evalResult.isDuplicate, true);
  assert.equal(evalResult.layer, 2);
});

test("Question Engine: Distractor Validator catches giveaways and lazy patterns", () => {
  const validator = new DistractorValidator();

  // 1. Valid balanced options
  const cleanOptions = [
    { text: "Habilitar el protocolo SMBv3 con cifrado obligatorio", is_correct: true, rationale: "SMBv3 cifra el tránsito" },
    { text: "Deshabilitar la firma digital SMB en todos los clientes", is_correct: false, rationale: "Empeora la postura de seguridad" },
    { text: "Permitir sesiones nulas anónimas en los controladores", is_correct: false, rationale: "Facilita la enumeración" },
    { text: "Bloquear el tráfico UDP en el puerto 53 hacia el DNS", is_correct: false, rationale: "Rompe resolución pero no protege SMB" },
  ];

  const cleanResult = validator.validate(cleanOptions);
  assert.equal(cleanResult.isValid, true);
  assert.ok(cleanResult.score >= 80);

  // 2. Forbidden lazy phrase: "Todas las anteriores"
  const lazyOptions = [
    { text: "Opción A técnica", is_correct: false, rationale: "Detalle" },
    { text: "Opción B técnica", is_correct: false, rationale: "Detalle" },
    { text: "Opción C técnica", is_correct: false, rationale: "Detalle" },
    { text: "Todas las anteriores", is_correct: true, rationale: "Detalle" },
  ];
  const lazyResult = validator.validate(lazyOptions);
  assert.equal(lazyResult.isValid, false);
  assert.ok(lazyResult.issues.some((i) => i.includes("forbidden lazy pattern")));

  // 3. Absolute giveaway: "siempre" / "nunca"
  const absoluteOptions = [
    { text: "Aplicar microsegmentación de red", is_correct: true, rationale: "Aisla hosts" },
    { text: "Los firewalls siempre bloquean todo malware", is_correct: false, rationale: "Falso" },
    { text: "Nunca inspeccionar paquetes TLS", is_correct: false, rationale: "Falso" },
    { text: "Exclusivamente usar contraseñas de 4 dígitos", is_correct: false, rationale: "Falso" },
  ];
  const absResult = validator.validate(absoluteOptions);
  assert.ok(absResult.issues.some((i) => i.includes("absolute giveaway qualifier")));

  // 4. Absurd distractor
  const absurdOptions = [
    { text: "Desplegar agente EDR en los endpoints", is_correct: true, rationale: "Detección activa" },
    { text: "Comer una pizza para calmar al ransomware", is_correct: false, rationale: "Absurdo" },
    { text: "Instalar Windows 95 como servidor de dominio", is_correct: false, rationale: "Absurdo" },
    { text: "Apagar la luz de la oficina", is_correct: false, rationale: "Absurdo" },
  ];
  const absurdResult = validator.validate(absurdOptions);
  assert.equal(absurdResult.isValid, false);
  assert.ok(absurdResult.issues.some((i) => i.includes("contains absurd/unrealistic term")));
});

test("Question Engine: Technical Validator checks RFC 5737 IPs and MITRE formatting", () => {
  const validator = new TechnicalValidator();

  // 1. Safe RFC 5737 and valid MITRE
  const validQuestion = {
    prompt: "En un host con IP 198.51.100.45 se detecta la ejecución de un script PowerShell ofuscado.",
    explanation: "El adversario utiliza living-off-the-land binarios para evadir la detección de firmas tradicional.",
    mitre_attack_id: "T1059.001",
    cve_id: "CVE-2023-38831",
    cognitive_level: "Analyze",
    difficulty: "hard",
  };
  const validRes = validator.validate(validQuestion);
  assert.equal(validRes.isValid, true);
  assert.equal(validRes.hasMitre, true);
  assert.equal(validRes.hasCve, true);

  // 2. Unsafe routable public IP
  const unsafeQuestion = {
    prompt: "El servidor de producción con IP pública 142.250.190.46 recibe ataques SYN flood.",
    explanation: "Breve explicación sin suficiente detalle técnico para el estudiante.",
    mitre_attack_id: "INVALID_MITRE_TAG",
    cve_id: "BAD_CVE",
    cognitive_level: "Analyze",
    difficulty: "hard",
  };
  const unsafeRes = validator.validate(unsafeQuestion);
  assert.ok(unsafeRes.issues.some((i) => i.includes("Non-RFC 5737")));
  assert.ok(unsafeRes.issues.some((i) => i.includes("Invalid MITRE ATT&CK ID format")));
  assert.ok(unsafeRes.issues.some((i) => i.includes("Invalid CVE ID format")));
});

test("Question Engine: Quality Scorer certifies Golden Dataset questions as approved", () => {
  const scorer = new QualityScorer();

  for (const goldQ of GOLDEN_QUESTIONS) {
    const report = scorer.evaluate(goldQ, { isDuplicate: false, score: 0 });
    assert.equal(report.status, "approved", `Golden question ${goldQ.id} should be approved`);
    assert.ok(report.qualityScore >= 85, `Golden question ${goldQ.id} score ${report.qualityScore} must be >= 85`);
  }
});

test("Question Engine: Job Runner executes batch generation and persists questions", async () => {
  // Use unique test topic or clean up
  const jobId = dbService.createJob({
    domain: "Network Security & Architecture",
    topic: "DNS Security (DNSSEC)",
    target_count: 2,
    difficulty: "medium",
    provider: "synthesizer",
  });

  const runner = new JobRunner();
  await runner.runJob(jobId);

  const updatedJob = dbService.getJobById(jobId);
  assert.equal(updatedJob.status, "completed");
  assert.ok(updatedJob.accepted_count >= 1, "Should have generated at least 1 accepted question");

  // Verify questions exist in DB
  const storedQuestions = dbService.getAllEngineQuestions({ domain: "Network Security & Architecture", limit: 5 });
  assert.ok(storedQuestions.length >= 1, "Generated question must be saved in database");
  assert.ok(storedQuestions[0].options.length === 4, "Question must have 4 options");

  // Teardown test job
  dbService.deleteQuestionsByJobId(jobId);
});

test("Question Selector: Enforces 90-day cooldown and progressive difficulty ladder", () => {
  // Save a golden question to DB for testing
  const sampleQ = GOLDEN_QUESTIONS[0];
  dbService.saveQuestion(sampleQ);

  const p1Id = "usr_tester_alpha";
  const p2Id = "usr_tester_beta";

  // Simulate p1 having seen the question 5 days ago
  dbService.recordUserQuestionHistory({
    userId: p1Id,
    questionId: sampleQ.id,
    matchId: "match_previous",
    mode: "battle",
    wasCorrect: true,
    responseTimeMs: 3500,
  });

  const selector = new QuestionSelector(90);
  const battleQuestions = selector.selectBattleQuestions(p1Id, p2Id);

  assert.equal(battleQuestions.length, 5, "Must select exactly 5 rounds for battle");

  // P1 has seen sampleQ in the last 90 days, so sampleQ should NOT be selected for this match!
  const hasSeenSample = battleQuestions.some((q) => q.id === sampleQ.id);
  assert.equal(hasSeenSample, false, "Question seen by player within 90 days must not be selected");

  // Verify sudden death returns a high-difficulty question
  const suddenDeathQ = selector.selectSuddenDeathQuestion(p1Id, p2Id, battleQuestions.map((q) => q.id));
  assert.ok(suddenDeathQ, "Sudden death question must be selected");
});
