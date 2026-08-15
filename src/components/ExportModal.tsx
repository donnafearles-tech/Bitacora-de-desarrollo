import React, { useRef, useState } from 'react';
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
} from 'lucide-react';
import { LogEntry } from '../types';
import { exportToExcel, exportToPdf, exportToMarkdown } from '../lib/exportUtils';

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
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
