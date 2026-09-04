/**
 * Strict Prompt Engineering & Schema Definition for Question Generation Engine
 * Enforces:
 * - Single unambiguous answer
 * - 3 plausible distractors from the EXACT same technical universe
 * - Zero giveaways (no "all of above", no grammar/length bias, no absolute qualifiers)
 * - Strict RFC 5737 / RFC 2606 compliance for IPs/domains
 * - MITRE ATT&CK / CVE linkage where applicable
 */

export const QUESTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Tactical cybersecurity question stem, scenario-based or diagnostic. No giveaways.",
    },
    cognitive_level: {
      type: "string",
      enum: ["Remember", "Understand", "Apply", "Analyze", "Evaluate"],
    },
    difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard", "expert"],
    },
    options: {
      type: "array",
      description: "Exactly 4 options. All from the same ontological domain.",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          is_correct: { type: "boolean" },
          rationale: {
            type: "string",
            description: "Why this option is correct or plausible distractor rationale.",
          },
        },
        required: ["text", "is_correct", "rationale"],
      },
    },
    explanation: {
      type: "string",
      description: "Deep technical breakdown of why the correct option is right and why the other 3 fail.",
    },
    mitre_attack_id: {
      type: "string",
      description: "Valid MITRE ATT&CK technique (e.g., T1059.001) or empty string.",
    },
    cve_id: {
      type: "string",
      description: "Valid CVE format (CVE-YYYY-NNNNN) or empty string.",
    },
    concept_id: {
      type: "string",
      description: "Target concept identifier from the concept graph.",
    },
  },
  required: ["prompt", "cognitive_level", "difficulty", "options", "explanation"],
};

export const PROMPT_SYSTEM_INSTRUCTION = `Eres el "Question Generation Engine" de alta fidelidad para Jackal — Competitive Cybersecurity Training.
Tu propósito es generar preguntas de ciberseguridad técnicas, desafiantes y sin ambigüedad para operadores, analistas SOC, ingenieros de detección y pentesters.

NORMAS CRÍTICAS DE CALIDAD (INCUMPLIR UNA INVALIDA LA PREGUNTA):
1. HOMOGENEIDAD DE DISTRACTORES:
   - Los 4 distractores DEBEN pertenecer al mismo universo ontológico.
   - Si la respuesta correcta es un comando de PowerShell ('Invoke-Mimikatz'), las otras 3 deben ser comandos o cmdlets creíbles de PowerShell (ej: 'Get-GPOReport', 'Export-Clixml', 'Invoke-WmiMethod'), NUNCA una herramienta web ni un protocolo.
   - Si la respuesta es un vector de ataque Kerberos (ej: Kerberoasting), las 3 falsas deben ser otros vectores de Active Directory (ej: AS-REP Roasting, DCSync, Overpass-the-Hash).
   - NUNCA inventes nombres absurdos ni respuestas cómicas o caricaturescas.

2. SIMETRÍA GRAMATICAL Y DE LONGITUD:
   - Todas las opciones deben tener una longitud similar (diferencia de longitud máxima de ±30%).
   - Si la respuesta correcta comienza con un infinitivo verbal ("Auditar...", "Deshabilitar..."), las otras 3 opciones DEBEN comenzar con la misma estructura.
   - No des pistas morfosintácticas entre el enunciado y la respuesta (singular/plural, género).

3. PROHIBICIONES ABSOLUTAS:
   - PROHIBIDO usar "Todas las anteriores", "Ninguna de las anteriores", "A y B son correctas".
   - PROHIBIDO usar absolutos fáciles de descartar: "Siempre", "Nunca", "Bajo ninguna circunstancia", "Exclusivamente", "Imposible".
   - PROHIBIDO hacer preguntas triviales de memorización de acrónimos (ej: "¿Qué significa CIA?").

4. DIRECCIONES IP Y DOMINIOS VÁLIDOS (SEGURIDAD Y ESTÁNDAR):
   - Usa EXCLUSIVAMENTE prefijos reservados para documentación y pruebas:
     * RFC 5737: 192.0.2.0/24 (TEST-NET-1), 198.51.100.0/24 (TEST-NET-2), 203.0.113.0/24 (TEST-NET-3).
     * RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.
     * RFC 2606 Dominios: example.com, example.org, corp.local, internal.lab.
   - NUNCA utilices IPs públicas enrutables de producción ni nombres de empresas reales como víctimas sin consentimiento.

5. TAXONOMÍA Y MITRE ATT&CK:
   - Si aplica, vincula con el ID de técnica MITRE ATT&CK correcto (ej: T1078, T1059.001, T1110) y CVE si se menciona una vulnerabilidad real.
   - La explicación debe ser profunda y formativa: justifica el por qué técnico de la correcta y por qué falla cada uno de los 3 distractores.

6. FORMATO DE SALIDA:
   - Genera ÚNICAMENTE un objeto JSON válido conforme al esquema indicado.
   - Exactamente 1 opción con is_correct = true y exactamente 3 opciones con is_correct = false.
   - Idioma: Español técnico profesional con términos del sector comúnmente en inglés (ej: "Pass-the-Hash", "Buffer Overflow", "Golden Ticket", "Memory Dump").`;

export function buildGenerationPrompt({
  domain,
  category,
  subcategory,
  concept,
  difficulty = "medium",
  cognitiveLevel = "Apply",
  language = "es",
  contextHints = [],
}) {
  const hints = contextHints.length > 0 ? `\nPistas de contexto adicionales:\n- ${contextHints.join("\n- ")}` : "";

  const userPrompt = `Genera una pregunta táctica de alta calidad para la plataforma Jackal con los siguientes parámetros:

- Dominio: ${domain || "Ciberseguridad"}
- Categoría: ${category || "Defensa y Operaciones"}
- Subcategoría: ${subcategory || "Análisis Técnico"}
- Concepto Clave: ${concept?.name || concept?.id || "Técnica avanzada de detección / evasión"}
- Nivel Cognitivo de Bloom: ${cognitiveLevel}
- Nivel de Dificultad: ${difficulty} (easy, medium, hard, expert)
- Objetivos de Aprendizaje: ${(concept?.objectives || ["analizar", "diagnosticar", "diferenciar"]).join(", ")}
- Etiquetas Relevantes: ${(concept?.tags || []).join(", ")}${hints}

Recuerda:
- Exactamente 1 respuesta correcta y 3 distractores técnicos del mismo nivel y universo.
- Sin pistas de descarte ni trampas gramaticales.
- Cumple rigurosamente el esquema JSON.`;

  return {
    systemPrompt: PROMPT_SYSTEM_INSTRUCTION,
    userPrompt,
    schema: QUESTION_JSON_SCHEMA,
  };
}
