import { google } from 'googleapis';
import type { LogEntry } from '../src/types';

interface ServiceAccountCredentials {
  client_email?: string;
  private_key?: string;
  project_id?: string;
  [key: string]: any;
}

let cachedAuthClient: any = null;
let cachedEmail: string | null = null;
let cachedProjectId: string | null = null;

/**
 * Safely extracts and parses the Service Account JSON credentials from process.env.
 */
export function getServiceAccountCredentials(): {
  isConfigured: boolean;
  credentials: ServiceAccountCredentials | null;
  clientEmail: string | null;
  projectId: string | null;
  error?: string;
} {
  const rawJson = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!rawJson || rawJson.trim() === '') {
    return {
      isConfigured: false,
      credentials: null,
      clientEmail: null,
      projectId: null,
    };
  }

  try {
    let parsed: any;
    // Handle cases where the string might be wrapped or double encoded
    const trimmed = rawJson.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      parsed = JSON.parse(trimmed);
    } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      parsed = JSON.parse(JSON.parse(trimmed));
    } else {
      parsed = JSON.parse(trimmed);
    }

    if (!parsed.client_email || !parsed.private_key) {
      return {
        isConfigured: false,
        credentials: null,
        clientEmail: parsed.client_email || null,
        projectId: parsed.project_id || null,
        error: 'El JSON no contiene client_email o private_key válidos.',
      };
    }

    cachedEmail = parsed.client_email;
    cachedProjectId = parsed.project_id || null;

    return {
      isConfigured: true,
      credentials: parsed,
      clientEmail: parsed.client_email,
      projectId: parsed.project_id || null,
    };
  } catch (err: any) {
    return {
      isConfigured: false,
      credentials: null,
      clientEmail: null,
      projectId: null,
      error: `Error al parsear JSON de Service Account: ${err.message}`,
    };
  }
}

/**
 * Returns authenticated Google Sheets API client.
 */
export function getSheetsClient() {
  const { isConfigured, credentials, error } = getServiceAccountCredentials();

  if (!isConfigured || !credentials) {
    throw new Error(error || 'GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON no está configurado.');
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, auth, clientEmail: credentials.client_email };
}

/**
 * Validates connection to a specific Spreadsheet ID or tests authentication.
 */
export async function testSheetsConnection(spreadsheetId?: string) {
  const targetId = spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const { isConfigured, clientEmail, projectId, error } = getServiceAccountCredentials();

  if (!isConfigured) {
    return {
      success: false,
      isConfigured: false,
      message: error || 'La variable GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON no está configurada en los Secretos.',
    };
  }

  if (!targetId) {
    return {
      success: true,
      isConfigured: true,
      clientEmail,
      projectId,
      message: `Credenciales de Cuenta de Servicio válidas (${clientEmail}). Falta especificar el Spreadsheet ID.`,
    };
  }

  try {
    const { sheets } = getSheetsClient();
    const res = await sheets.spreadsheets.get({
      spreadsheetId: targetId,
    });

    return {
      success: true,
      isConfigured: true,
      clientEmail,
      projectId,
      title: res.data.properties?.title,
      sheets: res.data.sheets?.map(s => s.properties?.title),
      message: `Conexión exitosa a la hoja: "${res.data.properties?.title}"`,
    };
  } catch (err: any) {
    return {
      success: false,
      isConfigured: true,
      clientEmail,
      projectId,
      message: `Error al acceder a la hoja: ${err.message}. Asegúrate de haber compartido la hoja de Google con permisos de Editor a: ${clientEmail}`,
    };
  }
}

/**
 * Syncs entries array into the Google Spreadsheet.
 */
export async function syncDevLogsToSheet(entries: LogEntry[], spreadsheetId?: string) {
  const targetId = spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!targetId) {
    throw new Error('Debes proporcionar el ID de la hoja de Google Sheets (Spreadsheet ID).');
  }

  const { sheets, clientEmail } = getSheetsClient();

  // 1. Get spreadsheet info to check if 'DevLog' sheet exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: targetId });
  const sheetNames = meta.data.sheets?.map(s => s.properties?.title) || [];
  const targetSheetName = sheetNames.includes('DevLog') ? 'DevLog' : sheetNames[0] || 'Sheet1';

  // 2. Prepare header and rows
  const headers = [
    'ID',
    'FECHA',
    'PROYECTO',
    'SUMARIO / TITULAR',
    'ACTIVIDADES Y CÓDIGO',
    'OBSTÁCULOS / ERRORES',
    'SOLUCIONES APLICADAS',
    'PLAN PRÓXIMO',
    'TAGS_ATLAS_TI',
    'HORAS',
    'ESTADO_MOOD',
    'FECHA_CREACION',
  ];

  const rows = entries.map(e => [
    e.id,
    e.date,
    e.project || 'General',
    e.summary,
    e.activities,
    e.obstacles || '',
    e.solutions || '',
    e.plan || '',
    Array.isArray(e.tags) ? e.tags.join(', ') : '',
    e.timeSpentHours || 4,
    e.mood || 'productive',
    e.created_at || new Date().toISOString(),
  ]);

  const values = [headers, ...rows];

  // 3. Clear and overwrite values in the target sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId: targetId,
    range: `${targetSheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });

  return {
    success: true,
    rowsCount: entries.length,
    sheetName: targetSheetName,
    spreadsheetTitle: meta.data.properties?.title,
    clientEmail,
  };
}
