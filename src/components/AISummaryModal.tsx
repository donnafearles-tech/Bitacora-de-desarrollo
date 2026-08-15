import React, { useState } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';
import { AISummaryResponse } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { exportToPdf } from '../lib/exportUtils';
import { LogEntry } from '../types';

interface AISummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateSummary: (period: 'week' | 'month' | 'custom', provider?: string) => Promise<AISummaryResponse>;
  currentEntries: LogEntry[];
}

export const AISummaryModal: React.FC<AISummaryModalProps> = ({
  isOpen,
  onClose,
  onGenerateSummary,
  currentEntries,
}) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<AISummaryResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await onGenerateSummary(period === 'all' ? 'custom' : period);
      setSummaryData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar el resumen con IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summaryData) return;
    const text = `# 🧠 Informe Ejecutivo de Ingeniería (DevLog Pro)\n\n` +
      `**Estado:** ${summaryData.statsHeadline || 'Desarrollo Activo'}\n\n` +
      `## 🚀 Tracción & Victorias Clave\n${summaryData.traction.map(t => `- ${t}`).join('\n')}\n\n` +
      `## ⚠️ Patrones de Bloqueos & Errores\n${summaryData.blockers.map(b => `- ${b}`).join('\n')}\n\n` +
      `## 💡 Recomendaciones de Mentoría Técnica\n${summaryData.recommendations.map(r => `- ${r}`).join('\n')}\n\n` +
      `## 📝 Resumen Detallado\n${summaryData.summary}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#05060a]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-[#0a0c14] border border-[#1e293b] rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1e293b] bg-[#05060a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center shadow-[0_0_8px_#2563eb]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <span>// AI_SYNTHESIS_&_MENTORSHIP</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                  KIMI_K3 // AI_ENGINE
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                ENGINEERING VELOCITY, BLOCKER PATTERNS & ARCHITECTURAL DIRECTIVES
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
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans">
          
          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded bg-[#111827] border border-[#1e293b]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">WINDOW:</span>
              <div className="flex items-center gap-1 bg-[#05060a] p-0.5 rounded border border-[#1e293b] text-xs font-mono">
                <button
                  onClick={() => setPeriod('week')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                    period === 'week'
                      ? 'bg-blue-600 text-white font-bold shadow-[0_0_6px_#2563eb]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  LAST_7_DAYS
                </button>
                <button
                  onClick={() => setPeriod('month')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                    period === 'month'
                      ? 'bg-blue-600 text-white font-bold shadow-[0_0_6px_#2563eb]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  LAST_30_DAYS
                </button>
                <button
                  onClick={() => setPeriod('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                    period === 'all'
                      ? 'bg-blue-600 text-white font-bold shadow-[0_0_6px_#2563eb]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ALL_HISTORY
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono shadow-[0_0_10px_rgba(37,99,235,0.4)] transition active:scale-95 disabled:opacity-50 uppercase tracking-wider"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>ANALYZING_LOGS...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>{summaryData ? 'RE_EVALUATE' : 'RUN_AI_SYNTHESIS'}</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-3 animate-pulse p-4 rounded bg-[#111827] border border-[#1e293b]">
              <div className="h-5 bg-[#1e293b] rounded w-2/3" />
              <div className="h-16 bg-[#1e293b] rounded" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 bg-[#1e293b] rounded" />
                <div className="h-20 bg-[#1e293b] rounded" />
              </div>
            </div>
          )}

          {/* Initial Prompt State */}
          {!isLoading && !summaryData && (
            <div className="text-center py-8 px-4 rounded bg-[#111827] border border-[#1e293b] space-y-3">
              <div className="w-10 h-10 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                <Sparkles size={20} />
              </div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                // SYSTEM_READY_FOR_RETROSPECTIVE
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Nuestra IA actuará como tu <strong>Tech Lead Mentor</strong>, examinando tus actividades,
                resolución de bugs y horas para extraer victorias, patrones y recomendaciones de arquitectura.
              </p>
              <button
                onClick={handleGenerate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono shadow-[0_0_10px_rgba(37,99,235,0.4)] transition active:scale-95 uppercase tracking-wider"
              >
                <Sparkles size={14} />
                <span>GENERATE_REPORT</span>
              </button>
            </div>
          )}

          {/* Result View */}
          {!isLoading && summaryData && (
            <div className="space-y-4">
              
              {/* Headline Banner */}
              {summaryData.statsHeadline && (
                <div className="p-3 rounded bg-[#05060a] border border-blue-500/40 text-blue-300 text-xs font-mono font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                  <Sparkles size={15} className="text-blue-400 flex-shrink-0" />
                  <span>{summaryData.statsHeadline}</span>
                </div>
              )}

              {/* 3 Pillars Grid: Traction, Blockers, Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* 1. Tracción */}
                <div className="p-3.5 rounded bg-[#111827] border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 size={13} />
                    <span>KEY_TRACTION_&_WINS</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {summaryData.traction.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-snug">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Bloqueos */}
                <div className="p-3.5 rounded bg-[#111827] border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                    <AlertTriangle size={13} />
                    <span>BLOCKER_PATTERNS</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {summaryData.blockers.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-snug">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Mentoría */}
                <div className="p-3.5 rounded bg-[#111827] border border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
                    <Lightbulb size={13} />
                    <span>TECH_DIRECTIVES</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {summaryData.recommendations.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-snug">
                        <span className="text-blue-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Full Detailed Summary */}
              <div className="p-4 rounded bg-[#111827] border border-[#1e293b] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    📝 // DEEP_ANALYSIS_SYNTHESIS
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    TIMESTAMP: {new Date(summaryData.generatedAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed font-sans">
                  <MarkdownRenderer content={summaryData.summary} />
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#1e293b] bg-[#05060a]">
          <div className="flex items-center gap-2">
            {summaryData && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs font-mono transition"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'COPIED_TO_CLIPBOARD' : 'COPY_REPORT'}</span>
                </button>

                <button
                  onClick={() => exportToPdf(currentEntries, 'devlog_informe_semanal.pdf')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs font-mono transition"
                >
                  <Download size={13} />
                  <span>EXPORT_PDF</span>
                </button>
              </>
            )}
          </div>

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
