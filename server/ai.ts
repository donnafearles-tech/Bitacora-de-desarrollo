import { GoogleGenAI, Type } from '@google/genai';
import { LogEntry, AISummaryResponse, AISolveErrorResponse } from '../src/types';

// Detect active AI keys
export function getAIConfig() {
  const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (kimiKey && kimiKey.trim().length > 0) {
    return {
      provider: 'kimi' as const,
      model: process.env.KIMI_MODEL || 'kimi-k3',
      apiKey: kimiKey.trim(),
      hasKey: true,
      label: 'Kimi K3 (Moonshot AI)',
    };
  }

  if (geminiKey && geminiKey.trim().length > 0) {
    return {
      provider: 'gemini' as const,
      model: 'gemini-3.7-flash',
      apiKey: geminiKey.trim(),
      hasKey: true,
      label: 'Gemini 3.7 Flash',
    };
  }

  return {
    provider: 'none' as const,
    model: 'offline',
    apiKey: '',
    hasKey: false,
    label: 'Modo Local (Sin API Key)',
  };
}

// Lazy initialization of GoogleGenAI client with user-agent
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to extract JSON from AI response (which might be wrapped in ```json ... ```)
function extractJSONFromText(text: string): any {
  if (!text) return null;
  const cleaned = text.trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Try match markdown ```json block
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = cleaned.match(jsonBlockRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }

  // Try extract between first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  return null;
}

// Moonshot / Kimi K3 HTTP Caller
async function callKimiAPI(
  messages: { role: string; content: string }[],
  options?: { model?: string; temperature?: number }
): Promise<string> {
  const config = getAIConfig();
  const apiKey = config.apiKey || process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('KIMI_API_KEY no encontrada. Configúrala en Google AI Studio Secrets o en tu archivo .env local.');
  }

  const model = options?.model || process.env.KIMI_MODEL || 'kimi-k3';
  const endpoints = [
    'https://api.moonshot.cn/v1/chat/completions',
    'https://api.moonshot.ai/v1/chat/completions',
  ];

  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: options?.temperature ?? 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      }

      // If model not found (e.g. older moonshot tier), retry with moonshot-v1-8k
      if (response.status === 400 || response.status === 404) {
        const errJson = await response.json().catch(() => ({}));
        if (model !== 'moonshot-v1-8k') {
          const fallbackRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'moonshot-v1-8k',
              messages: messages,
              temperature: options?.temperature ?? 0.3,
            }),
          });
          if (fallbackRes.ok) {
            const fbData = await fallbackRes.json();
            return fbData.choices?.[0]?.message?.content || '';
          }
        }
        throw new Error(errJson.error?.message || `Kimi API Error HTTP ${response.status}`);
      }

      const errText = await response.text();
      lastError = new Error(`Moonshot API error (${response.status}): ${errText}`);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo conectar a la API de Kimi K3.');
}

// -------------------------------------------------------------
// 1. GENERATE WEEKLY SUMMARY & MENTORSHIP
// -------------------------------------------------------------
export async function generateWeeklySummary(
  entries: LogEntry[],
  options?: { provider?: string; customApiKey?: string }
): Promise<AISummaryResponse> {
  const now = new Date().toISOString();

  if (!entries || entries.length === 0) {
    return {
      summary: 'No hay suficientes registros en el período seleccionado para generar un resumen técnico.',
      traction: ['Sin registros recientes'],
      blockers: ['No se detectaron obstáculos'],
      recommendations: ['Comienza registrando tus actividades diarias de código para obtener análisis.'],
      statsHeadline: 'Esperando nuevos registros de desarrollo',
      generatedAt: now,
    };
  }

  const aiConfig = getAIConfig();

  const formattedLogs = entries
    .map(
      (e, idx) =>
        `[Registro ${idx + 1}] Fecha: ${e.date} | Proyecto: ${e.project || 'General'} | Horas: ${e.timeSpentHours}h\n` +
        `Título: ${e.summary}\n` +
        `Actividades:\n${e.activities}\n` +
        `Obstáculos / Bugs: ${e.obstacles || 'Ninguno reportado'}\n` +
        `Soluciones aplicadas: ${e.solutions || 'N/A'}\n` +
        `Próximo plan: ${e.plan || 'N/A'}\n` +
        `Tecnologías: ${e.tags.join(', ')}`
    )
    .join('\n\n------------------------------------\n\n');

  // --- PATH A: KIMI K3 (MOONSHOT AI) ---
  if (aiConfig.provider === 'kimi' || options?.provider === 'moonshot') {
    try {
      const systemPrompt = `Eres un Staff Software Engineer y Tech Lead Mentor de élite mundial.
Tu misión es analizar la bitácora de desarrollo de un programador y generar una retrospectiva técnica estructurada.
Debes responder ESTRICTAMENTE en formato JSON válido con la siguiente estructura:
{
  "summary": "Resumen ejecutivo en prosa fluida con formato Markdown (negritas, viñetas técnicas, métricas). 3 a 5 párrafos detallando la tracción, tecnologías dominadas y velocidad de entrega.",
  "traction": ["Logro técnico 1", "Logro técnico 2", "Logro técnico 3"],
  "blockers": ["Patrón de bloqueo 1", "Patrón de bloqueo 2"],
  "recommendations": ["Directiva de arquitectura 1", "Mejor práctica 2", "Mejor práctica 3"],
  "statsHeadline": "Frase de impacto sobre el rendimiento técnico (ej: ⚡ Alta cadencia en desarrollo backend y resolución de concurrencia)"
}`;

      const userPrompt = `Analiza esta bitácora técnica de desarrollo:\n\n${formattedLogs}\n\nGenera el análisis técnico completo en formato JSON:`;

      const responseText = await callKimiAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const parsed = extractJSONFromText(responseText);
      if (parsed && parsed.summary) {
        return {
          summary: parsed.summary,
          traction: Array.isArray(parsed.traction) ? parsed.traction : ['Tracción técnica procesada'],
          blockers: Array.isArray(parsed.blockers) ? parsed.blockers : ['Sin bloqueos críticos'],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Continuar con buenas prácticas'],
          statsHeadline: parsed.statsHeadline || 'Retrospectiva analizada con Kimi K3',
          generatedAt: now,
        };
      }

      // If JSON couldn't be parsed directly, wrap text
      return {
        summary: responseText,
        traction: ['Análisis generado con Kimi K3'],
        blockers: ['Revisa la sección de detalles para observaciones'],
        recommendations: ['Continuar modularizando el código'],
        statsHeadline: 'Informe procesado por Kimi K3',
        generatedAt: now,
      };
    } catch (kimiErr: any) {
      console.warn('Error with Kimi K3 summary, checking Gemini fallback:', kimiErr);
    }
  }

  // --- PATH B: GEMINI 3.7 FLASH ---
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const prompt = `Actúa como un Staff Software Engineer / Tech Lead Mentor de élite.
Analiza la siguiente bitácora de actividad diaria de programación del desarrollador:

${formattedLogs}

Genera un informe semanal / de período exhaustivo, técnico y motivador en formato JSON con la siguiente estructura:
- "summary": Un resumen ejecutivo en prosa fluida (Markdown permitido con negritas, viñetas técnicas y métricas) de 3 a 5 párrafos destacando la tracción lograda, tecnologías dominadas y ritmo de trabajo.
- "traction": Lista de 3 a 5 logros de ingeniería concretos y victorias técnicas clave alcanzadas.
- "blockers": Lista de 2 a 4 obstáculos, patrones de errores repetitivos o cuellos de botella detectados.
- "recommendations": Lista de 3 a 5 sugerencias técnicas de mentoría y mejores prácticas de arquitectura/código recomendadas para los próximos días.
- "statsHeadline": Una frase impactante resumiendo el estado del desarrollador (ej: "🔥 Alto rendimiento en Backend y DevOps con excelente resolución de memoria").`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Eres un mentor de ingeniería de software senior y experto en arquitectura de software. Tu objetivo es proporcionar retroalimentación técnica precisa, constructiva y estructurada en español.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              traction: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              blockers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              statsHeadline: { type: Type.STRING },
            },
            required: ['summary', 'traction', 'blockers', 'recommendations', 'statsHeadline'],
          },
        },
      });

      const parsed = extractJSONFromText(response.text || '{}');
      if (parsed) {
        return {
          summary: parsed.summary || 'Resumen generado con éxito.',
          traction: parsed.traction || [],
          blockers: parsed.blockers || [],
          recommendations: parsed.recommendations || [],
          statsHeadline: parsed.statsHeadline || 'Ritmo de desarrollo constante',
          generatedAt: now,
        };
      }
    } catch (geminiErr: any) {
      console.error('Error generating AI summary with Gemini:', geminiErr);
    }
  }

  // --- PATH C: LOCAL FALLBACK ---
  return generateFallbackSummary(entries);
}

// -------------------------------------------------------------
// 2. SOLVE BUG & DIAGNOSE ERROR
// -------------------------------------------------------------
export async function solveErrorWithAI(
  errorText: string,
  context?: string,
  language?: string
): Promise<AISolveErrorResponse> {
  const aiConfig = getAIConfig();

  // --- PATH A: KIMI K3 ---
  if (aiConfig.provider === 'kimi') {
    try {
      const systemPrompt = `Eres un Staff Debugger y Solucionador de Bugs senior de nivel mundial.
Analiza errores, stack traces y comportamientos anómalos.
Debes responder ESTRICTAMENTE en formato JSON con la siguiente estructura:
{
  "diagnosis": "Diagnóstico preciso y directo de la causa raíz del fallo en español.",
  "explanation": "Explicación técnica detallada de por qué ocurrió el problema y cómo prevenirlo.",
  "solutionCode": "Código limpio, completo y corregido listo para aplicar como parche.",
  "bestPractices": [
    "Práctica preventiva 1",
    "Práctica preventiva 2",
    "Práctica preventiva 3"
  ]
}`;

      const userPrompt = `Lenguaje / Stack: ${language || 'Auto-detectar'}
Error / Stack Trace / Obstáculo:
${errorText}

Contexto adicional:
${context || 'No especificado'}`;

      const responseText = await callKimiAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const parsed = extractJSONFromText(responseText);
      if (parsed && parsed.diagnosis) {
        return {
          diagnosis: parsed.diagnosis,
          explanation: parsed.explanation || '',
          solutionCode: parsed.solutionCode || '',
          bestPractices: Array.isArray(parsed.bestPractices) ? parsed.bestPractices : [],
        };
      }
    } catch (err: any) {
      console.warn('Kimi bug solver error, falling back to Gemini:', err);
    }
  }

  // --- PATH B: GEMINI 3.7 FLASH ---
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const prompt = `Analiza este error o problema de programación reportado por el desarrollador:
Lenguaje / Entorno: ${language || 'Auto-detectar'}
Error / Stack Trace / Obstáculo:
${errorText}

Contexto adicional:
${context || 'No especificado'}

Proporciona un diagnóstico exacto de la causa raíz, una solución en código limpia y explicada, y 3 buenas prácticas preventivas.`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Eres un senior debugger y solucionador de bugs de software de nivel mundial. Explica con claridad la causa raíz y proporciona código funcional sin rodeos.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosis: { type: Type.STRING },
              explanation: { type: Type.STRING },
              solutionCode: { type: Type.STRING },
              bestPractices: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['diagnosis', 'explanation', 'solutionCode', 'bestPractices'],
          },
        },
      });

      const parsed = extractJSONFromText(response.text || '{}');
      if (parsed) return parsed;
    } catch (err: any) {
      console.error('Error solving bug with Gemini:', err);
    }
  }

  // --- PATH C: OFFLINE HEURISTIC ---
  return {
    diagnosis: 'Diagnóstico preliminar (Modo Local): Analiza el stacktrace buscando el archivo fuente y la línea exacta del fallo.',
    explanation: 'Configura tu KIMI_API_KEY o GEMINI_API_KEY en Google AI Studio Secrets o en tu archivo .env local para diagnósticos asistidos por IA en tiempo real.',
    solutionCode: `// Asegúrate de validar tipos, variables de entorno y manejar excepciones\ntry {\n  // Tu lógica de ejecución aquí\n} catch (err) {\n  console.error("Error capturado:", err);\n}`,
    bestPractices: [
      'Configurar KIMI_API_KEY en Secrets de Google AI Studio o en archivo .env.',
      'Añadir logs estructurados en puntos de fallo y verificar argumentos nulos.',
      'Escribir pruebas unitarias para aislar el escenario de error.',
    ],
  };
}

function generateFallbackSummary(entries: LogEntry[]): AISummaryResponse {
  const totalHours = entries.reduce((acc, e) => acc + (e.timeSpentHours || 0), 0);
  const allTags = entries.flatMap(e => e.tags);
  const uniqueTags = Array.from(new Set(allTags)).slice(0, 5);

  return {
    summary: `Durante este período registraste **${entries.length} jornadas de desarrollo** acumulando aproximadamente **${totalHours} horas** de trabajo en proyectos como ${Array.from(new Set(entries.map(e => e.project || 'General'))).join(', ')}. Las tecnologías principales involucradas fueron: ${uniqueTags.join(', ')}.\n\n*Nota: Para obtener análisis avanzado con IA, asegúrate de ingresar tu **KIMI_API_KEY** en Secrets de Google AI Studio o en tu archivo \`.env\`.*`,
    traction: entries.slice(0, 3).map(e => `${e.summary} (${e.date})`),
    blockers: entries
      .filter(e => e.obstacles && e.obstacles.trim().length > 0)
      .slice(0, 3)
      .map(e => e.obstacles),
    recommendations: [
      'Documentar la solución junto con el obstáculo para crear una base de conocimiento técnica sólida.',
      'Añadir tests automatizados para los bugs recurrentes identificados.',
      'Configurar KIMI_API_KEY para habilitar recomendaciones de arquitectura con IA.',
    ],
    statsHeadline: `🚀 ${entries.length} registros y ${totalHours}h dedicadas con ${uniqueTags.length} tecnologías clave`,
    generatedAt: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// 3. GENERATE SUMMARY HEADLINE FROM ACTIVITIES & CODE (KIMI K3)
// -------------------------------------------------------------
export async function generateSummaryHeadline(
  activities: string,
  project?: string,
  obstacles?: string,
  solutions?: string,
  tags?: string[],
  mood?: string
): Promise<string> {
  if (!activities || activities.trim().length === 0) {
    return 'Jornada de desarrollo e investigación técnica';
  }

  const aiConfig = getAIConfig();

  const formattedContext = `PROYECTO: ${project || 'General'}
ESTADO / MOOD: ${mood || 'productive'}
TAGS: ${(tags || []).join(', ') || 'dev'}

ACTIVIDADES Y CÓDIGO (MARKDOWN):
${activities}

${obstacles && obstacles.trim().length > 0 ? `OBSTÁCULOS / ERRORES ENFRENTADOS:\n${obstacles}\n` : ''}
${solutions && solutions.trim().length > 0 ? `SOLUCIONES APLICADAS:\n${solutions}\n` : ''}`;

  // --- PATH A: KIMI K3 (MOONSHOT AI) ---
  if (aiConfig.provider === 'kimi') {
    try {
      const systemPrompt = `Eres un Staff Software Engineer y Tech Lead de élite.
Tu objetivo es formular un ENCABEZADO / TITULAR TÉCNICO PROFESIONAL (máximo 6 a 14 palabras) que represente con exactitud el problema técnico resuelto, el reto arquitectónico superado o la funcionalidad central implementada en la sesión de desarrollo.

REGLAS ESTRICTAS:
1. NO copies las primeras líneas del texto, ni tomes títulos genéricos como "Tareas Realizadas", "Notas de desarrollo", "Avances", etc.
2. Analiza a fondo los fragmentos de código, los nombres de librerías, los errores reportados y las soluciones aplicadas para entender qué se construyó o arregló realmente.
3. Redacta un titular directo, descriptivo y técnico en español que cualquier Tech Lead o Senior Developer valoraría.
4. Ejemplos de estilo esperado:
   - "Resolución de condición de carrera en WebSockets y sincronización de estado"
   - "Corrección de bucle infinito en interceptor Axios y rotación de tokens JWT"
   - "Optimización de consultas SQL con índices compuestos y mitigación de N+1"
   - "Implementación de pipeline CI/CD en GitHub Actions con Docker y escaneo SAST"
   - "Depuración de fuga de memoria en Node.js mediante análisis de Heap Dumps"
5. Responde ÚNICAMENTE con la frase del titular en texto plano. No agregues comillas, ni markdown, ni prefijos como "Titular:", "Resumen:" o "Encabezado:".`;

      const userPrompt = `Analiza la siguiente bitácora y genera el encabezado técnico adecuado al problema o tarea de fondo:\n\n${formattedContext}`;

      const responseText = await callKimiAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], { temperature: 0.2 });

      const cleaned = responseText.trim().replace(/^["'`]|["'`]$/g, '').replace(/^(Titular|Encabezado|Resumen|Headline|Título):\s*/i, '');
      if (cleaned.length > 5) {
        return cleaned;
      }
    } catch (err: any) {
      console.warn('Kimi headline generator error, falling back to Gemini:', err);
    }
  }

  // --- PATH B: GEMINI 3.7 FLASH ---
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const prompt = `Eres un Tech Lead de ingeniería de software. Formula un ENCABEZADO / TITULAR TÉCNICO ADECUADO AL PROBLEMA O TAREA CENTRAL (máximo 6 a 14 palabras).

REGLAS CRÍTICAS:
- NO copies la primera línea ni encabezados repetitivos como "Tareas Realizadas".
- Identifica la problemática real resuelta, el módulo afectado, o la tecnología intervenida según el código y las actividades.
- Redacta el titular en español técnico, profesional y conciso.
- Responde estrictamente con la frase limpia, sin comillas ni prefijos.

Contexto de la sesión:
${formattedContext}`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Genera un encabezado técnico conciso (6-14 palabras) que describa la solución técnica o problema resuelto en la sesión.',
        },
      });

      const text = (response.text || '').trim().replace(/^["'`]|["'`]$/g, '').replace(/^(Titular|Encabezado|Resumen|Headline|Título):\s*/i, '');
      if (text.length > 5) {
        return text;
      }
    } catch (geminiErr: any) {
      console.error('Error generating headline with Gemini:', geminiErr);
    }
  }

  // --- PATH C: LOCAL HEURISTIC FALLBACK (SMART PROBLEM EXTRACTOR) ---
  const combinedText = `${activities} ${obstacles || ''} ${solutions || ''}`.toLowerCase();

  // Detect technical keywords & patterns
  const detectedIssues: string[] = [];
  if (combinedText.includes('memory leak') || combinedText.includes('fuga de memoria')) detectedIssues.push('fuga de memoria');
  if (combinedText.includes('cors') || combinedText.includes('origin')) detectedIssues.push('políticas CORS');
  if (combinedText.includes('jwt') || combinedText.includes('auth') || combinedText.includes('oauth') || combinedText.includes('token')) detectedIssues.push('autenticación y tokens');
  if (combinedText.includes('sql') || combinedText.includes('query') || combinedText.includes('postgres') || combinedText.includes('database')) detectedIssues.push('consultas y base de datos');
  if (combinedText.includes('docker') || combinedText.includes('container') || combinedText.includes('k8s')) detectedIssues.push('contenedores y despliegue');
  if (combinedText.includes('websocket') || combinedText.includes('socket') || combinedText.includes('sse')) detectedIssues.push('comunicación en tiempo real');
  if (combinedText.includes('cache') || combinedText.includes('redis')) detectedIssues.push('estrategia de cache y rendimiento');
  if (combinedText.includes('test') || combinedText.includes('jest') || combinedText.includes('pytest')) detectedIssues.push('cobertura de pruebas unitarias');
  if (combinedText.includes('refactor') || combinedText.includes('limpieza') || combinedText.includes('modular')) detectedIssues.push('refactorización de arquitectura');

  if (obstacles && obstacles.trim().length > 10) {
    const cleanObs = obstacles.replace(/^[#\-\*\s]+/, '').trim().split('\n')[0];
    if (cleanObs.length > 10) {
      return `Resolución de obstáculo: ${cleanObs.length > 55 ? cleanObs.slice(0, 52) + '...' : cleanObs}`;
    }
  }

  if (detectedIssues.length > 0) {
    return `Optimización y resolución de ${detectedIssues.slice(0, 2).join(' y ')} en ${project || 'módulo central'}`;
  }

  // Strip template lines & search for the first real technical description
  const candidateLines = activities
    .split('\n')
    .map(l => l.trim().replace(/^[#\-\*\s\[\]x]+/, '').trim())
    .filter(l => {
      const lower = l.toLowerCase();
      return (
        l.length > 10 &&
        !lower.startsWith('tareas realizadas') &&
        !lower.startsWith('fragmento de código') &&
        !lower.startsWith('describe tus') &&
        !lower.includes('```')
      );
    });

  if (candidateLines.length > 0) {
    const firstMeaningful = candidateLines[0];
    return firstMeaningful.length > 65 ? `${firstMeaningful.slice(0, 62)}...` : firstMeaningful;
  }

  return `Desarrollo y resolución técnica en ${project || 'módulo principal'}`;
}

