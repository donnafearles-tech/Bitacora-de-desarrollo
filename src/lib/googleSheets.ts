import { LogEntry } from '../types';

// Dynamic Spreadsheet URL & Config (configured via GOOGLE_SHEETS_SPREADSHEET_ID or Export Modal)
export const DEFAULT_SPREADSHEET_ID: string =
  ((import.meta as any)?.env?.VITE_SPREADSHEET_ID as string) || '';

export const getSpreadsheetUrl = (id?: string) => {
  const target = id || DEFAULT_SPREADSHEET_ID;
  return target ? `https://docs.google.com/spreadsheets/d/${target}/edit?gid=0#gid=0` : '';
};

export const SPREADSHEET_URL = getSpreadsheetUrl(DEFAULT_SPREADSHEET_ID);

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

// Extract Codebook rows for Atlas.ti
export function buildAtlasTiCodebookRows(entries: LogEntry[]): string[][] {
  const tagStats = new Map<string, { count: number; projects: Set<string>; descriptions: Set<string> }>();

  entries.forEach(e => {
    (e.tags || []).forEach(t => {
      const cleanTag = t.trim();
      if (!cleanTag) return;
      const desc = e.tagDescriptions?.[cleanTag] || e.tagDescriptions?.[t] || '';
      if (!tagStats.has(cleanTag)) {
        tagStats.set(cleanTag, { count: 0, projects: new Set<string>(), descriptions: new Set<string>() });
      }
      const item = tagStats.get(cleanTag)!;
      item.count += 1;
      if (e.project) item.projects.add(e.project);
      if (desc && desc.trim()) item.descriptions.add(desc.trim());
    });
  });

  const sortedTags = Array.from(tagStats.keys()).sort((a, b) => a.localeCompare(b));

  const getCategoryColor = (tag: string): string => {
    const lower = tag.toLowerCase();
    if (lower.startsWith('python')) return '#3776AB';
    if (lower.startsWith('react')) return '#06B6D4';
    if (lower.startsWith('bug') || lower.includes('error')) return '#EF4444';
    if (lower.startsWith('docker') || lower.startsWith('devops')) return '#0EA5E9';
    if (lower.startsWith('sql') || lower.startsWith('database')) return '#F59E0B';
    if (lower.startsWith('refactor')) return '#8B5CF6';
    if (lower.startsWith('node')) return '#22C55E';
    if (lower.startsWith('auth')) return '#EC4899';
    if (lower.startsWith('test')) return '#14B8A6';
    if (lower.startsWith('ai') || lower.startsWith('kimi')) return '#A855F7';
    return '#64748B';
  };

  const rows: string[][] = [
    ['Code', 'Comment', 'Color', 'Ocurrencias', 'Proyectos']
  ];

  sortedTags.forEach(tag => {
    const stats = tagStats.get(tag)!;
    const isComposite = tag.includes(':');
    const baseTag = isComposite ? tag.split(':')[0].trim() : tag;
    const subConcept = isComposite ? tag.split(':').slice(1).join(':').trim() : '';
    const projectsList = Array.from(stats.projects).join(', ') || 'General';
    const descArray = Array.from(stats.descriptions).filter(Boolean);

    let comment = '';
    if (isComposite) {
      const descripcion = descArray.length > 0
        ? descArray.join(' // ')
        : `Se refiere al desarrollo y resolución técnica de ${subConcept.replace(/_/g, ' ')} en ${baseTag}.`;
      comment = `Descripción: ${descripcion} | Categoría: ${baseTag} | Subconcepto: ${subConcept} | Generado por IA (Kimi)`;
    } else {
      const descripcion = descArray.length > 0 ? descArray.join(' // ') : '';
      comment = descripcion
        ? `Descripción: ${descripcion} | Categoría: ${baseTag}`
        : `Etiqueta base: ${baseTag}`;
    }

    rows.push([
      tag,
      comment,
      getCategoryColor(tag),
      stats.count.toString(),
      projectsList,
    ]);
  });

  return rows;
}

// Build Log Entries rows
export function buildLogEntriesRows(entries: LogEntry[]): string[][] {
  const rows: string[][] = [
    ['ID', 'Fecha', 'Proyecto', 'Resumen', 'Horas', 'Mood', 'Etiquetas / Códigos Atlas.ti', 'Actividades', 'Obstáculos', 'Soluciones', 'Plan Siguiente', 'Creado']
  ];

  entries.forEach(e => {
    rows.push([
      e.id,
      e.date,
      e.project || 'General',
      e.summary,
      (e.timeSpentHours || 0).toString(),
      e.mood || 'normal',
      (e.tags || []).join(', '),
      e.activities || '',
      e.obstacles || '',
      e.solutions || '',
      e.plan || '',
      e.created_at || '',
    ]);
  });

  return rows;
}

// Generate TSV (Tab Separated Values) for direct copy-paste into Google Sheets cell A1
export function generateGoogleSheetsTSV(entries: LogEntry[], type: 'codebook' | 'logs'): string {
  const rows = type === 'codebook' ? buildAtlasTiCodebookRows(entries) : buildLogEntriesRows(entries);
  return rows.map(r => r.map(cell => (cell || '').replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
}

// Apps Script Webhook Sync (Bypasses Google Account OAuth mismatch directly)
export async function syncViaAppsScriptWebhook(
  webhookUrl: string,
  spreadsheetId: string,
  entries: LogEntry[]
): Promise<{ success: boolean; message: string }> {
  const codebookData = buildAtlasTiCodebookRows(entries);
  const logEntriesData = buildLogEntriesRows(entries);

  const payload = {
    spreadsheetId,
    codebook: codebookData,
    logs: logEntriesData,
    syncDate: new Date().toISOString(),
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    mode: 'no-cors', // Apps script webapps redirect with 302
  });

  return {
    success: true,
    message: `Datos enviados exitosamente a Google Sheets (${entries.length} registros y libro de códigos).`,
  };
}

// Ensure Google Identity Services script is loaded
export function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Request Access Token using Google Identity Services (token client)
export async function requestGoogleAccessToken(): Promise<string> {
  await loadGsiScript();

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: (window as any).__GOOGLE_CLIENT_ID__ || '1020473858343-ai-studio-client.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          if (resp.access_token) {
            resolve(resp.access_token);
          } else {
            reject(new Error('No se recibió token de acceso.'));
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(err);
    }
  });
}

// Synchronize with Google Sheets API directly via user token
export async function syncWithGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  entries: LogEntry[]
): Promise<{ updatedCodebookCells: number; updatedLogCells: number }> {
  const codebookData = buildAtlasTiCodebookRows(entries);
  const logEntriesData = buildLogEntriesRows(entries);

  // 1. Ensure sheet tabs exist: 'Atlas_ti_Codebook' and 'Bitacora_Logs'
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          { addSheet: { properties: { title: 'Atlas_ti_Codebook' } } },
          { addSheet: { properties: { title: 'Bitacora_Logs' } } },
        ],
      }),
    });
  } catch {
    // Sheets may already exist, ignore errors
  }

  // 2. Clear old data from both sheets
  await Promise.allSettled([
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Atlas_ti_Codebook!A1:Z500:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Bitacora_Logs!A1:Z1000:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  // 3. Write Codebook
  const resCodebook = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Atlas_ti_Codebook!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: codebookData,
      }),
    }
  );

  if (!resCodebook.ok) {
    const fallbackRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: codebookData }),
      }
    );
    if (!fallbackRes.ok) {
      const err = await fallbackRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Error al escribir en Google Sheet. Verifica que la hoja esté compartida con permisos de edición.');
    }
  }

  // 4. Write Log Entries
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Bitacora_Logs!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: logEntriesData,
      }),
    }
  );

  return {
    updatedCodebookCells: codebookData.length * 5,
    updatedLogCells: logEntriesData.length * 12,
  };
}
