import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Save,
  Code,
  List,
  CheckSquare,
  Bold,
  Italic,
  Quote,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Flame,
  Zap,
  AlertTriangle,
  BookOpen,
  Wrench,
  Eye,
  Edit3,
  RefreshCw,
  Check,
  Wand2,
  Tag,
  ChevronDown,
  ChevronUp,
  Search,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Plus,
} from 'lucide-react';
import { LogEntry } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getTodayLocalDateString, getLocalTimeZoneName, formatDisplayDate } from '../utils/date';
import { TAG_CATEGORIES, getSmartRelatedTags } from '../utils/tagData';

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<LogEntry> & { date: string; summary: string }) => Promise<void>;
  initialEntry?: LogEntry | null;
  existingProjects: string[];
  availableTags?: { tag: string; count: number }[];
  onOpenBugSolverWithText?: (text: string) => void;
}

export const EntryFormModal: React.FC<EntryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEntry,
  existingProjects,
  availableTags = [],
  onOpenBugSolverWithText,
}) => {
  const [date, setDate] = useState(getTodayLocalDateString());
  const [summary, setSummary] = useState('');
  const [project, setProject] = useState('');
  const [activities, setActivities] = useState('');
  const [obstacles, setObstacles] = useState('');
  const [solutions, setSolutions] = useState('');
  const [plan, setPlan] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [timeSpentHours, setTimeSpentHours] = useState<number>(4);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(4 * 3600);
  const [mood, setMood] = useState<'flow' | 'productive' | 'blocked' | 'learning' | 'refactor'>('productive');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tags Dropdown & Explorer state
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // Kimi AI Headline Generation State
  const [isGeneratingHeadline, setIsGeneratingHeadline] = useState(false);
  const [headlineSuccess, setHeadlineSuccess] = useState(false);

  const activitiesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userTimezone = getLocalTimeZoneName();

  useEffect(() => {
    if (initialEntry) {
      setDate(initialEntry.date);
      setSummary(initialEntry.summary);
      setProject(initialEntry.project || '');
      setActivities(initialEntry.activities || '');
      setObstacles(initialEntry.obstacles || '');
      setSolutions(initialEntry.solutions || '');
      setPlan(initialEntry.plan || '');
      setTags(initialEntry.tags || []);
      const hrs = initialEntry.timeSpentHours || 4;
      setTimeSpentHours(hrs);
      setTimerSeconds(Math.round(hrs * 3600));
      setIsTimerRunning(false);
      setMood(initialEntry.mood || 'productive');
      setImage(initialEntry.image);
    } else {
      // Reset to defaults with local browser date
      setDate(getTodayLocalDateString());
      setSummary('');
      setProject(existingProjects[0] || 'General');
      setActivities('### Tareas Realizadas\n- \n\n```python\n# Fragmento de código clave\n```');
      setObstacles('');
      setSolutions('');
      setPlan('');
      setTags(['dev']);
      setTimeSpentHours(4);
      setTimerSeconds(4 * 3600);
      setIsTimerRunning(false);
      setMood('productive');
      setImage(undefined);
    }
    setActiveTab('edit');
    setIsTagDropdownOpen(false);
    setTagSearchQuery('');
    setErrorMsg(null);
  }, [initialEntry, isOpen, existingProjects]);

  // Live Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          const next = prev + 1;
          const computedHours = Math.max(0.1, Math.round((next / 3600) * 10) / 10);
          setTimeSpentHours(computedHours);
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const handleSliderChange = (newHours: number) => {
    setTimeSpentHours(newHours);
    setTimerSeconds(Math.round(newHours * 3600));
  };

  const handleAddTimerSeconds = (additionalSecs: number) => {
    setTimerSeconds(prev => {
      const next = Math.max(0, prev + additionalSecs);
      const computedHours = Math.max(0.1, Math.round((next / 3600) * 10) / 10);
      setTimeSpentHours(computedHours);
      return next;
    });
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setTimeSpentHours(0.5);
  };

  const formatTimerDisplay = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Compute smart dynamically related tags based on current selection
  const smartRelatedTags = useMemo(() => {
    return getSmartRelatedTags(tags, availableTags);
  }, [tags, availableTags]);

  if (!isOpen) return null;

  // Tag handling
  const handleAddTag = (rawTag: string) => {
    const cleaned = rawTag.trim().toLowerCase().replace(/^#/, '');
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const handleToggleTag = (rawTag: string) => {
    const cleaned = rawTag.trim().toLowerCase().replace(/^#/, '');
    if (!cleaned) return;
    if (tags.includes(cleaned)) {
      setTags(tags.filter(t => t !== cleaned));
    } else {
      setTags([...tags, cleaned]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  // Markdown Toolbar helper
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = activitiesTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previous = textarea.value;
    const selection = previous.substring(start, end) || 'código';

    const replacement = `${before}${selection}${after}`;
    const newValue = previous.substring(0, start) + replacement + previous.substring(end);

    setActivities(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selection.length);
    }, 10);
  };

  // Image Upload & Paste
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            setImage(reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  // AI Generate Headline from Activities & Code (Kimi K3)
  const handleGenerateHeadline = async () => {
    const rawContent = activities.trim();
    if (!rawContent || rawContent.length < 5) {
      setErrorMsg('Escribe primero tus actividades o fragmentos de código en el editor inferior para que Kimi pueda sintetizar el encabezado.');
      return;
    }

    try {
      setIsGeneratingHeadline(true);
      setErrorMsg(null);
      const res = await fetch('/api/ai/generate-headline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: rawContent,
          project: project || 'General',
          obstacles: obstacles || undefined,
          solutions: solutions || undefined,
          tags: tags || [],
          mood: mood || 'productive',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo generar el encabezado.');
      }

      const data = await res.json();
      if (data.headline) {
        setSummary(data.headline);
        setHeadlineSuccess(true);
        setTimeout(() => setHeadlineSuccess(false), 2500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con la IA para generar el encabezado.');
    } finally {
      setIsGeneratingHeadline(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setErrorMsg('La fecha es obligatoria.');
      return;
    }
    if (!summary.trim()) {
      setErrorMsg('El título / resumen es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await onSave({
        id: initialEntry?.id,
        date,
        summary: summary.trim(),
        project: project.trim() || 'General',
        activities,
        obstacles,
        solutions,
        plan,
        tags,
        timeSpentHours: Number(timeSpentHours) || 1,
        mood,
        image,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const popularTags = ['python', 'react', 'fastapi', 'typescript', 'docker', 'sql', 'bug', 'refactor', 'api', 'auth'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#05060a]/85 backdrop-blur-md overflow-y-auto"
      onPaste={handlePaste}
    >
      <div className="relative w-full max-w-3xl my-8 bg-[#0a0c14] border border-[#1e293b] rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1e293b] bg-[#05060a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center shadow-[0_0_8px_#2563eb]">
              <Edit3 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                {initialEntry ? '// UPDATE_ENTRY_BUFFER' : '// NEW_ENTRY_BUFFER'}
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                {date ? `TIMESTAMP: ${date}` : 'ENGINEERING LOG BUFFER'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 font-sans">
          {errorMsg && (
            <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Row 1: Date & Project & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  📅 DATE_STAMP
                </label>
                <span className="text-[9px] font-mono text-blue-400" title={`Zona horaria local detectada: ${userTimezone}`}>
                  {userTimezone.replace(/_/g, ' ')}
                </span>
              </div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-[#111827] border border-[#1e293b] focus:border-blue-500 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                {formatDisplayDate(date)}
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                📁 PROJECT_TAG
              </label>
              <input
                type="text"
                list="project-list"
                value={project}
                onChange={e => setProject(e.target.value)}
                placeholder="Ej: Core Backend, App Móvil"
                className="w-full bg-[#111827] border border-[#1e293b] focus:border-blue-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
              />
              <datalist id="project-list">
                {existingProjects.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Timer size={12} className={isTimerRunning ? 'text-emerald-400 animate-spin' : 'text-blue-400'} />
                  <span>TIME_SPENT:</span>
                  <span className="text-blue-400 font-bold">{timeSpentHours}h</span>
                </label>

                {/* Live Digital Clock Badge */}
                <div className="flex items-center gap-1">
                  {isTimerRunning && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                  <span
                    className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border transition ${
                      isTimerRunning
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-900 text-cyan-300 border-slate-700'
                    }`}
                    title="Tiempo acumulado (HH:MM:SS)"
                  >
                    {formatTimerDisplay(timerSeconds)}
                  </span>
                </div>
              </div>

              {/* Live Timer Controls (Play/Pause, Quick Adds, Reset) */}
              <div className="flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                    isTimerRunning
                      ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  }`}
                  title={isTimerRunning ? 'Pausar conteo en vivo' : 'Iniciar cronómetro en vivo'}
                >
                  {isTimerRunning ? <Pause size={11} /> : <Play size={11} />}
                  <span>{isTimerRunning ? 'PAUSAR' : 'INICIAR_CRONO'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddTimerSeconds(15 * 60)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#111827] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-[#1e293b] transition cursor-pointer"
                    title="Agregar 15 minutos"
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTimerSeconds(30 * 60)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#111827] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-[#1e293b] transition cursor-pointer"
                    title="Agregar 30 minutos"
                  >
                    +30m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTimerSeconds(60 * 60)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#111827] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-[#1e293b] transition cursor-pointer"
                    title="Agregar 1 hora"
                  >
                    +1h
                  </button>
                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-[#111827] border border-transparent hover:border-[#1e293b] transition cursor-pointer"
                    title="Reiniciar cronómetro"
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>
              </div>

              {/* Dynamic Real-Time Progress Bar (based on standard 8h day) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                  <span>PROGRESO_JORNADA</span>
                  <span className={isTimerRunning ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {Math.min(100, Math.round((timerSeconds / (8 * 3600)) * 100))}% (8h meta)
                  </span>
                </div>
                <div className="h-2 w-full bg-[#111827] rounded-full overflow-hidden border border-[#1e293b] relative">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isTimerRunning
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, (timerSeconds / (8 * 3600)) * 100))}%` }}
                  ></div>
                </div>
              </div>

              {/* Range slider for manual adjustment */}
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="range"
                  min="0.5"
                  max="14"
                  step="0.5"
                  value={timeSpentHours}
                  onChange={e => handleSliderChange(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-500 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-400 min-w-[32px] text-right">
                  {timeSpentHours}h
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Short Summary Headline */}
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                📌 SUMMARY_HEADLINE // ENCABEZADO
              </label>

              {/* AI Auto-generate button */}
              <button
                type="button"
                onClick={handleGenerateHeadline}
                disabled={isGeneratingHeadline}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  headlineSuccess
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : isGeneratingHeadline
                    ? 'bg-blue-950 text-blue-300 border border-blue-800 animate-pulse cursor-wait'
                    : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/50 hover:border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.25)] active:scale-95'
                }`}
                title="Kimi K3 analiza el texto y código Markdown de las actividades para formular un encabezado técnico conciso"
              >
                {isGeneratingHeadline ? (
                  <>
                    <RefreshCw size={11} className="animate-spin text-blue-400" />
                    <span>SINTETIZANDO_CON_KIMI_K3...</span>
                  </>
                ) : headlineSuccess ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    <span>TITULAR_GENERADO_✓</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={11} className="text-blue-400" />
                    <span>⚡ GENERAR_ENCABEZADO_CON_KIMI</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Ej: Optimización de consultas SQL y refactor de autenticación OAuth"
                required
                className="w-full bg-[#111827] border border-[#1e293b] focus:border-blue-500 rounded px-3 py-2 text-xs text-white font-medium focus:outline-none placeholder-slate-500"
              />
              {isGeneratingHeadline && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] font-mono text-blue-400 pointer-events-none">
                  <RefreshCw size={12} className="animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Developer State / Mood */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
              ⚡ DEV_STATE // FLOW_STATUS
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
              {[
                { id: 'flow', label: 'FLOW 🔥', icon: Flame, color: 'text-amber-400 border-amber-500/60 bg-[#111827]' },
                { id: 'productive', label: 'PRODUCTIVE ⚡', icon: Zap, color: 'text-blue-400 border-blue-500/60 bg-[#111827]' },
                { id: 'blocked', label: 'BLOCKED 🚧', icon: AlertTriangle, color: 'text-rose-400 border-rose-500/60 bg-[#111827]' },
                { id: 'learning', label: 'SPIKE_DOC 📚', icon: BookOpen, color: 'text-emerald-400 border-emerald-500/60 bg-[#111827]' },
                { id: 'refactor', label: 'REFACTOR 🔨', icon: Wrench, color: 'text-purple-400 border-purple-500/60 bg-[#111827]' },
              ].map(item => {
                const isSelected = mood === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMood(item.id as any)}
                    className={`flex items-center justify-center gap-1.5 p-1.5 rounded border text-[11px] font-medium transition ${
                      isSelected
                        ? `${item.color} ring-1 ring-blue-500 font-bold shadow-[0_0_8px_rgba(59,130,246,0.3)]`
                        : 'bg-[#05060a] border-[#1e293b] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Activities (Markdown Editor with Toolbar & Preview Tab) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                🧠 ACTIVITIES_AND_CODE (MARKDOWN)
              </label>

              {/* Edit / Preview Tabs */}
              <div className="flex items-center gap-1 bg-[#05060a] p-0.5 rounded border border-[#1e293b] font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded transition ${
                    activeTab === 'edit'
                      ? 'bg-[#111827] text-blue-400 font-bold border border-blue-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 size={11} />
                  <span>EDITOR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded transition ${
                    activeTab === 'preview'
                      ? 'bg-[#111827] text-blue-400 font-bold border border-blue-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye size={11} />
                  <span>PREVIEW</span>
                </button>
              </div>
            </div>

            {/* Markdown Toolbar */}
            {activeTab === 'edit' && (
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#05060a] border border-[#1e293b] rounded-t text-slate-400">
                <button
                  type="button"
                  onClick={() => insertMarkdown('**', '**')}
                  className="p-1 hover:bg-[#111827] hover:text-white rounded"
                  title="Negrita (**texto**)"
                >
                  <Bold size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('*', '*')}
                  className="p-1 hover:bg-[#111827] hover:text-white rounded"
                  title="Cursiva (*texto*)"
                >
                  <Italic size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('`', '`')}
                  className="p-1 hover:bg-[#111827] hover:text-amber-400 rounded"
                  title="Código inline (`code`)"
                >
                  <Code size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('```python\n', '\n```')}
                  className="px-2 py-0.5 hover:bg-[#111827] hover:text-blue-400 rounded text-[10px] font-mono"
                  title="Bloque de código Python"
                >
                  ```py
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('```typescript\n', '\n```')}
                  className="px-2 py-0.5 hover:bg-[#111827] hover:text-blue-400 rounded text-[10px] font-mono"
                  title="Bloque de código TypeScript"
                >
                  ```ts
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('```sql\n', '\n```')}
                  className="px-2 py-0.5 hover:bg-[#111827] hover:text-blue-400 rounded text-[10px] font-mono"
                  title="Bloque de código SQL"
                >
                  ```sql
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('- ')}
                  className="p-1 hover:bg-[#111827] hover:text-white rounded"
                  title="Lista con viñetas"
                >
                  <List size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('- [ ] ')}
                  className="p-1 hover:bg-[#111827] hover:text-white rounded"
                  title="Checklist de tareas"
                >
                  <CheckSquare size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('> ')}
                  className="p-1 hover:bg-[#111827] hover:text-white rounded"
                  title="Cita / Nota"
                >
                  <Quote size={12} />
                </button>

                {/* Quick Auto-titular button */}
                <button
                  type="button"
                  onClick={handleGenerateHeadline}
                  disabled={isGeneratingHeadline}
                  className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 hover:text-white text-[10px] font-mono transition cursor-pointer"
                  title="Generar resumen corto / titular a partir de las actividades escritas usando Kimi K3"
                >
                  {isGeneratingHeadline ? (
                    <RefreshCw size={10} className="animate-spin text-blue-400" />
                  ) : headlineSuccess ? (
                    <Check size={10} className="text-emerald-400" />
                  ) : (
                    <Wand2 size={10} className="text-blue-400" />
                  )}
                  <span>{isGeneratingHeadline ? 'SINTETIZANDO...' : headlineSuccess ? '¡TITULAR LISTO!' : 'AUTO-TITULAR CON KIMI'}</span>
                </button>
              </div>
            )}

            {/* Editor or Preview Pane */}
            {activeTab === 'edit' ? (
              <textarea
                ref={activitiesTextareaRef}
                value={activities}
                onChange={e => setActivities(e.target.value)}
                rows={6}
                placeholder="Describe tus tareas técnicas, commits, snippets de código o endpoints creados..."
                className="w-full bg-[#111827] border border-[#1e293b] focus:border-blue-500 rounded-b p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none"
              />
            ) : (
              <div className="min-h-[140px] p-4 bg-[#111827] border border-[#1e293b] rounded overflow-y-auto max-h-60">
                <MarkdownRenderer content={activities} />
              </div>
            )}
          </div>

          {/* Row 5: Obstacles & Solutions (Split Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <span>⚠️ BLOCKER_TRACE / ERRORS</span>
                </label>
                {obstacles.trim() && onOpenBugSolverWithText && (
                  <button
                    type="button"
                    onClick={() => onOpenBugSolverWithText(obstacles)}
                    className="flex items-center gap-1 text-[9px] font-mono text-amber-300 hover:text-white bg-amber-950/80 hover:bg-amber-900 px-1.5 py-0.5 rounded border border-amber-700/60 transition"
                  >
                    <Sparkles size={10} />
                    <span>DEBUG_AI</span>
                  </button>
                )}
              </div>
              <textarea
                value={obstacles}
                onChange={e => setObstacles(e.target.value)}
                rows={3}
                placeholder="¿Qué fallo o bug retrasó el avance? (Ej: Memory leak, CORS, deadlock)"
                className="w-full bg-[#111827] border border-[#1e293b] focus:border-amber-500 rounded p-2.5 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                💡 APPLIED_SOLUTIONS & LOGS
              </label>
              <textarea
                value={solutions}
                onChange={e => setSolutions(e.target.value)}
                rows={3}
                placeholder="¿Cómo lo resolviste? Documenta la solución para tu futuro 'yo'."
                className="w-full bg-[#111827] border border-[#1e293b] focus:border-emerald-500 rounded p-2.5 text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 6: Next Plan */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
              🎯 NEXT_PLAN // TOMORROW_OBJECTIVES
            </label>
            <input
              type="text"
              value={plan}
              onChange={e => setPlan(e.target.value)}
              placeholder="Ej: Escribir tests E2E, configurar alertas en Grafana"
              className="w-full bg-[#111827] border border-[#1e293b] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Row 7: Enhanced Tags with Dropdown Selector & Smart Related Tags */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                🏷️ SYSTEM_TAGS [ENTER O COMA]
              </label>

              {/* Toggle Dropdown Explorer & Quick Native Dropdown */}
              <div className="flex items-center gap-2">
                {/* Native quick Select Dropdown with Optgroups */}
                <select
                  value=""
                  onChange={e => {
                    if (e.target.value) handleAddTag(e.target.value);
                  }}
                  className="bg-[#111827] border border-[#1e293b] text-blue-300 text-[10px] font-mono rounded px-2 py-1 focus:outline-none cursor-pointer"
                  title="Lista desplegable de tags más frecuentes y relacionados"
                >
                  <option value="">▼ DESPLEGABLE DE TAGS</option>
                  {availableTags.length > 0 && (
                    <optgroup label="🔥 MÁS FRECUENTES EN TU BITÁCORA">
                      {availableTags.slice(0, 10).map(({ tag, count }) => (
                        <option key={tag} value={tag}>
                          #{tag} ({count} veces)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {TAG_CATEGORIES.map(cat => (
                    <optgroup key={cat.category} label={`${cat.icon} ${cat.category.toUpperCase()}`}>
                      {cat.tags.map(t => (
                        <option key={t} value={t}>
                          #{t}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* Rich Explorer Toggle */}
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                  className="flex items-center gap-1 text-[10px] font-mono text-blue-300 hover:text-white bg-blue-950/80 hover:bg-blue-900 border border-blue-800 px-2 py-1 rounded transition cursor-pointer"
                >
                  <Tag size={11} />
                  <span>{isTagDropdownOpen ? 'CERRAR_SELECTOR' : 'EXPLORAR_TAGS'}</span>
                  {isTagDropdownOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            </div>
            
            {/* Tag Pills & Input Box */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#111827] border border-[#1e293b] rounded min-h-[38px]">
              {tags.map(t => (
                <span
                  key={t}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#05060a] text-blue-300 border border-blue-500/40 text-[10px] font-mono"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput && handleAddTag(tagInput)}
                placeholder={tags.length === 0 ? 'Escribe o selecciona abajo: python, fastapi, docker...' : ''}
                className="flex-1 bg-transparent border-none text-xs text-slate-100 focus:outline-none min-w-[140px] font-mono"
              />
            </div>

            {/* Smart Dynamically Related Tags Bar */}
            {smartRelatedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400 font-mono pt-1">
                <span className="text-purple-400 font-bold flex items-center gap-1">
                  <Sparkles size={11} /> RELACIONADAS:
                </span>
                {smartRelatedTags.map(t => {
                  const isSelected = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToggleTag(t)}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer text-[10px] ${
                        isSelected
                          ? 'bg-blue-900/60 text-blue-200 border border-blue-500/80 font-bold'
                          : 'bg-[#111827] hover:bg-[#1e293b] text-slate-300 hover:text-blue-300 border border-[#1e293b]'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+'}#{t}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Rich Tag Dropdown Panel (Categorized & Filterable) */}
            {isTagDropdownOpen && (
              <div className="mt-2 p-3 bg-[#05060a] border border-blue-900/50 rounded-lg shadow-2xl space-y-3">
                {/* Search inside tag directory */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={e => setTagSearchQuery(e.target.value)}
                    placeholder="Filtrar catálogo de tags..."
                    className="w-full bg-[#111827] border border-[#1e293b] rounded pl-7 pr-3 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                  {tagSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTagSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Section 1: User's Most Frequent Tags */}
                {availableTags.length > 0 && !tagSearchQuery && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1 uppercase">
                      <Flame size={12} /> TUS_TAGS_MÁS_FRECUENTES (BITÁCORA)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map(({ tag, count }) => {
                        const isSelected = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                                : 'bg-[#111827] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b]'
                            }`}
                          >
                            <span>#{tag}</span>
                            <span className="text-[9px] opacity-70 bg-black/40 px-1 rounded">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 2: Tech Stack Categories */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {TAG_CATEGORIES.map(cat => {
                    const filtered = cat.tags.filter(t =>
                      t.toLowerCase().includes(tagSearchQuery.toLowerCase())
                    );
                    if (tagSearchQuery && filtered.length === 0) return null;

                    return (
                      <div key={cat.category} className="space-y-1 border-t border-[#1e293b]/60 pt-1.5">
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                          <span>{cat.icon}</span>
                          <span className="font-bold">{cat.category}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {filtered.map(t => {
                            const isSelected = tags.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleToggleTag(t)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                                    : 'bg-[#111827] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] hover:text-blue-300'
                                }`}
                              >
                                {isSelected ? '✓ ' : '+'}#{t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Row 8: Image Attachment (Screenshot/Bug trace) */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              🖼️ SCREENSHOT_CAPTURE [PASTE WITH CTRL+V]
            </label>

            {image ? (
              <div className="relative rounded border border-[#1e293b] bg-[#05060a] p-2 max-w-sm">
                <img
                  src={image}
                  alt="Captura adjunta"
                  className="max-h-48 rounded object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={() => setImage(undefined)}
                  className="absolute top-3 right-3 p-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs shadow"
                  title="Eliminar imagen"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-[#1e293b] hover:border-blue-500/60 bg-[#111827] rounded p-3 text-center cursor-pointer transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <Upload size={18} className="text-blue-400" />
                  <p className="text-xs text-slate-300">
                    Arrastra captura o <strong>pega directo con Ctrl+V</strong>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    PNG, JPG, GIF, WebP
                  </p>
                </div>
              </div>
            )}
          </div>

        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#1e293b] bg-[#05060a]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 text-xs font-mono transition"
          >
            DISCARD
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all active:scale-95 disabled:opacity-50 uppercase tracking-wider"
          >
            <Save size={14} />
            <span>{isSubmitting ? 'COMMITTING...' : initialEntry ? 'UPDATE_BUFFER' : 'COMMIT_TO_MEMORY'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
