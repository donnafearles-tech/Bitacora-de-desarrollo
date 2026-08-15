import React from 'react';
import { Search, Tag, X, FolderKanban, AlertCircle, Image as ImageIcon, Calendar } from 'lucide-react';

interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  selectedProject: string | null;
  onProjectSelect: (project: string | null) => void;
  filterOption: 'all' | 'week' | 'month' | 'obstacles' | 'images';
  onFilterOptionChange: (opt: 'all' | 'week' | 'month' | 'obstacles' | 'images') => void;
  availableTags: { tag: string; count: number }[];
  availableProjects: string[];
  totalResults: number;
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  selectedProject,
  onProjectSelect,
  filterOption,
  onFilterOptionChange,
  availableTags,
  availableProjects,
  totalResults,
}) => {
  const hasActiveFilters = searchQuery || selectedTag || selectedProject || filterOption !== 'all';

  const clearAllFilters = () => {
    onSearchChange('');
    onTagSelect(null);
    onProjectSelect(null);
    onFilterOptionChange('all');
  };

  return (
    <div className="bg-[#0a0c14] border border-[#1e293b] rounded-lg p-4 shadow-xl space-y-3">
      {/* Top row: Search input + Project dropdown + Clear button */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="SEARCH LOGS [CTRL+F]..."
            className="w-full bg-[#111827] border border-[#1e293b] focus:border-blue-500 rounded-md pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Project Selector */}
        {availableProjects.length > 0 && (
          <div className="relative sm:w-56">
            <select
              value={selectedProject || ''}
              onChange={e => onProjectSelect(e.target.value || null)}
              className="w-full bg-[#111827] border border-[#1e293b] focus:border-blue-500 rounded-md px-3 py-1.5 text-xs text-slate-200 appearance-none focus:outline-none cursor-pointer font-mono"
            >
              <option value="">📁 ALL_PROJECTS</option>
              {availableProjects.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <FolderKanban
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>
        )}

        {/* Results Badge & Reset */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono">
          <span className="text-slate-400 px-2.5 py-1 rounded bg-[#111827] border border-[#1e293b] text-[10px]">
            TOTAL_MATCHES: <strong className="text-blue-400 font-bold">{totalResults}</strong>
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-[11px] font-mono text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-[#111827] border border-rose-900/40 hover:bg-rose-950/30 transition"
              title="Limpiar todos los filtros"
            >
              <X size={11} />
              <span>RESET_FILTERS</span>
            </button>
          )}
        </div>

      </div>

      {/* Middle row: Quick filter chips (All, This Week, This Month, Obstacles, Images) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1e293b] text-xs">
        <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider mr-1">Quick_Filters:</span>
        
        <button
          onClick={() => onFilterOptionChange('all')}
          className={`px-2.5 py-1 rounded text-[10px] font-mono transition uppercase ${
            filterOption === 'all'
              ? 'bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.4)]'
              : 'bg-[#111827] border border-[#1e293b] text-slate-400 hover:border-blue-500 hover:text-slate-200'
          }`}
        >
          All_History
        </button>

        <button
          onClick={() => onFilterOptionChange('week')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition uppercase ${
            filterOption === 'week'
              ? 'bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.4)]'
              : 'bg-[#111827] border border-[#1e293b] text-slate-400 hover:border-blue-500 hover:text-slate-200'
          }`}
        >
          <Calendar size={11} />
          <span>Last_7_Days</span>
        </button>

        <button
          onClick={() => onFilterOptionChange('month')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition uppercase ${
            filterOption === 'month'
              ? 'bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.4)]'
              : 'bg-[#111827] border border-[#1e293b] text-slate-400 hover:border-blue-500 hover:text-slate-200'
          }`}
        >
          <span>Last_30_Days</span>
        </button>

        <button
          onClick={() => onFilterOptionChange('obstacles')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition uppercase ${
            filterOption === 'obstacles'
              ? 'bg-amber-600 text-white font-bold shadow-[0_0_8px_rgba(217,119,6,0.4)]'
              : 'bg-[#111827] border border-[#1e293b] text-slate-400 hover:border-amber-500 hover:text-slate-200'
          }`}
        >
          <AlertCircle size={11} className="text-amber-400" />
          <span>With_Blockers</span>
        </button>

        <button
          onClick={() => onFilterOptionChange('images')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition uppercase ${
            filterOption === 'images'
              ? 'bg-cyan-600 text-white font-bold shadow-[0_0_8px_rgba(8,145,178,0.4)]'
              : 'bg-[#111827] border border-[#1e293b] text-slate-400 hover:border-cyan-500 hover:text-slate-200'
          }`}
        >
          <ImageIcon size={11} className="text-cyan-400" />
          <span>With_Screenshots</span>
        </button>
      </div>

      {/* Bottom row: Tag pills */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px] uppercase tracking-wider mr-1">
            <Tag size={11} />
            <span>Tags:</span>
          </div>
          {availableTags.slice(0, 14).map(({ tag, count }) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => onTagSelect(isSelected ? null : tag)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#111827] border border-blue-500/80 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                    : 'bg-[#111827] border border-[#1e293b] text-slate-300 hover:border-blue-500/50 hover:text-blue-300'
                }`}
              >
                <span>#{tag}</span>
                <span className="text-[9px] opacity-60 ml-1 text-slate-500">
                  [{count}]
                </span>
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
};
