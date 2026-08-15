import React, { useState, useEffect } from 'react';
import {
  X,
  Bug,
  Sparkles,
  Code,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import { AISolveErrorResponse } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AISolveErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialErrorText?: string;
  initialContext?: string;
  onSolveBug: (errorText: string, context?: string, language?: string) => Promise<AISolveErrorResponse>;
}

export const AISolveErrorModal: React.FC<AISolveErrorModalProps> = ({
  isOpen,
  onClose,
  initialErrorText = '',
  initialContext = '',
  onSolveBug,
}) => {
  const [errorText, setErrorText] = useState('');
  const [context, setContext] = useState('');
  const [language, setLanguage] = useState('Python / TypeScript');
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<AISolveErrorResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialErrorText) {
      setErrorText(initialErrorText);
    }
    if (initialContext) {
      setContext(initialContext);
    }
  }, [initialErrorText, initialContext, isOpen]);

  if (!isOpen) return null;

  const handleSolve = async () => {
    if (!errorText.trim()) {
      setErrorMsg('Por favor ingresa el error, stacktrace o problema técnico.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await onSolveBug(errorText.trim(), context.trim(), language);
      setSolution(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el asistente de IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!solution?.solutionCode) return;
    navigator.clipboard.writeText(solution.solutionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const sampleErrors = [
    { label: 'FastAPI CORS', error: 'Access to XMLHttpRequest from origin blocked by CORS policy: No Access-Control-Allow-Origin header present', lang: 'Python' },
    { label: 'React Re-render', error: 'Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside useEffect', lang: 'TypeScript' },
    { label: 'Postgres Deadlock', error: 'psycopg2.errors.DeadlockDetected: deadlock detected during concurrent transaction update', lang: 'SQL / Python' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#05060a]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-[#0a0c14] border border-[#1e293b] rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1e293b] bg-[#05060a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-rose-600 text-white flex items-center justify-center shadow-[0_0_8px_#e11d48]">
              <Bug size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <span>// RUNTIME_DEBUG_RESOLVER</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 shadow-[0_0_8px_rgba(225,29,72,0.3)]">
                  KIMI_K3 // DIAGNOSTIC_AI
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                STACK TRACE & BUG TRIAGE ENGINE WITH DETERMINISTIC CODE PATCHES
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

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans">
          
          {/* Top Quick Error Samples */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">QUICK_PRESETS:</span>
            {sampleErrors.map(sample => (
              <button
                key={sample.label}
                onClick={() => {
                  setErrorText(sample.error);
                  setLanguage(sample.lang);
                }}
                className="px-2 py-0.5 rounded bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 text-[10px] transition"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {/* Form Inputs */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-1">
                  🐞 STACK_TRACE // ERROR_STRING
                </label>
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                  💻 TECH_STACK
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  placeholder="Ej: Python, TypeScript, Docker, SQL"
                  className="w-full bg-[#111827] border border-[#1e293b] focus:border-rose-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <textarea
              value={errorText}
              onChange={e => setErrorText(e.target.value)}
              rows={4}
              placeholder="Pega aquí el mensaje de error de consola, stack trace o descripción del comportamiento inesperado..."
              className="w-full bg-[#111827] border border-[#1e293b] focus:border-rose-500 rounded p-3 text-xs text-rose-200 font-mono focus:outline-none"
            />

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                🔍 SURROUNDING_CONTEXT / REPRODUCTION STEPS
              </label>
              <input
                type="text"
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Ej: Ocurre al llamar el endpoint /login después de hacer deploy a staging"
                className="w-full bg-[#111827] border border-[#1e293b] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSolve}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono shadow-[0_0_10px_rgba(225,29,72,0.4)] transition active:scale-95 disabled:opacity-50 uppercase tracking-wider"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>DIAGNOSING_BUG...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>RUN_ROOT_CAUSE_ANALYSIS</span>
                </>
              )}
            </button>
          </div>

          {/* Results View */}
          {solution && (
            <div className="space-y-3 pt-3 border-t border-[#1e293b]">
              
              {/* Diagnosis */}
              <div className="p-3.5 rounded bg-[#111827] border border-rose-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                  <Terminal size={13} />
                  <span>ROOT_CAUSE_DIAGNOSIS</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {solution.diagnosis}
                </p>
              </div>

              {/* Solution Code */}
              {solution.solutionCode && (
                <div className="p-3.5 rounded bg-[#111827] border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                      <Code size={13} />
                      <span>PROPOSED_CODE_PATCH</span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#05060a] text-emerald-300 border border-emerald-500/40 hover:bg-[#111827] transition"
                    >
                      {copiedCode ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedCode ? 'COPIED' : 'COPY_PATCH'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded bg-[#05060a] border border-[#1e293b] overflow-x-auto text-blue-300 text-xs font-mono leading-relaxed">
                    <code>{solution.solutionCode}</code>
                  </pre>
                </div>
              )}

              {/* Explanation & Best Practices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-[#111827] border border-[#1e293b] space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
                    💡 TECHNICAL_EXPLANATION
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {solution.explanation}
                  </p>
                </div>

                <div className="p-3 rounded bg-[#111827] border border-[#1e293b] space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                    🛡️ PREVENTATIVE_BEST_PRACTICES
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {solution.bestPractices?.map((bp, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          )}

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
