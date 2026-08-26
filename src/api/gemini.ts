import type { FileChange } from '../types/azure';

const MODEL = 'gemini-3.6-flash';
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 8000;

function withLineNumbers(content: string): string {
  return content
    .split('\n')
    .map((line, i) => `${i + 1}: ${line}`)
    .join('\n');
}

function buildPrompt(
  prTitle: string,
  prDescription: string,
  files: FileChange[]
): string {
  const filesSummary = files
    .map((f) => {
      if (f.changeType === 'delete') {
        return `=== ${f.path} (ELIMINADO) ===\n${withLineNumbers(f.oldContent ?? '')}`;
      }
      if (f.changeType === 'add') {
        return `=== ${f.path} (NUEVO) ===\n${withLineNumbers(f.newContent ?? '')}`;
      }
      return `=== ${f.path} (MODIFICADO) ===\n--- ANTES ---\n${f.oldContent}\n\n+++ DESPUÉS (usar estos números de línea) +++\n${withLineNumbers(f.newContent ?? '')}`;
    })
    .join('\n\n');

  return `Eres un senior developer haciendo code review. Tu trabajo es encontrar problemas REALES en el código, no dar consejos genéricos.

PR Título: ${prTitle}
PR Descripción: ${prDescription || '(sin descripción)'}

${filesSummary}

REGLAS ESTRICTAS:
- Solo reporta problemas que sean REALES y CONCRETOS: bugs, race conditions, null pointer exceptions, vulnerabilidades de seguridad (inyección SQL, XSS, secrets expuestos), memory leaks, lógica incorrecta, edge cases no manejados.
- También podés sugerir mejoras concretas de código que veas: simplificaciones, performance, patrones más idiomáticos, código duplicado que se podría unificar. Usá severity "suggestion" para estas.
- NO comentes sobre: typos en títulos/descripciones del PR, estilo de código, convenciones de nombres, falta de tests, falta de documentación, sugerencias de "buscar referencias" obvias, ni nada que sea preferencia personal.
- NO supongas ni especules sobre código que NO está en los archivos que te paso. No menciones "asegúrate de verificar X en el backend", "revisa si hay referencias en otros archivos", etc. Solo analiza el código que ves. Si algo no está en los archivos proporcionados, no existe para ti.
- Si la PR es una eliminación limpia de código, una refactorización simple, o cambios de configuración sin riesgo, di "No se encontraron problemas relevantes" y nada más.
- Sé directo y conciso. Si hay un bug, muestra la línea exacta y explica por qué es un problema.
- Responde en español.

FORMATO DE RESPUESTA OBLIGATORIO:
Responde ÚNICAMENTE con un JSON válido, sin texto antes ni después, sin bloques de código markdown. El JSON debe tener esta estructura exacta:
{
  "issues": [
    {
      "file": "ruta/al/archivo.ts",
      "line": "número de línea exacto de la versión DESPUÉS/NUEVO del archivo (ej: 42 o 40-45)",
      "severity": "bug" | "security" | "improvement" | "suggestion",
      "problem": "Descripción concisa del problema encontrado",
      "suggestion": "Propuesta concreta de cómo solucionarlo"
    }
  ]
}

Si no hay problemas relevantes, responde: {"issues": []}
No agregues ningún texto fuera del JSON.`;

}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { ReviewIssue } from '../types/review';
import type { ReviewIssue } from '../types/review';

export async function reviewPRWithGemini(
  apiKey: string,
  prTitle: string,
  prDescription: string,
  files: FileChange[]
): Promise<ReviewIssue[]> {
  const prompt = buildPrompt(prTitle, prDescription, files);
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(
      `/api/gemini/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }
    );

    if (res.status === 503) {
      lastError = `Modelo saturado (intento ${attempt}/${MAX_RETRIES})`;
      await delay(RETRY_DELAY_MS);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Respuesta vacía de Gemini');

    const parsed = JSON.parse(text);
    return (parsed.issues ?? []).map((i: Record<string, string>) => ({
      ...i,
      problem: i.problem ?? i.message ?? '',
      suggestion: i.suggestion ?? '',
      message: i.problem && i.suggestion
        ? `${i.problem}\n\n**Sugerencia:** ${i.suggestion}`
        : i.message ?? i.problem ?? '',
    }));
  }

  throw new Error(`Gemini no disponible después de ${MAX_RETRIES} intentos: ${lastError}`);
}
