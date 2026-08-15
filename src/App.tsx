import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Calendar,
  Sparkles,
  BarChart3,
  Bug,
  Download,
  Terminal,
  Filter,
  Layers,
  FolderKanban,
  CheckCircle2,
  RefreshCw,
  Clock,
  Flame,
  Search,
} from 'lucide-react';
import { Header } from './components/Header';
import { SearchAndFilterBar } from './components/SearchAndFilterBar';
import { EntryCard } from './components/EntryCard';
import { EntryFormModal } from './components/EntryFormModal';
import { ProductivityStatsModal } from './components/ProductivityStatsModal';
import { AISummaryModal } from './components/AISummaryModal';
import { AISolveErrorModal } from './components/AISolveErrorModal';
import { ExportModal } from './components/ExportModal';
import { LogEntry, ProductivityStats, AISummaryResponse, AISolveErrorResponse } from './types';
import { getTodayLocalDateString } from './utils/date';

export default function App() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<ProductivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light' | 'hacker'>('dark');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [filterOption, setFilterOption] = useState<'all' | 'week' | 'month' | 'obstacles' | 'images'>('all');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);
  const [isBugSolverOpen, setIsBugSolverOpen] = useState(false);
  const [bugSolverInitialText, setBugSolverInitialText] = useState('');
  const [bugSolverInitialContext, setBugSolverInitialContext] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch all entries from API
  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/entries');
      if (!res.ok) throw new Error('Error al cargar bitácora');
      const data = await res.json();
      setEntries(data);
    } catch (err: any) {
      console.error('Error fetching entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, []);

  // Save / Update Entry Handler
  const handleSaveEntry = async (entryData: Partial<LogEntry> & { date: string; summary: string }) => {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar el registro');
    }

    const saved = await res.json();
    showToast(entryData.id ? 'Registro actualizado correctamente' : '¡Nueva entrada guardada en la bitácora!');
    await fetchEntries();
    await fetchStats();
  };

  // Delete Entry Handler
  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar registro');
      showToast('Registro eliminado con éxito.');
      await fetchEntries();
      await fetchStats();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // AI Weekly Summary Generator
  const handleGenerateAISummary = async (period: 'week' | 'month' | 'custom'): Promise<AISummaryResponse> => {
    const res = await fetch('/api/ai/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al generar resumen');
    }
    return await res.json();
  };

  // AI Bug / Error Solver
  const handleSolveBug = async (errorText: string, context?: string, language?: string): Promise<AISolveErrorResponse> => {
    const res = await fetch('/api/ai/solve-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errorText, context, language }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al depurar con IA');
    }
    return await res.json();
  };

  // Import JSON Backup Handler
  const handleImportJson = async (importedEntries: LogEntry[]) => {
    const res = await fetch('/api/import/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: importedEntries }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al importar datos');
    }
    showToast(`Se restauraron ${importedEntries.length} registros.`);
    await fetchEntries();
    await fetchStats();
  };

  // Quick action: Open bug solver with prefilled error
  const handleOpenBugSolverWithText = (errorText: string, context?: string) => {
    setBugSolverInitialText(errorText);
    setBugSolverInitialContext(context || '');
    setIsBugSolverOpen(true);
  };

  // Compute available tags with frequencies
  const availableTags = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      e.tags?.forEach(t => {
        const clean = t.trim().toLowerCase();
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Compute available projects
  const availableProjects = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      if (e.project) set.add(e.project);
    });
    return Array.from(set).sort();
  }, [entries]);

  // Filter and Search logic
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(now.getDate() - 30);

    return entries.filter(entry => {
      // 1. Text Search (title, activities, obstacles, solutions, plan, project, tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSummary = entry.summary.toLowerCase().includes(q);
        const matchesActivities = entry.activities.toLowerCase().includes(q);
        const matchesObstacles = entry.obstacles?.toLowerCase().includes(q);
        const matchesSolutions = entry.solutions?.toLowerCase().includes(q);
        const matchesPlan = entry.plan?.toLowerCase().includes(q);
        const matchesProject = entry.project?.toLowerCase().includes(q);
        const matchesTags = entry.tags?.some(t => t.toLowerCase().includes(q));

        if (
          !matchesSummary &&
          !matchesActivities &&
          !matchesObstacles &&
          !matchesSolutions &&
          !matchesPlan &&
          !matchesProject &&
          !matchesTags
        ) {
          return false;
        }
      }

      // 2. Tag Filter
      if (selectedTag) {
        if (!entry.tags?.some(t => t.toLowerCase() === selectedTag.toLowerCase())) {
          return false;
        }
      }

      // 3. Project Filter
      if (selectedProject) {
        if (entry.project !== selectedProject) return false;
      }

      // 4. Quick Option Filter
      if (filterOption === 'week') {
        const entryDate = new Date(entry.date);
        if (entryDate < weekAgo) return false;
      } else if (filterOption === 'month') {
        const entryDate = new Date(entry.date);
        if (entryDate < monthAgo) return false;
      } else if (filterOption === 'obstacles') {
        if (!entry.obstacles || !entry.obstacles.trim()) return false;
      } else if (filterOption === 'images') {
        if (!entry.image) return false;
      }

      return true;
    });
  }, [entries, searchQuery, selectedTag, selectedProject, filterOption]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : prev === 'light' ? 'hacker' : 'dark'));
  };

  const themeClasses = {
    dark: 'bg-[#05060a] text-[#e2e8f0]',
    light: 'bg-slate-100 text-slate-900',
    hacker: 'bg-black text-emerald-400 font-mono',
  }[theme];

  return (
    <div className={`min-h-screen ${themeClasses} transition-colors duration-200 flex flex-col font-sans selection:bg-blue-600 selection:text-white`}>
      
      {/* Top Navigation & App Header */}
      <Header
        stats={stats}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenNewEntry={() => {
          setEditingEntry(null);
          setIsFormOpen(true);
        }}
        onOpenAIWeekly={() => setIsAISummaryOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenBugSolver={() => {
          setBugSolverInitialText('');
          setBugSolverInitialContext('');
          setIsBugSolverOpen(true);
        }}
        onOpenExport={() => setIsExportOpen(true)}
        entriesCount={entries.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        
        {/* Immersive UI Hero Banner */}
        <div className="relative overflow-hidden rounded-lg bg-[#0a0c14] border border-[#1e293b] p-4 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse" />
                <h2 className="text-sm font-bold text-white tracking-wider font-mono uppercase">
                  SYSTEM_BUFFER // SOFTWARE_ENGINEERING_LOG
                </h2>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Persistencia en tiempo real, trazabilidad de código, diagnóstico de bugs con Gemini AI y métricas de productividad.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setEditingEntry(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                <Plus size={15} />
                <span>LOG_TODAY ({getTodayLocalDateString()})</span>
              </button>

              <button
                onClick={() => setIsAISummaryOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#111827] hover:bg-blue-900/30 border border-purple-500/40 text-purple-300 text-xs font-mono font-medium transition-all active:scale-95"
              >
                <Sparkles size={13} className="text-purple-400" />
                <span>KIMI_MENTOR</span>
              </button>
            </div>
          </div>

          {/* Background grid accent */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Search, Tag Filtering & Quick Filter Bar */}
        <SearchAndFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
          selectedProject={selectedProject}
          onProjectSelect={setSelectedProject}
          filterOption={filterOption}
          onFilterOptionChange={setFilterOption}
          availableTags={availableTags}
          availableProjects={availableProjects}
          totalResults={filteredEntries.length}
        />

        {/* Entries List or Empty State */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <p className="text-xs font-mono">LOADING_PERSISTENT_MEMORY...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center rounded-lg bg-[#0a0c14] border border-[#1e293b] p-8 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              <Terminal size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                // LOG_BUFFER_EMPTY — BITÁCORA LISTA
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-sans">
                No hay registros previos. Comienza a documentar tus jornadas de desarrollo, resolución de obstáculos, horas trabajadas y código para análisis con IA.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingEntry(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono shadow-[0_0_12px_rgba(37,99,235,0.4)] transition-all active:scale-95 uppercase tracking-wider cursor-pointer"
            >
              <Plus size={15} />
              <span>REGISTRAR_PRIMERA_SESION</span>
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center rounded-lg bg-[#0a0c14] border border-[#1e293b] p-8 space-y-3 shadow-xl">
            <div className="w-10 h-10 rounded bg-[#111827] border border-[#1e293b] text-slate-400 flex items-center justify-center mx-auto">
              <Search size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase">
              NO_MATCHING_RECORDS_FOUND
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Intenta cambiar el criterio de búsqueda o limpia las etiquetas activas.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag(null);
                setSelectedProject(null);
                setFilterOption('all');
              }}
              className="px-3.5 py-1.5 rounded bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs font-mono transition uppercase"
            >
              CLEAR_FILTERS
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredEntries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={entryToEdit => {
                  setEditingEntry(entryToEdit);
                  setIsFormOpen(true);
                }}
                onDelete={handleDeleteEntry}
                onTagClick={tag => setSelectedTag(tag)}
                onSolveBugWithAI={handleOpenBugSolverWithText}
              />
            ))}
          </div>
        )}

      </main>

      {/* App Footer */}
      <footer className="mt-12 border-t border-[#1e293b] bg-[#0a0c14] py-5 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-blue-500" />
            <span className="text-slate-400">DEVLOG_PRO // v3.1 • PERSISTENT_SOFTWARE_ACTIVITY_BUFFER</span>
          </div>
          <div className="text-[10px] text-slate-500">
            <span>DATABASE: SQLITE / JSON • GEMINI AI INTERFACE • EXPORT XLSX / PDF</span>
          </div>
        </div>
      </footer>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded bg-[#0a0c14] border border-blue-500/80 text-blue-200 text-xs font-mono shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-bounce">
          <CheckCircle2 size={15} className="text-green-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODALS */}

      {/* 1. New / Edit Entry Modal */}
      <EntryFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
        initialEntry={editingEntry}
        existingProjects={availableProjects}
        availableTags={availableTags}
        onOpenBugSolverWithText={handleOpenBugSolverWithText}
      />

      {/* 2. Productivity Analytics Modal */}
      <ProductivityStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
      />

      {/* 3. AI Weekly / Monthly Summary Modal */}
      <AISummaryModal
        isOpen={isAISummaryOpen}
        onClose={() => setIsAISummaryOpen(false)}
        onGenerateSummary={handleGenerateAISummary}
        currentEntries={entries}
      />

      {/* 4. AI Bug Solver Modal */}
      <AISolveErrorModal
        isOpen={isBugSolverOpen}
        onClose={() => setIsBugSolverOpen(false)}
        initialErrorText={bugSolverInitialText}
        initialContext={bugSolverInitialContext}
        onSolveBug={handleSolveBug}
      />

      {/* 5. Export & Backup Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        entries={entries}
        onImportJson={handleImportJson}
      />

    </div>
  );
}
