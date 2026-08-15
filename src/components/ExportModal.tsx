import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  Upload,
  Database,
  Check,
  AlertCircle,
  Tag,
  BookOpen,
  Cloud,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Copy,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LogEntry } from '../types';
import { exportToExcel, exportToPdf, exportToMarkdown, exportCodebookForAtlasTi } from '../lib/exportUtils';
import {
  DEFAULT_SPREADSHEET_ID,
  SPREADSHEET_URL,
  SERVICE_ACCOUNT_EMAIL,
  OWNER_ACCOUNT_EMAIL,
  generateGoogleSheetsTSV,
  requestGoogleAccessToken,
  syncWithGoogleSheets,
  syncViaAppsScriptWebhook,
} from '../lib/googleSheets';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LogEntry[];
  onImportJson: (importedEntries: LogEntry[]) => Promise<void>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  onImportJson,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Google Sheets state
  const [spreadsheetId, setSpreadsheetId] = useState(DEFAULT_SPREADSHEET_ID);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [saStatus, setSaStatus] = useState<{
    isConfigured: boolean;
    clientEmail: string | null;
    projectId: string | null;
    defaultSpreadsheetId: string | null;
  }>({ isConfigured: false, clientEmail: null, projectId: null, defaultSpreadsheetId: null });

  const [sheetsSyncResult, setSheetsSyncResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
  } | null>(null);

  // Clipboard copy state
  const [copiedType, setCopiedType] = useState<'codebook' | 'logs' | null>(null);

  // Webhook / Apps Script option state
  const [showAppsScriptGuide, setShowAppsScriptGuide] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/sheets/status')
        .then(r => r.json())
        .then(data => {
          if (data && typeof data.isConfigured === 'boolean') {
            setSaStatus(data);
            if (data.defaultSpreadsheetId) {
              setSpreadsheetId(data.defaultSpreadsheetId);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr = JSON.stringify(
      {
        app: 'DevLog Pro',
        version: '3.0',
        exportedAt: new Date().toISOString(),
        count: entries.length,
        entries,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `devlog_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleCopyForSheets = (type: 'codebook' | 'logs') => {
    const tsvData = generateGoogleSheetsTSV(entries, type);
    navigator.clipboard.writeText(tsvData).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 3500);
    });
  };

  const handleSyncWebhook = async () => {
    if (!webhookUrl.trim()) {
      setSheetsSyncResult({
        success: false,
        message: 'Por favor ingresa la URL Web App de Apps Script para enviar.',
      });
      return;
    }
    try {
      setIsSyncingWebhook(true);
      setSheetsSyncResult(null);
      await syncViaAppsScriptWebhook(webhookUrl.trim(), spreadsheetId.trim(), entries);
      setSheetsSyncResult({
        success: true,
        message: `¡Datos enviados a Google Sheets exitosamente (${entries.length} registros y códigos)!`,
        url: SPREADSHEET_URL,
      });
    } catch (err: any) {
      setSheetsSyncResult({
        success: false,
        message: err.message || 'Error al sincronizar vía Webhook.',
      });
    } finally {
      setIsSyncingWebhook(false);
    }
  };

  const handleSyncGoogleSheets = async () => {
    const targetSheetId = spreadsheetId.trim();
    if (!targetSheetId) {
      setSheetsSyncResult({
        success: false,
        message: 'Por favor ingresa un ID de Google Spreadsheet válido.',
      });
      return;
    }

    try {
      setIsSyncingSheets(true);
      setSheetsSyncResult(null);

      // Path A: If Service Account is configured on backend
      if (saStatus.isConfigured) {
        const res = await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spreadsheetId: targetSheetId }),
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.message || 'Error al sincronizar con Cuenta de Servicio de Google');
        }

        const sheetUrl = `https://docs.google.com/spreadsheets/d/${targetSheetId}/edit#gid=0`;
        setSheetsSyncResult({
          success: true,
          message: `¡Sincronización con Cuenta de Servicio exitosa (${data.clientEmail})! Se actualizaron ${data.rowsCount} registros en la hoja '${data.sheetName}'.`,
          url: sheetUrl,
        });
        return;
      }

      // Path B: Fallback to client OAuth Token
      const token = await requestGoogleAccessToken();
      await syncWithGoogleSheets(token, targetSheetId, entries);

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${targetSheetId}/edit?gid=0#gid=0`;

      setSheetsSyncResult({
        success: true,
        message: `¡Sincronización exitosa! Se actualizaron las hojas 'Atlas_ti_Codebook' y 'Bitacora_Logs' con ${entries.length} registros.`,
        url: sheetUrl,
      });
    } catch (err: any) {
      console.error('Google Sheets Sync Error:', err);
      setSheetsSyncResult({
        success: false,
        message:
          err.message ||
          'Error al conectar con Google Sheets. Asegúrate de haber compartido la hoja con permisos de Editor a la Cuenta de Servicio o usa el botón de Copiar para Pegar (Ctrl+V).',
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        setIsImporting(true);
        setImportStatus(null);
        const parsed = JSON.parse(event.target?.result as string);
        const list = Array.isArray(parsed) ? parsed : parsed.entries;
        if (!Array.isArray(list)) {
          throw new Error('El archivo no contiene un formato de registros válido.');
        }

        await onImportJson(list);
        setImportStatus(`¡Éxito! Se importaron ${list.length} registros.`);
      } catch (err: any) {
        setImportStatus(`Error al importar: ${err.message}`);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#05060a]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-[#0a0c14] border border-[#1e293b] rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1e293b] bg-[#05060a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center shadow-[0_0_8px_#2563eb]">
              <Download size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                // DATA_EXPORT_&_SNAPSHOTS
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                GENERATION OF REPORTOUTS, BACKUPS & DATA RELOCATION
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#111827] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 font-sans">
          
          {/* Export Options Grid */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              📊 TARGET_FORMATS ({entries.length} LOGS IN SCOPE)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Excel */}
              <button
                onClick={() => exportToExcel(entries)}
                className="p-3.5 rounded bg-[#111827] hover:bg-[#151c2d] border border-[#1e293b] hover:border-emerald-500/50 text-left transition group space-y-2"
              >
                <div className="w-7 h-7 rounded bg-[#05060a] text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <FileSpreadsheet size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-white group-hover:text-emerald-400 transition">
                    MICROSOFT_EXCEL (.xlsx)
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5 font-sans">
                    Planilla estructurada con columnas de horas, tags y proyectos.
                  </p>
                </div>
              </button>

              {/* Atlas.ti Codebook */}
              <button
                onClick={() => exportCodebookForAtlasTi(entries)}
                className="p-3.5 rounded bg-[#111827] hover:bg-[#151c2d] border border-purple-900/40 hover:border-purple-500/60 text-left transition group space-y-2 shadow-[0_0_10px_rgba(168,85,247,0.1)]"
              >
                <div className="w-7 h-7 rounded bg-[#05060a] text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <BookOpen size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-purple-300 group-hover:text-purple-200 transition">
                    ATLAS.TI_CODEBOOK (.csv)
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5 font-sans">
                    Libro de Códigos estructurado (Code;Comment) compatible con Atlas.ti y Excel.
                  </p>
                </div>
              </button>

              {/* PDF */}
              <button
                onClick={() => exportToPdf(entries)}
                className="p-3.5 rounded bg-[#111827] hover:bg-[#151c2d] border border-[#1e293b] hover:border-rose-500/50 text-left transition group space-y-2"
              >
                <div className="w-7 h-7 rounded bg-[#05060a] text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <FileText size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-white group-hover:text-rose-400 transition">
                    PDF_REPORT (.pdf)
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5 font-sans">
                    Documento formal listo para imprimir o enviar a clientes.
                  </p>
                </div>
              </button>

              {/* Markdown */}
              <button
                onClick={() => exportToMarkdown(entries)}
                className="p-3.5 rounded bg-[#111827] hover:bg-[#151c2d] border border-[#1e293b] hover:border-blue-500/50 text-left transition group space-y-2"
              >
                <div className="w-7 h-7 rounded bg-[#05060a] text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <FileCode size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-white group-hover:text-blue-400 transition">
                    MARKDOWN (.md)
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5 font-sans">
                    Formato compatible con repositorios GitHub, Obsidian o Notion.
                  </p>
                </div>
              </button>

            </div>
          </div>

          {/* Google Sheets Direct Cloud Sync */}
          <div className="p-4 rounded bg-[#0b1329] border border-emerald-500/40 space-y-3.5 shadow-[0_0_15px_rgba(16,185,129,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                <Cloud size={15} className="text-emerald-400" />
                <span>GOOGLE_SHEETS_SYNC (LIBRO DE CÓDIGOS & REGISTROS)</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {saStatus.isConfigured ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/60 text-[9px] font-mono text-emerald-300">
                    <ShieldCheck size={11} className="text-emerald-400" />
                    <span>SERVICE_ACCOUNT: {saStatus.clientEmail ? saStatus.clientEmail.slice(0, 22) + '...' : 'ACTIVA'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] font-mono text-slate-400">
                    <span>CUENTA_SERVICIO: PENDIENTE</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-[9px] font-mono text-emerald-300">
                  <ShieldCheck size={11} />
                  <span>ID: {spreadsheetId.slice(0, 8)}...</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              Hoja de destino vinculada: <a href={SPREADSHEET_URL} target="_blank" rel="noreferrer" className="text-emerald-400 underline font-mono inline-flex items-center gap-0.5 font-bold">Abrir Spreadsheet ({DEFAULT_SPREADSHEET_ID.slice(0, 12)}...) <ExternalLink size={10} /></a>. {saStatus.isConfigured ? (
                <span className="text-emerald-300"> Autenticación configurada vía Service Account <span className="font-mono text-slate-200">{saStatus.clientEmail}</span>.</span>
              ) : (
                <span className="text-slate-400"> Puedes configurar <span className="font-mono text-slate-200">GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON</span> en Ajustes &gt; Secrets para sincronización directa sin ventanas emergentes.</span>
              )}
            </p>

            {/* Quick 1-Click Copy to Paste directly in Google Sheets */}
            <div className="p-3 bg-[#05060a] border border-[#1e293b] rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">
                  📋 OPCIÓN RÁPIDA: COPIAR TABLA PARA PEGAR EN GOOGLE SHEETS (CTRL+V)
                </span>
                {copiedType && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700 animate-pulse">
                    ✓ ¡Copiado al portapapeles!
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyForSheets('codebook')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/60 text-purple-200 text-xs font-mono font-bold transition cursor-pointer"
                  title="Copia el Libro de Códigos para pegar en la celda A1 de Google Sheets"
                >
                  <Copy size={13} />
                  <span>COPIAR LIBRO DE CÓDIGOS</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyForSheets('logs')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-blue-950/60 hover:bg-blue-900/80 border border-blue-700/60 text-blue-200 text-xs font-mono font-bold transition cursor-pointer"
                  title="Copia todos los registros técnicos para pegar en la celda A1 de Google Sheets"
                >
                  <Copy size={13} />
                  <span>COPIAR TODOS LOS LOGS</span>
                </button>
              </div>
              <p className="text-[9px] text-slate-500 font-mono">
                💡 Pega directamente con Ctrl+V en la celda A1 de tu Google Sheet sin necesidad de inicio de sesión o permisos cruzados.
              </p>
            </div>

            {/* Direct API Sync */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 flex items-center bg-[#05060a] border border-[#1e293b] rounded px-3 py-1.5 text-xs font-mono text-slate-200">
                  <span className="text-slate-500 mr-2 select-none">SPREADSHEET_ID:</span>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={e => setSpreadsheetId(e.target.value)}
                    className="flex-1 bg-transparent border-none text-emerald-400 focus:outline-none font-mono text-xs"
                    placeholder="116OlNYVOFJAz3GFNa1yq1TGRQ_qMPo5oiX_RhPQCbDI"
                  />
                </div>

                <button
                  onClick={handleSyncGoogleSheets}
                  disabled={isSyncingSheets}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold transition cursor-pointer ${
                    isSyncingSheets
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95'
                  }`}
                >
                  {isSyncingSheets ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-emerald-300" />
                      <span>SINCRONIZANDO...</span>
                    </>
                  ) : (
                    <>
                      <Cloud size={13} />
                      <span>SINCRONIZAR_API_GOOGLE</span>
                    </>
                  )}
                </button>
              </div>

              {/* Apps Script Webhook Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAppsScriptGuide(!showAppsScriptGuide)}
                  className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-emerald-300 transition cursor-pointer"
                >
                  <Code2 size={12} />
                  <span>Configurar Sincronización Automática con Apps Script (Sin restricciones de cuenta)</span>
                  {showAppsScriptGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showAppsScriptGuide && (
                  <div className="mt-2 p-3 bg-[#05060a] border border-slate-800 rounded space-y-2.5 text-xs font-mono text-slate-300">
                    <p className="text-[10px] text-slate-400 font-sans">
                      Pega este código en tu Google Sheet (<strong>Extensiones → Apps Script</strong>) y publícalo como Aplicación Web ("Cualquiera"):
                    </p>
                    <pre className="p-2 bg-[#020307] border border-slate-800 rounded text-[10px] text-emerald-300 overflow-x-auto select-all">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  function writeTab(name, values) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.clear();
    sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  }
  if (data.codebook) writeTab('Atlas_ti_Codebook', data.codebook);
  if (data.logs) writeTab('Bitacora_Logs', data.logs);
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
}`}
                    </pre>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={e => setWebhookUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 bg-[#111827] border border-slate-700 text-xs text-emerald-300 px-2 py-1 rounded focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSyncWebhook}
                        disabled={isSyncingWebhook}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-mono font-bold transition"
                      >
                        {isSyncingWebhook ? 'ENVIANDO...' : 'ENVIAR_WEBHOOK'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {sheetsSyncResult && (
              <div
                className={`p-3 rounded text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                  sheetsSyncResult.success
                    ? 'bg-emerald-950/70 border border-emerald-600 text-emerald-200'
                    : 'bg-rose-950/70 border border-rose-700 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {sheetsSyncResult.success ? (
                    <Check size={15} className="text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle size={15} className="text-rose-400 shrink-0" />
                  )}
                  <span className="text-[11px]">{sheetsSyncResult.message}</span>
                </div>

                {sheetsSyncResult.url && (
                  <a
                    href={sheetsSyncResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white font-mono text-[10px] flex items-center gap-1 shrink-0 transition"
                  >
                    <span>VER_HOJA</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Backup & Restore JSON */}
          <div className="p-4 rounded bg-[#111827] border border-[#1e293b] space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
              <Database size={14} className="text-blue-400" />
              <span>RAW_JSON_SNAPSHOT_&_RESTORE</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              
              <button
                onClick={handleExportJson}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-[#05060a] hover:bg-[#1e293b] text-slate-200 text-xs font-mono border border-[#1e293b] transition"
              >
                <Download size={13} className="text-blue-400" />
                <span>DOWNLOAD_JSON_BACKUP</span>
              </button>

              <div className="hidden sm:block text-slate-600 font-mono text-xs">/</div>

              <div className="w-full sm:w-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-[#05060a] hover:bg-[#1e293b] text-slate-200 text-xs font-mono border border-[#1e293b] transition"
                >
                  <Upload size={13} className="text-emerald-400" />
                  <span>{isImporting ? 'RESTORING...' : 'RESTORE_FROM_JSON'}</span>
                </button>
              </div>

            </div>

            {importStatus && (
              <div
                className={`p-2.5 rounded text-xs font-mono flex items-center gap-2 ${
                  importStatus.startsWith('Error')
                    ? 'bg-rose-950/60 border border-rose-800 text-rose-300'
                    : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                }`}
              >
                {importStatus.startsWith('Error') ? <AlertCircle size={13} /> : <Check size={13} />}
                <span>{importStatus}</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-[#1e293b] bg-[#05060a]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 text-xs font-mono transition"
          >
            DISMISS
          </button>
        </div>

      </div>
    </div>
  );
};
