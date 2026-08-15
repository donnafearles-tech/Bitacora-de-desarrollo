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
  Bell,
  Volume2,
  Coffee,
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
  const [tagDescriptions, setTagDescriptions] = useState<Record<string, string>>({});
  const [timeSpentHours, setTimeSpentHours] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0); // Total Master Chronometer (seconds)
  const [pomodoroSeconds, setPomodoroSeconds] = useState<number>(25 * 60); // Current Pomodoro interval countdown (seconds)
  const [pomodoroDuration, setPomodoroDuration] = useState<number>(25 * 60); // Interval target (e.g. 25m = 1500s)
  const [pomodoroIntervalCount, setPomodoroIntervalCount] = useState<number>(1); // Current interval number (1, 2, 3...)
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(0); // Total completed intervals
  const [pomodoroType, setPomodoroType] = useState<'work' | 'break'>('work');
  const [pomodoroCompleted, setPomodoroCompleted] = useState<boolean>(false);
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

  // Kimi AI Atlas.ti Composite Code Generation State
  const [baseTagForAi, setBaseTagForAi] = useState('Python');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeSuccessMsg, setCodeSuccessMsg] = useState<string | null>(null);

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
      setTagDescriptions(initialEntry.tagDescriptions || {});
      const hrs = initialEntry.timeSpentHours || 4;
      setTimeSpentHours(hrs);
      setTimerSeconds(Math.round(hrs * 3600));
      setIsTimerRunning(false);
      setMood(initialEntry.mood || 'productive');
      setImage(initialEntry.image);
    } else if (isOpen) {
      // Reset to defaults with local browser date & AUTO-START LIVE TIMER
      setDate(getTodayLocalDateString());
      setSummary('');
      setProject(existingProjects[0] || 'General');
      setActivities('### Tareas Realizadas\n- \n\n```python\n# Fragmento de código clave\n```');
      setObstacles('');
      setSolutions('');
      setPlan('');
      setTags(['dev']);
      setTagDescriptions({});
      setTimeSpentHours(0);
      setTimerSeconds(0);
      setPomodoroSeconds(25 * 60);
      setPomodoroDuration(25 * 60);
      setPomodoroCompleted(false);
      setIsTimerRunning(true); // Auto-iniciar pomodoro de 25m al abrir nueva entrada
      setMood('productive');
      setImage(undefined);
    }
    setActiveTab('edit');
    setIsTagDropdownOpen(false);
    setTagSearchQuery('');
    setErrorMsg(null);
  }, [initialEntry, isOpen, existingProjects]);

  // Web Audio API notification sound for Pomodoro completion
  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playTone = (freq: number, start: number, duration: number, volume = 0.3) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Melodic 5-note ascending bell chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz) -> E6 (1318Hz)
      playTone(523.25, 0, 0.45, 0.28);
      playTone(659.25, 0.15, 0.45, 0.30);
      playTone(783.99, 0.30, 0.50, 0.32);
      playTone(1046.50, 0.48, 0.85, 0.38);
      playTone(1318.51, 0.68, 1.20, 0.35);
    } catch (err) {
      console.warn('No se pudo reproducir audio de notificación:', err);
    }
  };

  // Synchronized Dual Timer Interval:
  // 1. Pomodoro decrements interval countdown (25m) and triggers auto chime sound
  // 2. Crono simultaneously increments total elapsed session time in seconds
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        // 1. Accumulate overall master chronometer time continuously
        setTimerSeconds(prev => {
          const next = prev + 1;
          const computedHours = Math.max(0.1, Math.round((next / 3600) * 10) / 10);
          setTimeSpentHours(computedHours);
          return next;
        });

        // 2. Decrement Pomodoro interval countdown simultaneously
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            // Interval finished: ring notification sound automatically!
            playNotificationSound();
            setPomodoroCompleted(true);
            setCompletedPomodoros(c => c + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const handleStartNextPomodoro = (type: 'work' | 'break' = 'work', minutes = 25) => {
    const totalSecs = minutes * 60;
    setPomodoroType(type);
    setPomodoroDuration(totalSecs);
    setPomodoroSeconds(totalSecs);
    setPomodoroCompleted(false);
    if (type === 'work') {
      setPomodoroIntervalCount(c => c + 1);
    }
    setIsTimerRunning(true);
  };

  const handleResetPomodoroInterval = () => {
    setPomodoroCompleted(false);
    setPomodoroSeconds(pomodoroDuration);
  };

  const handleResetAllTimers = () => {
    setIsTimerRunning(false);
    setPomodoroCompleted(false);
    setPomodoroSeconds(25 * 60);
    setPomodoroDuration(25 * 60);
    setPomodoroIntervalCount(1);
    setPomodoroType('work');
    setTimerSeconds(0);
    setTimeSpentHours(0);
  };

  const formatPomodoroDisplay = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
    setTagDescriptions(prev => {
      const next = { ...prev };
      delete next[tagToRemove];
      return next;
    });
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

  // AI Generate Composite Code for Atlas.ti (e.g. "Python: correccion_bucles")
  const handleGenerateCompositeCode = async () => {
    const rawContent = [activities, obstacles, solutions, summary].filter(Boolean).join('\n\n').trim();
    if (!rawContent || rawContent.length < 5) {
      setErrorMsg('Escribe primero el contenido de tu entrada (actividades, obstáculos o código) para que la IA deduzca la palabra clave.');
      return;
    }

    const currentBase = baseTagForAi.trim();
    if (!currentBase) {
      setErrorMsg('Selecciona o escribe una etiqueta base (ej: Python, React, Bug).');
      return;
    }

    try {
      setIsGeneratingCode(true);
      setErrorMsg(null);
      setCodeSuccessMsg(null);

      const res = await fetch('/api/ai/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseTag: currentBase,
          content: rawContent,
          project: project || 'General',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo generar el código compuesto.');
      }

      const data = await res.json();
      if (data.compositeCode) {
        const codeToAdd = data.compositeCode.trim();
        if (!tags.includes(codeToAdd)) {
          setTags(prev => [...prev, codeToAdd]);
        }
        if (data.description) {
          setTagDescriptions(prev => ({
            ...prev,
            [codeToAdd]: data.description.trim(),
          }));
        }
        setCodeSuccessMsg(`Código generado: "${codeToAdd}"`);
        setTimeout(() => setCodeSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar el código compuesto con IA.');
    } finally {
      setIsGeneratingCode(false);
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
        tagDescriptions,
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

            <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-2 space-y-2 text-[8.5px]">
              {/* Header: Sincronización & Badges */}
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 bg-rose-950/70 text-rose-300 border border-rose-800/60 px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold">
                    <span>🍅 POMODORO 25M</span>
                  </div>
                  <span className="text-slate-600 font-mono text-[8.5px]">⇄</span>
                  <div className="flex items-center gap-1 bg-blue-950/70 text-blue-300 border border-blue-800/60 px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold">
                    <span>⏱️ CRONO TOTAL</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[8.5px] font-mono">
                  <span className="bg-[#111827] text-slate-300 border border-[#1e293b] px-1.5 py-0.5 rounded">
                    INT: <strong className="text-amber-400">#{pomodoroIntervalCount}</strong>
                  </span>
                  {completedPomodoros > 0 && (
                    <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded font-bold">
                      ✓ {completedPomodoros} {completedPomodoros === 1 ? 'completado' : 'completados'}
                    </span>
                  )}
                  <span className="text-blue-400 font-bold bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/60">
                    TOTAL: {timeSpentHours}h
                  </span>
                </div>
              </div>

              {/* Dual Synchronized Clocks (Side by Side) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {/* 1. Pomodoro 25m Interval Box */}
                <div className="bg-[#111827]/90 rounded-lg p-2 border border-rose-950/60 space-y-1 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1">
                      {isTimerRunning ? (
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                        </span>
                      ) : (
                        <Timer size={10} className="text-rose-400" />
                      )}
                      <span>{pomodoroType === 'work' ? `INTERVALO #${pomodoroIntervalCount} (25M)` : 'DESCANSO (5M)'}</span>
                    </span>
                    <span className="text-[8px] font-mono text-slate-500">
                      {Math.round(pomodoroDuration / 60)}m meta
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div
                      className={`font-mono text-[17px] font-bold tracking-wider ${
                        pomodoroCompleted
                          ? 'text-emerald-400 animate-pulse'
                          : isTimerRunning
                          ? 'text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                          : 'text-slate-300'
                      }`}
                    >
                      {formatPomodoroDisplay(pomodoroSeconds)}
                    </div>
                    <span className="text-[8px] font-mono text-slate-400">
                      {Math.min(100, Math.round(((pomodoroDuration - pomodoroSeconds) / pomodoroDuration) * 100))}%
                    </span>
                  </div>

                  {/* Pomodoro Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-[#1e293b]">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        pomodoroCompleted
                          ? 'bg-emerald-500'
                          : isTimerRunning
                          ? 'bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400'
                          : 'bg-rose-800'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(2, ((pomodoroDuration - pomodoroSeconds) / pomodoroDuration) * 100))}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* 2. Total Master Chrono Box */}
                <div className="bg-[#111827]/90 rounded-lg p-2 border border-blue-950/60 space-y-1 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1">
                      {isTimerRunning ? (
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                        </span>
                      ) : (
                        <Timer size={10} className="text-blue-400" />
                      )}
                      <span>CRONO TOTAL (SESIÓN)</span>
                    </span>
                    <span className="text-[8px] font-mono text-emerald-400 font-bold">
                      {timeSpentHours}h REGISTRADAS
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div
                      className={`font-mono text-[17px] font-bold tracking-wider ${
                        isTimerRunning
                          ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                          : 'text-slate-300'
                      }`}
                    >
                      {formatTimerDisplay(timerSeconds)}
                    </div>
                    <span className="text-[8px] font-mono text-slate-500">
                      acumulado continuo
                    </span>
                  </div>

                  {/* Chrono Progress Bar (based on 8h work day) */}
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-[#1e293b]">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isTimerRunning
                          ? 'bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400'
                          : 'bg-blue-800'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(2, (timerSeconds / (8 * 3600)) * 100))}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Pomodoro Completed Alert & Audio Notification */}
              {pomodoroCompleted && (
                <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border border-emerald-500/80 text-emerald-300 text-[8.5px] font-mono animate-bounce shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <Bell size={12} className="text-emerald-400 animate-spin" />
                    <div>
                      <div className="font-bold">¡INTERVALO #{pomodoroIntervalCount} (25M) COMPLETADO!</div>
                      <div className="text-[7.5px] text-slate-400">Sonido de campana emitido automáticamente. El crono total sigue activo.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartNextPomodoro('work', 25)}
                      className="px-1.5 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-[8px] font-mono font-bold cursor-pointer transition shadow"
                    >
                      🍅 SIG. 25M (#{pomodoroIntervalCount + 1})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNextPomodoro('break', 5)}
                      className="px-1.5 py-0.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white text-[8px] font-mono font-bold cursor-pointer transition shadow"
                    >
                      ☕ DESCANSO 5M
                    </button>
                  </div>
                </div>
              )}

              {/* Unified Controls Toolbar */}
              <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                {/* Play/Pause both synchronized timers */}
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-mono font-bold transition cursor-pointer ${
                    isTimerRunning
                      ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  }`}
                  title={isTimerRunning ? 'Pausar ambos contadores' : 'Reanudar ambos contadores sincronizados'}
                >
                  {isTimerRunning ? <Pause size={10} /> : <Play size={10} />}
                  <span>{isTimerRunning ? 'PAUSAR_AMBOS' : 'INICIAR_AMBOS'}</span>
                </button>

                {/* Interval and Sound Fast Actions */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleStartNextPomodoro('work', 25)}
                    className="px-1.5 py-0.5 rounded text-[8.5px] font-mono bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-800/60 transition cursor-pointer"
                    title="Comenzar nuevo intervalo de 25 minutos"
                  >
                    🍅 +25m Focus
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartNextPomodoro('break', 5)}
                    className="px-1.5 py-0.5 rounded text-[8.5px] font-mono bg-[#111827] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-[#1e293b] transition cursor-pointer"
                    title="Iniciar descanso de 5 minutos"
                  >
                    ☕ +5m Break
                  </button>

                  <button
                    type="button"
                    onClick={playNotificationSound}
                    className="px-1.5 py-0.5 rounded bg-[#1f293d] hover:bg-[#283548] text-slate-300 hover:text-amber-300 border border-[#334155] text-[8.5px] font-mono flex items-center gap-1 transition cursor-pointer"
                    title="Probar campana melódica de notificación"
                  >
                    <Bell size={9} className="text-amber-400" />
                    <span>CAMPANA</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPomodoroInterval}
                    className="px-1.5 py-0.5 rounded text-[8.5px] font-mono bg-[#111827] hover:bg-[#1e293b] text-slate-400 hover:text-amber-300 border border-[#1e293b] transition cursor-pointer"
                    title="Reiniciar sólo el intervalo de 25m (conserva el crono total)"
                  >
                    ↺ Int.
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAllTimers}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-[#111827] border border-transparent hover:border-[#1e293b] transition cursor-pointer"
                    title="Reiniciar todo a 0 (Intervalo y Crono total)"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Short Summary Headline */}
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                📌 SUMMARY_HEADLINE // SUMARIO CONDENSADO
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
                title="Kimi K3 sintetiza un titular técnico conciso de alta densidad informativa (no copia párrafos)"
              >
                {isGeneratingHeadline ? (
                  <>
                    <RefreshCw size={11} className="animate-spin text-blue-400" />
                    <span>SINTETIZANDO_SUMARIO_CONDENSADO...</span>
                  </>
                ) : headlineSuccess ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    <span>SUMARIO_GENERADO_✓</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={11} className="text-blue-400" />
                    <span>⚡ CONDENSAR_SUMARIO_CON_KIMI</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Ej: Implementación de rotación de tokens JWT y control de expiración de sesiones"
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

          {/* Row 7: Enhanced Tags & Atlas.ti Composite Codes */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                🏷️ SYSTEM_TAGS & ATLAS.TI CODES
              </label>

              {/* Toggle Dropdown Explorer & Quick Native Dropdown */}
              <div className="flex items-center gap-2">
                {/* Native quick Select Dropdown with Optgroups */}
                <select
                  value=""
                  onChange={e => {
                    if (e.target.value) {
                      handleAddTag(e.target.value);
                      setBaseTagForAi(e.target.value);
                    }
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

            {/* AI Composite Code Generation for Atlas.ti */}
            <div className="p-2.5 bg-[#070913] border border-purple-900/50 rounded-lg space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-300 font-bold uppercase">
                  <Sparkles size={12} className="text-purple-400" />
                  <span>CÓDIGO_COMPUESTO_IA (ATLAS.TI // FORMATO: EtiquetaBase: palabra_clave)</span>
                </div>
                {codeSuccessMsg && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60 animate-pulse">
                    ✓ {codeSuccessMsg}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#111827] border border-purple-800/40 rounded px-2 py-1">
                  <span className="text-[10px] font-mono text-slate-400">BASE:</span>
                  <select
                    value={baseTagForAi}
                    onChange={e => setBaseTagForAi(e.target.value)}
                    className="bg-transparent text-purple-200 text-xs font-mono font-bold focus:outline-none cursor-pointer"
                  >
                    {['Python', 'React', 'TypeScript', 'Node.js', 'Bug', 'SQL', 'FastAPI', 'Docker', 'DevOps', 'Performance', 'Auth', 'Refactor', 'Testing', 'Architecture', 'CSS', 'Git', 'API'].map(opt => (
                      <option key={opt} value={opt} className="bg-[#0a0c14] text-white">
                        {opt}
                      </option>
                    ))}
                    {tags.filter(t => !t.includes(':')).map(t => (
                      <option key={t} value={t} className="bg-[#0a0c14] text-white">
                        {t} (Actual)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCompositeCode}
                  disabled={isGeneratingCode}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    isGeneratingCode
                      ? 'bg-purple-950 text-purple-300 border border-purple-800 animate-pulse cursor-wait'
                      : 'bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 hover:text-white border border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.3)] active:scale-95'
                  }`}
                  title="La IA analiza las actividades y deduce un código temático (ej: Python: correccion_bucles)"
                >
                  {isGeneratingCode ? (
                    <>
                      <RefreshCw size={12} className="animate-spin text-purple-300" />
                      <span>DEDUCIENDO_CÓDIGO...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={12} className="text-purple-300" />
                      <span>⚡ GENERAR CÓDIGO COMPUESTO CON IA</span>
                    </>
                  )}
                </button>

                <span className="text-[9px] font-mono text-slate-500 hidden xl:inline">
                  Ej: "{baseTagForAi}: deduccion_automatica"
                </span>
              </div>
            </div>
            
            {/* Tag Pills & Input Box */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#111827] border border-[#1e293b] rounded min-h-[38px]">
              {tags.map(t => {
                const isComposite = t.includes(':');
                return (
                  <span
                    key={t}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition ${
                      isComposite
                        ? 'bg-gradient-to-r from-purple-950 to-blue-950 text-purple-200 border border-purple-500/70 shadow-[0_0_8px_rgba(168,85,247,0.25)] font-bold'
                        : 'bg-[#05060a] text-blue-300 border border-blue-500/40'
                    }`}
                    title={
                      tagDescriptions[t]
                        ? `${t} — ${tagDescriptions[t]}`
                        : isComposite
                        ? 'Código compuesto para análisis en Atlas.ti'
                        : 'Tag del sistema'
                    }
                  >
                    {isComposite ? '🏷️ ' : '#'}
                    {t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-400 hover:text-rose-400 cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput && handleAddTag(tagInput)}
                placeholder={tags.length === 0 ? 'Escribe o selecciona abajo: Python: correccion_bucles, react, docker...' : ''}
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
