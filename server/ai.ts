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
// 3. GENERATE CONDENSED SUMMARY HEADLINE (KIMI K3 / AI SYNTHESIS)
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

  const formattedContext = `PROYECTO / MÓDULO: ${project || 'General'}
ESTADO / ENFOQUE: ${mood || 'productive'}
TECNOLOGÍAS / TAGS: ${(tags || []).join(', ') || 'ingeniería_software'}

ACTIVIDADES Y CÓDIGO REGISTRADOS:
${activities}

${obstacles && obstacles.trim().length > 0 ? `OBSTÁCULOS / ERRORES DETECTADOS:\n${obstacles}\n` : ''}
${solutions && solutions.trim().length > 0 ? `SOLUCIONES TÉCNICAS APLICADAS:\n${solutions}\n` : ''}`;

  // --- PATH A: KIMI K3 (MOONSHOT AI) ---
  if (aiConfig.provider === 'kimi') {
    try {
      const systemPrompt = `Eres un Staff Software Engineer y Tech Lead de nivel mundial.
Tu objetivo es formular un SUMARIO TÉCNICO CONDENSADO DE ALTA DENSIDAD INFORMATIVA (máximo 6 a 12 palabras) que sintetice en un único titular descriptivo el reto técnico, la tecnología implicada y la solución o funcionalidad desarrollada.

REGLAS DE ORO OBLIGATORIAS:
1. PROHIBIDO COPIAR EL PRIMER PÁRRAFO o usar frases literales del texto del desarrollador. No copies oraciones introductorias ni encabezados de plantilla como "Tareas Realizadas", "Avances", "Notas", etc.
2. SINTETIZA aplicando la fórmula de ingeniería: [Acción técnica precisa en infinitivo o sustantivo de acción] + [Tecnología / Módulo específico] + [Problema resuelto o resultado concreto].
3. CONDENSA la información técnica al máximo para que sea inmediatamente comprensible en un dashboard ejecutivo o bitácora de ingeniería.
4. Ejemplos de sumarios esperados (alta densidad informativa):
   - "Implementación de rotación de tokens JWT en Supabase Auth y mitigación de expiración"
   - "Resolución de condición de carrera en WebSockets con colas asíncronas"
   - "Optimización de consultas SQL con índices compuestos y eliminación de cuellos de botella"
   - "Configuración de pipeline CI/CD en GitHub Actions con Docker y escaneo SAST"
   - "Refactorización del estado global en React con Zustand para evitar re-renders"
   - "Depuración de fuga de memoria en Node.js mediante análisis de Heap Snapshots"
5. Responde ESTRICTAMENTE con el titular en texto plano limpio. No agregues comillas, ni markdown, ni prefijos como "Titular:", "Resumen:" o "Encabezado:".`;

      const userPrompt = `Analiza la siguiente sesión técnica y genera el SUMARIO CONDENSADO Y DESCRIPTIVO:\n\n${formattedContext}`;

      const responseText = await callKimiAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], { temperature: 0.15 });

      const cleaned = responseText
        .trim()
        .replace(/^["'`]|["'`]$/g, '')
        .replace(/^(Titular|Encabezado|Resumen|Headline|Título|Sumario):\s*/i, '');

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
      const prompt = `Eres un Tech Lead de élite en ingeniería de software.
Formula un SUMARIO TÉCNICO CONDENSADO DE ALTA DENSIDAD INFORMATIVA (máximo 6 a 12 palabras) que sintetice la sesión de código.

REGLAS CRÍTICAS:
- NUNCA copies el primer párrafo ni oraciones textuales del texto de entrada.
- Sintetiza la acción clave: [Verbo/Acción de ingeniería] + [Tecnología/Módulo] + [Problema resuelto o logro técnico].
- Debe ser directo, descriptivo y profesional.
- Responde estrictamente con la frase limpia, sin comillas ni prefijos como "Titular:".

Contexto técnico:
${formattedContext}`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Genera un sumario técnico condensado, informativo y conciso (6-12 palabras). Nunca copies el primer párrafo.',
        },
      });

      const text = (response.text || '')
        .trim()
        .replace(/^["'`]|["'`]$/g, '')
        .replace(/^(Titular|Encabezado|Resumen|Headline|Título|Sumario):\s*/i, '');

      if (text.length > 5) {
        return text;
      }
    } catch (geminiErr: any) {
      console.error('Error generating headline with Gemini:', geminiErr);
    }
  }

  // --- PATH C: LOCAL SMART SYNTHESIZER (INFORMATION-DENSE CONDENSED FALLBACK) ---
  const fullText = `${activities} ${obstacles || ''} ${solutions || ''}`.toLowerCase();
  const projName = project && project.toLowerCase() !== 'general' ? project : 'módulo principal';

  // 1. Technical Action detection
  let action = 'Desarrollo e integración';
  if (fullText.includes('fix') || fullText.includes('correg') || fullText.includes('resolv') || fullText.includes('solucion') || fullText.includes('bug')) {
    action = 'Resolución y depuración';
  } else if (fullText.includes('optimiz') || fullText.includes('rendimiento') || fullText.includes('performance') || fullText.includes('latencia')) {
    action = 'Optimización de rendimiento';
  } else if (fullText.includes('refactor') || fullText.includes('limpieza') || fullText.includes('modular')) {
    action = 'Refactorización arquitectónica';
  } else if (fullText.includes('auth') || fullText.includes('login') || fullText.includes('jwt') || fullText.includes('permis')) {
    action = 'Implementación de seguridad y autenticación';
  } else if (fullText.includes('deploy') || fullText.includes('docker') || fullText.includes('ci/cd') || fullText.includes('cloud')) {
    action = 'Configuración de despliegue e infraestructura';
  } else if (fullText.includes('api') || fullText.includes('endpoint') || fullText.includes('backend') || fullText.includes('rest')) {
    action = 'Construcción de servicios backend y endpoints';
  } else if (fullText.includes('ui') || fullText.includes('component') || fullText.includes('layout') || fullText.includes('react')) {
    action = 'Diseño e integración de componentes reactivos';
  }

  // 2. Core Domain/Topic detection
  const topics: string[] = [];
  if (fullText.includes('supabase') || fullText.includes('postgres') || fullText.includes('sql') || fullText.includes('database') || fullText.includes('tabla')) topics.push('base de datos relacional');
  if (fullText.includes('jwt') || fullText.includes('token') || fullText.includes('session') || fullText.includes('auth')) topics.push('gestión de sesiones JWT');
  if (fullText.includes('memory') || fullText.includes('fuga') || fullText.includes('leak')) topics.push('mitigación de fuga de memoria');
  if (fullText.includes('cors') || fullText.includes('origin') || fullText.includes('headers')) topics.push('políticas CORS y cabeceras');
  if (fullText.includes('websocket') || fullText.includes('socket') || fullText.includes('realtime') || fullText.includes('sse')) topics.push('sincronización en tiempo real');
  if (fullText.includes('cache') || fullText.includes('redis')) topics.push('estrategia de caché distribuida');
  if (fullText.includes('test') || fullText.includes('jest') || fullText.includes('mock')) topics.push('cobertura de pruebas unitarias');
  if (fullText.includes('docker') || fullText.includes('container') || fullText.includes('k8s')) topics.push('contenedores Docker');
  if (fullText.includes('atlas') || fullText.includes('etiqueta') || fullText.includes('taxonom')) topics.push('codificación cualitativa y taxonomía');

  // 3. Synthesize condensed phrase (Never copy a raw line)
  if (topics.length > 0) {
    return `${action} de ${topics.slice(0, 2).join(' y ')} en ${projName}`;
  }

  if (tags && tags.length > 0 && tags[0] !== 'dev') {
    const cleanTags = tags.filter(t => t !== 'dev').slice(0, 3).join(', ');
    return `${action} técnica con stack ${cleanTags} en ${projName}`;
  }

  return `${action} técnica y sincronización en ${projName}`;
}

// -------------------------------------------------------------
// 4. GENERATE COMPOSITE CODE FOR ATLAS.TI (KIMI K3 / AI TAXONOMY)
// -------------------------------------------------------------
export async function generateCompositeCode(
  baseTag: string,
  content: string,
  project?: string
): Promise<{
  compositeCode: string;
  deducedKeyword: string;
  baseTag: string;
  description: string;
}> {
  const cleanBase = (baseTag || 'Dev').trim().replace(/^[#:]+|[:#]+$/g, '');
  const cleanContent = (content || '').trim();

  if (!cleanContent) {
    const defaultKeyword = 'desarrollo_general';
    return {
      compositeCode: `${cleanBase}: ${defaultKeyword}`,
      deducedKeyword: defaultKeyword,
      baseTag: cleanBase,
      description: `Actividades generales de desarrollo y mantenimiento en ${cleanBase}.`,
    };
  }

  const aiConfig = getAIConfig();

  // --- PATH A: KIMI K3 (MOONSHOT AI) ---
  if (aiConfig.provider === 'kimi') {
    try {
      const systemPrompt = `Eres un especialista en análisis cualitativo, taxonomía de software y codificación temática para Atlas.ti.
Tu objetivo es analizar un registro de actividad o fragmento de código de un desarrollador, deducir un código compuesto temático preciso y generar una breve descripción analítica o definición contextual.

REGLAS ESTRICTAS:
1. Recibirás una ETIQUETA_BASE (ej: "Python", "React", "Bug", "SQL", "DevOps", "TypeScript") y el CONTENIDO técnico del registro.
2. DEDUCE una palabra clave o subconcepto específico (1 a 3 palabras en minúsculas, usando formato snake_case o palabras separadas por guión bajo/espacio).
   Ejemplos de deducción:
   - Base "TypeScript" + texto sobre configuración de linters o scripts -> subconcepto: "tareas" o "configuracion_linter"
   - Base "React" + texto sobre CORS o headers de red -> subconcepto: "politica_cors"
   - Base "Python" + texto de resolver bucle infinito -> subconcepto: "correccion_bucles"
   - Base "Bug" + texto de fuga de memoria -> subconcepto: "fuga_memoria"
3. GENERA UNA DESCRIPCIÓN ANALÍTICA O DEFINICIÓN de 1 a 2 oraciones (máximo 150 caracteres) explicando el contexto en el que se usó este tag dentro del contenido de la entrada de la bitácora.
   Ejemplo: "Se refiere a la configuración y resolución de problemas relacionados con tareas automatizadas y linters en el entorno de desarrollo."
4. Responde OBLIGATORIAMENTE en formato JSON válido con la siguiente estructura:
{
  "baseTag": "${cleanBase}",
  "deducedKeyword": "palabra_clave_deducida",
  "compositeCode": "${cleanBase}: palabra_clave_deducida",
  "description": "Breve descripción analítica contextual (máximo 150 caracteres)."
}`;

      const userPrompt = `ETIQUETA_BASE: ${cleanBase}
PROYECTO: ${project || 'General'}

CONTENIDO DEL REGISTRO:
${cleanContent}

Genera el código compuesto y la descripción analítica en JSON:`;

      const responseText = await callKimiAPI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.2 }
      );

      const parsed = extractJSONFromText(responseText);
      if (parsed && (parsed.compositeCode || parsed.deducedKeyword)) {
        const deduced = (parsed.deducedKeyword || '')
          .trim()
          .replace(/\s+/g, '_')
          .toLowerCase();
        const base = (parsed.baseTag || cleanBase).trim();
        const compCode = parsed.compositeCode
          ? parsed.compositeCode.trim()
          : `${base}: ${deduced}`;
        const desc = (parsed.description || '').trim() ||
          `Se refiere al desarrollo y resolución técnica de ${deduced.replace(/_/g, ' ')} en el entorno de ${base}.`;

        return {
          compositeCode: compCode,
          deducedKeyword: deduced,
          baseTag: base,
          description: desc.slice(0, 200),
        };
      }

      // Fallback text parsing if raw text was returned instead of clean JSON
      const cleaned = responseText
        .trim()
        .replace(/^["'`]|["'`]$/g, '')
        .replace(/^(Código|Code|Tag|Resultado):\s*/i, '');

      if (cleaned.includes(':')) {
        const parts = cleaned.split(':');
        const deduced = parts.slice(1).join(':').trim().replace(/\s+/g, '_').toLowerCase();
        const base = parts[0].trim();
        return {
          compositeCode: `${base}: ${deduced}`,
          deducedKeyword: deduced,
          baseTag: base,
          description: `Se refiere al desarrollo y resolución técnica sobre ${deduced.replace(/_/g, ' ')} en ${base}.`,
        };
      } else if (cleaned.length > 0) {
        const deduced = cleaned.trim().replace(/\s+/g, '_').toLowerCase();
        return {
          compositeCode: `${cleanBase}: ${deduced}`,
          deducedKeyword: deduced,
          baseTag: cleanBase,
          description: `Se refiere al desarrollo y resolución técnica sobre ${deduced.replace(/_/g, ' ')} en ${cleanBase}.`,
        };
      }
    } catch (err: any) {
      console.warn('Kimi composite code generator error, falling back to Gemini:', err);
    }
  }

  // --- PATH B: GEMINI 3.7 FLASH ---
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const prompt = `Analiza este registro de desarrollo con la etiqueta base "${cleanBase}":
${cleanContent}

1. Deduce una palabra clave o subconcepto principal específico (1 a 3 palabras en formato snake_case o texto breve).
2. Genera una breve descripción analítica o definición de 1 a 2 oraciones (máximo 150 caracteres) explicando el contexto en el que se usó este tag dentro de la bitácora.

Responde en formato JSON con la siguiente estructura:
{
  "baseTag": "${cleanBase}",
  "deducedKeyword": "palabra_clave_deducida",
  "compositeCode": "${cleanBase}: palabra_clave_deducida",
  "description": "Breve descripción analítica contextual de 1-2 oraciones (máx 150 caracteres)"
}`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Eres un experto en codificación temática y taxonomía de software para Atlas.ti. Deduce un subconcepto técnico preciso de 1 a 3 palabras y una descripción analítica contextual concisa.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              baseTag: { type: Type.STRING },
              deducedKeyword: { type: Type.STRING },
              compositeCode: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['baseTag', 'deducedKeyword', 'compositeCode', 'description'],
          },
        },
      });

      const parsed = extractJSONFromText(response.text || '{}');
      if (parsed && parsed.deducedKeyword) {
        const cleanDed = parsed.deducedKeyword.trim().replace(/\s+/g, '_').toLowerCase();
        const desc = (parsed.description || '').trim() ||
          `Se refiere al trabajo y solución de problemas sobre ${cleanDed.replace(/_/g, ' ')} en ${cleanBase}.`;
        return {
          compositeCode: `${cleanBase}: ${cleanDed}`,
          deducedKeyword: cleanDed,
          baseTag: cleanBase,
          description: desc.slice(0, 200),
        };
      }
    } catch (geminiErr: any) {
      console.error('Error generating composite code with Gemini:', geminiErr);
    }
  }

  // --- PATH C: OFFLINE HEURISTIC DEDUCTION ---
  const lower = cleanContent.toLowerCase();
  let deduced = 'actividad_tecnica';

  if (lower.includes('loop') || lower.includes('bucle')) deduced = 'correccion_bucles';
  else if (lower.includes('leak') || lower.includes('memoria')) deduced = 'fuga_memoria';
  else if (lower.includes('render') || lower.includes('rerender')) deduced = 'optimizacion_renders';
  else if (lower.includes('auth') || lower.includes('jwt') || lower.includes('login')) deduced = 'autenticacion_tokens';
  else if (lower.includes('cors') || lower.includes('origin')) deduced = 'politica_cors';
  else if (lower.includes('query') || lower.includes('consulta') || lower.includes('sql')) deduced = 'optimizacion_queries';
  else if (lower.includes('test') || lower.includes('prueba')) deduced = 'cobertura_tests';
  else if (lower.includes('deploy') || lower.includes('docker') || lower.includes('ci/cd')) deduced = 'despliegue_contenedores';
  else if (lower.includes('refactor') || lower.includes('limpieza')) deduced = 'refactorizacion_codigo';
  else if (lower.includes('endpoint') || lower.includes('api') || lower.includes('route')) deduced = 'creacion_endpoints';
  else if (lower.includes('task') || lower.includes('tarea') || lower.includes('linter')) deduced = 'tareas';
  else {
    const firstWord = cleanContent.split(/\s+/).find(w => w.length > 4 && !['sobre', 'desde', 'hacia', 'donde', 'cuando'].includes(w.toLowerCase()));
    if (firstWord) deduced = firstWord.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  }

  const cleanDedHuman = deduced.replace(/_/g, ' ');
  return {
    compositeCode: `${cleanBase}: ${deduced}`,
    deducedKeyword: deduced,
    baseTag: cleanBase,
    description: `Se refiere a la implementación y resolución técnica de ${cleanDedHuman} en el entorno de ${cleanBase}.`,
  };
}


