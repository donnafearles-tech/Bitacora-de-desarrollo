import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle,
  Lightbulb,
  ArrowRightCircle,
  Tag,
  Sparkles,
  Maximize2,
  X,
  Share2,
  Check,
  Flame,
  Zap,
  BookOpen,
  Wrench,
} from 'lucide-react';
import { LogEntry } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface EntryCardProps {
  entry: LogEntry;
  onEdit: (entry: LogEntry) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
  onSolveBugWithAI: (errorText: string, context?: string) => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  onEdit,
  onDelete,
  onTagClick,
  onSolveBugWithAI,
}) => {
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = () => {
    const md = `## [${entry.date}] ${entry.summary}\n**Proyecto:** ${entry.project || 'General'} | **Horas:** ${entry.timeSpentHours}h\n**Tags:** ${entry.tags.map(t => `#${t}`).join(' ')}\n\n### Actividades\n${entry.activities}\n\n${entry.obstacles ? `### Obstáculos\n${entry.obstacles}\n\n` : ''}${entry.solutions ? `### Solución\n${entry.solutions}\n\n` : ''}${entry.plan ? `### Plan\n${entry.plan}\n` : ''}`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBorderAccent = (mood?: string) => {
    switch (mood) {
      case 'flow':
        return 'border-l-amber-500';
      case 'blocked':
        return 'border-l-rose-500';
      case 'learning':
        return 'border-l-emerald-500';
      case 'refactor':
        return 'border-l-purple-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const getMoodBadge = (mood?: string) => {
    switch (mood) {
      case 'flow':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#111827] text-amber-300 border border-amber-500/40">
            <Flame size={11} className="text-amber-400" /> FLOW
          </span>
        );
      case 'blocked':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#111827] text-rose-300 border border-rose-500/40">
            <AlertTriangle size={11} className="text-rose-400" /> BLOCKED
          </span>
        );
      case 'learning':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#111827] text-emerald-300 border border-emerald-500/40">
            <BookOpen size={11} className="text-emerald-400" /> SPIKE_DOC
          </span>
        );
      case 'refactor':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#111827] text-purple-300 border border-purple-500/40">
            <Wrench size={11} className="text-purple-400" /> REFACTOR
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#111827] text-blue-300 border border-blue-500/40">
            <Zap size={11} className="text-blue-400" /> PRODUCTIVE
          </span>
        );
    }
  };

  return (
    <article className={`group relative bg-[#0a0c14] border border-[#1e293b] hover:border-slate-700 rounded-lg p-4 shadow-xl border-l-4 ${getBorderAccent(entry.mood)} transition-all duration-200`}>
      
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1e293b]">
        
        {/* Date, Project & Mood */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#111827] border border-[#1e293b] text-[10px] font-mono font-bold text-blue-400">
            <Calendar size={11} />
            <span>{entry.date}</span>
          </div>

          {entry.project && (
            <span className="px-2 py-0.5 rounded bg-[#111827] text-slate-300 text-[10px] font-mono border border-[#1e293b]">
              📁 {entry.project}
            </span>
          )}

          {getMoodBadge(entry.mood)}

          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <Clock size={11} />
            <span>{entry.timeSpentHours || 0}h</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <button
            onClick={handleCopyMarkdown}
            className="text-slate-500 hover:text-blue-400 transition cursor-pointer"
            title="Copiar registro como Markdown"
          >
            {copied ? <span className="text-emerald-400 font-bold">[COPIED]</span> : '[COPY]'}
          </button>

          <button
            onClick={() => onEdit(entry)}
            className="text-slate-500 hover:text-white transition cursor-pointer"
            title="Editar este registro"
          >
            [EDIT]
          </button>

          <button
            onClick={() => {
              if (window.confirm(`¿Seguro que deseas eliminar el registro del ${entry.date}?`)) {
                onDelete(entry.id);
              }
            }}
            className="text-rose-700 hover:text-rose-400 transition cursor-pointer"
            title="Eliminar este registro"
          >
            [DROP]
          </button>
        </div>

      </div>

      {/* Summary Title */}
      <div className="mt-3 mb-2">
        <h3 className="text-sm font-bold text-slate-100 tracking-tight leading-snug">
          {entry.summary}
        </h3>
      </div>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {entry.tags.map(t => {
            const isComposite = t.includes(':');
            return (
              <button
                key={t}
                onClick={() => onTagClick(t)}
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition cursor-pointer ${
                  isComposite
                    ? 'bg-purple-950/60 border border-purple-800/60 hover:border-purple-500 text-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.15)] font-semibold'
                    : 'bg-[#05060a] border border-[#1e293b] hover:border-blue-500/60 text-slate-400'
                }`}
                title={isComposite ? 'Código compuesto Atlas.ti (filtrar)' : 'Tag de bitácora (filtrar)'}
              >
                {isComposite ? '🏷️ ' : '#'}
                {t}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Activities with Markdown Render */}
      <div className="bg-[#111827]/80 border border-[#1e293b] rounded-lg p-3.5 mb-3">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400/90 mb-2 flex items-center justify-between">
          <span>// ACTIVITY_LOG & CODE</span>
        </div>
        <MarkdownRenderer content={entry.activities} />
      </div>

      {/* Obstacles & Solutions Split */}
      {(entry.obstacles || entry.solutions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          
          {/* Obstacle Box */}
          {entry.obstacles && (
            <div className="rounded-lg p-3 bg-[#111827] border border-amber-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  <span>BLOCKER_TRACE</span>
                </span>
                <button
                  onClick={() =>
                    onSolveBugWithAI(
                      entry.obstacles,
                      `Fecha: ${entry.date}, Proyecto: ${entry.project}, Resumen: ${entry.summary}`
                    )
                  }
                  className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 transition"
                  title="Pedir a la IA que diagnostique y resuelva este problema"
                >
                  <Sparkles size={10} className="text-amber-300" />
                  <span>RESOLVE_AI</span>
                </button>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                {entry.obstacles}
              </p>
            </div>
          )}

          {/* Solution Box */}
          {entry.solutions && (
            <div className="rounded-lg p-3 bg-[#111827] border border-emerald-900/40 space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Lightbulb size={11} />
                <span>APPLIED_SOLUTION</span>
              </span>
              <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
                {entry.solutions}
              </p>
            </div>
          )}

        </div>
      )}

      {/* Plan / Next Steps */}
      {entry.plan && (
        <div className="flex items-start gap-2 text-xs text-slate-300 bg-[#05060a] border border-[#1e293b] rounded px-3 py-2 mb-3">
          <ArrowRightCircle size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <strong className="text-blue-400 font-mono text-[10px] uppercase">NEXT_PLAN: </strong>
            <span>{entry.plan}</span>
          </div>
        </div>
      )}

      {/* Screenshot / Attached Image */}
      {entry.image && (
        <div className="mt-2 p-2.5 bg-[#05060a] rounded border border-[#1e293b]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-green-500 uppercase tracking-wider">
              CAPTURE_ATTACHED:
            </span>
            <button
              onClick={() => setShowImageLightbox(true)}
              className="flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300"
            >
              <Maximize2 size={11} />
              <span>EXPAND</span>
            </button>
          </div>
          <div
            onClick={() => setShowImageLightbox(true)}
            className="cursor-pointer overflow-hidden rounded border border-dashed border-[#1e293b] bg-[#0a0c14] max-h-56 flex items-center justify-center hover:border-blue-500/50 transition group/img p-1"
          >
            <img
              src={entry.image}
              alt={`Captura ${entry.date}`}
              className="max-h-52 object-contain w-full transition group-hover/img:scale-101"
            />
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {showImageLightbox && entry.image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05060a]/90 backdrop-blur-md"
          onClick={() => setShowImageLightbox(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-[#0a0c14] p-3 rounded-lg border border-[#1e293b] shadow-2xl">
            <button
              onClick={() => setShowImageLightbox(false)}
              className="absolute top-4 right-4 p-1.5 rounded bg-[#111827] text-white hover:bg-slate-800 border border-[#1e293b]"
            >
              <X size={18} />
            </button>
            <img
              src={entry.image}
              alt="Captura ampliada"
              className="max-h-[85vh] object-contain rounded mx-auto"
            />
          </div>
        </div>
      )}

    </article>
  );
};
