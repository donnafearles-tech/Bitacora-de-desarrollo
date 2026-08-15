import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Storage } from './server/storage';
import { generateWeeklySummary, solveErrorWithAI, generateSummaryHeadline, generateCompositeCode, getAIConfig } from './server/ai';
import { getSupabaseConfig } from './server/supabase';
import { getServiceAccountCredentials, testSheetsConnection, syncDevLogsToSheet } from './server/sheets';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware for JSON parsing with large limit for image screenshots
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // --- API ROUTES ---

  // Health check & System Info
  app.get('/api/health', (req, res) => {
    const aiConfig = getAIConfig();
    const supabaseConfig = getSupabaseConfig();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        provider: supabaseConfig.isConfigured ? 'supabase' : 'local_json',
        supabaseConfigured: supabaseConfig.isConfigured,
      },
      ai: {
        provider: aiConfig.provider,
        label: aiConfig.label,
        hasKey: aiConfig.hasKey,
      },
    });
  });

  // Supabase Database Connection Status & Diagnostics
  app.get('/api/supabase/status', async (req, res) => {
    const config = getSupabaseConfig();
    const entries = await Storage.getAllAsync();
    res.json({
      isConfigured: config.isConfigured,
      url: config.maskedUrl,
      hasKey: config.hasKey,
      keyPreview: config.maskedKey,
      entriesFound: entries.length,
      tablesChecked: ['devlog_entries', 'bitacora_entries', 'bitacora', 'entries', 'logs'],
    });
  });

  // Force Resync from Supabase
  app.post('/api/supabase/resync', async (req, res) => {
    try {
      const entries = await Storage.getAllAsync();
      res.json({
        success: true,
        count: entries.length,
        message: `Sincronización completada. Se obtuvieron ${entries.length} registros.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Engine Info
  app.get('/api/ai/info', (req, res) => {
    const aiConfig = getAIConfig();
    res.json({
      provider: aiConfig.provider,
      label: aiConfig.label,
      model: aiConfig.model,
      hasKey: aiConfig.hasKey,
    });
  });

  // Get all entries with optional search/tag/project filters
  app.get('/api/entries', async (req, res) => {
    try {
      const { q, tag, project, startDate, endDate } = req.query;
      const entries = await Storage.getAllAsync({
        q: typeof q === 'string' ? q : undefined,
        tag: typeof tag === 'string' ? tag : undefined,
        project: typeof project === 'string' ? project : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
      });
      res.json(entries);
    } catch (err: any) {
      console.error('Error fetching entries:', err);
      res.status(500).json({ error: err.message || 'Internal error' });
    }
  });

  // Get single entry by date or id
  app.get('/api/entries/:idOrDate', async (req, res) => {
    const { idOrDate } = req.params;
    const entry = (await Storage.getByIdAsync(idOrDate)) || (await Storage.getByDateAsync(idOrDate));
    if (!entry) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json(entry);
  });

  // Create or Update Entry (UPSERT)
  app.post('/api/entries', async (req, res) => {
    try {
      const { date, summary } = req.body;
      if (!date || !summary) {
        return res.status(400).json({ error: 'La fecha y el resumen son obligatorios.' });
      }

      const saved = await Storage.upsertAsync(req.body);
      res.json(saved);
    } catch (err: any) {
      console.error('Error saving entry:', err);
      res.status(500).json({ error: err.message || 'Error al guardar el registro' });
    }
  });

  // Delete entry
  app.delete('/api/entries/:idOrDate', async (req, res) => {
    try {
      const { idOrDate } = req.params;
      const success = await Storage.deleteAsync(idOrDate);
      if (!success) {
        return res.status(404).json({ error: 'Registro no encontrado para eliminar' });
      }
      res.json({ success: true, message: 'Registro eliminado con éxito' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al eliminar' });
    }
  });

  // Productivity Analytics & Stats
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await Storage.getStatsAsync();
      res.json(stats);
    } catch (err: any) {
      console.error('Error computing stats:', err);
      res.status(500).json({ error: err.message || 'Error al computar estadísticas' });
    }
  });

  // AI Weekly / Monthly Summary
  app.post('/api/ai/summary', async (req, res) => {
    try {
      const { period, startDate, endDate, provider, customApiKey } = req.body;
      let filterStart = startDate;
      let filterEnd = endDate;

      if (!filterStart && period === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        filterStart = d.toISOString().split('T')[0];
      } else if (!filterStart && period === 'month') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        filterStart = d.toISOString().split('T')[0];
      }

      const entries = await Storage.getAllAsync({ startDate: filterStart, endDate: filterEnd });
      const summaryResult = await generateWeeklySummary(entries, { provider, customApiKey });
      res.json(summaryResult);
    } catch (err: any) {
      console.error('Error generating AI summary:', err);
      res.status(500).json({ error: err.message || 'Error al generar resumen con IA' });
    }
  });

  // AI Solve Error / Diagnose Bug
  app.post('/api/ai/solve-error', async (req, res) => {
    try {
      const { errorText, context, language } = req.body;
      if (!errorText) {
        return res.status(400).json({ error: 'Se requiere el texto del error u obstáculo.' });
      }
      const diagnosis = await solveErrorWithAI(errorText, context, language);
      res.json(diagnosis);
    } catch (err: any) {
      console.error('Error solving bug:', err);
      res.status(500).json({ error: err.message || 'Error al analizar el bug' });
    }
  });

  // AI Generate Summary Headline from Activities & Code
  app.post('/api/ai/generate-headline', async (req, res) => {
    try {
      const { activities, project, obstacles, solutions, tags, mood } = req.body;
      if (!activities || typeof activities !== 'string') {
        return res.status(400).json({ error: 'Se requiere el texto de actividades o código.' });
      }
      const headline = await generateSummaryHeadline(
        activities,
        project,
        obstacles,
        solutions,
        tags,
        mood
      );
      res.json({ headline });
    } catch (err: any) {
      console.error('Error generating headline:', err);
      res.status(500).json({ error: err.message || 'Error al generar el encabezado' });
    }
  });

  // AI Generate Composite Code for Atlas.ti
  app.post('/api/ai/generate-code', async (req, res) => {
    try {
      const { baseTag, content, project } = req.body;
      if (!baseTag) {
        return res.status(400).json({ error: 'Se requiere la etiqueta base (baseTag).' });
      }
      const result = await generateCompositeCode(
        baseTag,
        content || '',
        project
      );
      res.json(result);
    } catch (err: any) {
      console.error('Error generating composite code:', err);
      res.status(500).json({ error: err.message || 'Error al generar el código compuesto con IA' });
    }
  });

  // Export JSON Backup
  app.get('/api/export/json', async (req, res) => {
    try {
      const entries = await Storage.getAllAsync();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="devlog_backup_${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        app: 'DevLog Pro',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        entriesCount: entries.length,
        entries,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Import JSON Backup
  app.post('/api/import/json', async (req, res) => {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries)) {
        return res.status(400).json({ error: 'Formato de importación inválido. Se espera una lista de entries.' });
      }
      await Storage.restoreAllAsync(entries);
      res.json({ success: true, count: entries.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al importar datos' });
    }
  });

  // --- GOOGLE SHEETS SERVICE ACCOUNT INTEGRATION ---
  app.get('/api/sheets/status', (req, res) => {
    const creds = getServiceAccountCredentials();
    res.json({
      isConfigured: creds.isConfigured,
      clientEmail: creds.clientEmail,
      projectId: creds.projectId,
      defaultSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || null,
      error: creds.error,
    });
  });

  app.post('/api/sheets/test', async (req, res) => {
    try {
      const { spreadsheetId } = req.body;
      const result = await testSheetsConnection(spreadsheetId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error de conexión con Google Sheets' });
    }
  });

  app.post('/api/sheets/sync', async (req, res) => {
    try {
      const { spreadsheetId } = req.body;
      const entries = await Storage.getAllAsync();
      const result = await syncDevLogsToSheet(entries, spreadsheetId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error al sincronizar con Google Sheets' });
    }
  });

  // 404 handler for API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.path}` });
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Resolve dist directory defensively
    let distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html')) && fs.existsSync(path.join(__dirname, 'index.html'))) {
      distPath = __dirname;
    } else if (!fs.existsSync(path.join(distPath, 'index.html')) && fs.existsSync(path.join(__dirname, '..', 'dist', 'index.html'))) {
      distPath = path.join(__dirname, '..', 'dist');
    }

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DevLog Pro] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
