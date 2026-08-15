import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Plus,
  Sparkles,
  BarChart3,
  Bug,
  Download,
  Flame,
  Clock,
  Sun,
  Moon,
  Database,
  Globe,
  FolderKanban,
  FolderPlus,
} from 'lucide-react';
import { ProductivityStats } from '../types';
import { getLocalTimeZoneName } from '../utils/date';

interface HeaderProps {
  stats: ProductivityStats | null;
  theme: 'dark' | 'light' | 'hacker';
  onToggleTheme: () => void;
  onOpenNewEntry: () => void;
  onOpenAIWeekly: () => void;
  onOpenStats: () => void;
  onOpenBugSolver: () => void;
  onOpenExport: () => void;
  entriesCount: number;
  activeProject: string;
  availableProjects: string[];
  onChangeActiveProject: (proj: string) => void;
  onOpenNewProjectModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  theme,
  onToggleTheme,
  onOpenNewEntry,
  onOpenAIWeekly,
  onOpenStats,
  onOpenBugSolver,
  onOpenExport,
  entriesCount,
  activeProject,
  availableProjects,
  onChangeActiveProject,
  onOpenNewProjectModal,
}) => {
  const [localTime, setLocalTime] = useState<string>('');
  const [dbProvider, setDbProvider] = useState<'supabase' | 'local_json'>('local_json');
  const timezoneName = getLocalTimeZoneName();

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data?.database?.provider === 'supabase') {
          setDbProvider('supabase');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b border-[#1e293b] bg-[#0a0c14]/95 text-[#e2e8f0] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Project Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_10px_#2563eb] text-white">
                <Terminal size={20} className="text-white animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-tighter leading-none text-white">
                    DEVLOG_PRO
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono tracking-widest bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/60">
                    v3.1 // STABLE
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">
                  ENGINEERING LOG BUFFER • METRICS & AI
                </span>
              </div>
            </div>

            {/* Active Workspace / Project Selector */}
            <div className="flex items-center gap-1.5 bg-[#111827] px-2.5 py-1 rounded-md border border-blue-500/40 text-xs font-mono shadow-sm">
              <FolderKanban size={14} className="text-blue-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider leading-none">PROYECTO ACTIVO</span>
                <select
                  value={activeProject}
                  onChange={e => {
                    if (e.target.value === '__NEW_PROJECT__') {
                      onOpenNewProjectModal();
                    } else {
                      onChangeActiveProject(e.target.value);
                    }
                  }}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1 py-0.5 appearance-none hover:text-blue-300 transition"
                  title="Cambiar proyecto activo para registrar y filtrar"
                >
                  <option value="__ALL__" className="bg-[#0b0f19] text-blue-300">🌐 [TODOS LOS PROYECTOS]</option>
                  {availableProjects.map(p => (
                    <option key={p} value={p} className="bg-[#0b0f19] text-white">
                      📁 {p}
                    </option>
                  ))}
                  <option value="__NEW_PROJECT__" className="bg-[#1e1b4b] text-purple-300 font-bold">
                    ➕ Agregar nuevo proyecto...
                  </option>
                </select>
              </div>
              <button
                type="button"
                onClick={onOpenNewProjectModal}
                className="p-1 text-slate-400 hover:text-blue-300 hover:bg-blue-950/50 rounded transition"
                title="Crear nuevo proyecto..."
              >
                <FolderPlus size={13} />
              </button>
            </div>
          </div>

          {/* Quick Metrics Badges, Local Clock & DB status */}
          <div className="hidden lg:flex items-center gap-2.5 font-mono text-xs">
            {/* Real-time Local Timezone & Clock */}
            <div
              className="flex items-center space-x-2 bg-[#111827] px-3 py-1.5 rounded border border-blue-900/40 text-blue-300 shadow-sm"
              title={`Hora local de tu navegador (${timezoneName})`}
            >
              <Clock size={13} className="text-blue-400 animate-spin-slow" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white leading-none">{localTime || '--:--:--'}</span>
                <span className="text-[9px] text-blue-400/80 uppercase tracking-tighter">
                  {timezoneName.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div
              className={`flex items-center space-x-2 bg-[#111827] px-3 py-1.5 rounded border ${
                dbProvider === 'supabase' ? 'border-emerald-700/60 text-emerald-300' : 'border-[#1e293b] text-slate-300'
              }`}
              title={dbProvider === 'supabase' ? 'Persistencia activa en Supabase Cloud' : 'Persistencia local activa (data/bitacora_db.json)'}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  dbProvider === 'supabase' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-blue-400 shadow-[0_0_5px_#60a5fa]'
                } animate-pulse`}
              ></div>
              <span className="text-[10px] font-mono">
                {dbProvider === 'supabase' ? 'DB: SUPABASE_CLOUD' : 'DB: LOCAL_JSON'}
              </span>
            </div>

            {stats && (
              <>
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] border border-[#1e293b] text-slate-300 shadow-sm"
                  title="Racha activa de días consecutivos programando"
                >
                  <Flame size={13} className="text-amber-400 animate-bounce" />
                  <span className="text-amber-400 font-bold text-[11px]">{stats.currentStreak}d</span>
                  <span className="text-slate-500 text-[10px]">STREAK</span>
                </div>

                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] border border-[#1e293b] text-slate-300 shadow-sm"
                  title="Total de horas registradas"
                >
                  <Clock size={13} className="text-blue-400" />
                  <span className="text-blue-400 font-bold text-[11px]">{stats.totalHours}h</span>
                  <span className="text-slate-500 text-[10px]">LOGGED</span>
                </div>

                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] border border-[#1e293b] text-slate-300 shadow-sm"
                  title="Total de registros en memoria"
                >
                  <Database size={13} className="text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-[11px]">{entriesCount}</span>
                  <span className="text-slate-500 text-[10px]">ENTRIES</span>
                </div>
              </>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={onOpenNewEntry}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              <Plus size={14} />
              <span>New_Entry</span>
            </button>

            <button
              onClick={onOpenAIWeekly}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] hover:bg-blue-900/30 border border-purple-500/40 text-purple-300 font-medium text-xs transition-all active:scale-95 shadow-sm"
              title="Resumen Semanal y Mentoría con IA"
            >
              <Sparkles size={13} className="text-purple-400" />
              <span className="hidden sm:inline">Kimi_Insights</span>
            </button>

            <button
              onClick={onOpenStats}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 font-medium text-xs transition-all active:scale-95 shadow-sm"
              title="Métricas y Mapa de Productividad"
            >
              <BarChart3 size={13} className="text-cyan-400" />
              <span className="hidden sm:inline">Metrics</span>
            </button>

            <button
              onClick={onOpenBugSolver}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] hover:bg-rose-950/40 border border-rose-800/40 text-rose-300 font-medium text-xs transition-all active:scale-95 shadow-sm"
              title="Solucionador de Obstáculos y Bugs con IA"
            >
              <Bug size={13} className="text-rose-400" />
              <span className="hidden md:inline">Debug_AI</span>
            </button>

            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 text-xs transition-all active:scale-95"
              title="Exportar a Excel, PDF o Backup JSON"
            >
              <Download size={13} />
              <span className="hidden lg:inline">Export</span>
            </button>

            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 text-xs transition"
              title={`Modo: ${theme}`}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
