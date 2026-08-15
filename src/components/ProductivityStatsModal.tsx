import React from 'react';
import {
  X,
  Flame,
  Clock,
  Calendar,
  BarChart2,
  TrendingUp,
  Zap,
  Tag,
  Activity,
  Award,
} from 'lucide-react';
import { ProductivityStats } from '../types';

interface ProductivityStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ProductivityStats | null;
}

export const ProductivityStatsModal: React.FC<ProductivityStatsModalProps> = ({
  isOpen,
  onClose,
  stats,
}) => {
  if (!isOpen || !stats) return null;

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const shortDayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Find peak day
  let peakDayIndex = 1;
  let maxDayCount = 0;
  Object.entries(stats.daysOfWeek).forEach(([d, countVal]) => {
    const count = Number(countVal) || 0;
    if (count > maxDayCount) {
      maxDayCount = count;
      peakDayIndex = Number(d);
    }
  });

  // Find peak hour
  let peakHour = 14;
  let maxHourCount = 0;
  Object.entries(stats.hoursOfDay).forEach(([h, countVal]) => {
    const count = Number(countVal) || 0;
    if (count > maxHourCount) {
      maxHourCount = count;
      peakHour = Number(h);
    }
  });

  // Generate GitHub style calendar heatmap for last 12 weeks
  const today = new Date();
  const weeks: { dateStr: string; count: number; dayOfWeek: number }[][] = [];
  let currentWeek: { dateStr: string; count: number; dayOfWeek: number }[] = [];

  // 12 weeks * 7 days = 84 days back
  const startDate = new Date();
  startDate.setDate(today.getDate() - 83);

  // Align to Sunday
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1);
  }

  const iter = new Date(startDate);
  while (iter <= today || currentWeek.length > 0) {
    const dateStr = iter.toISOString().split('T')[0];
    const count = stats.dateMap[dateStr] || 0;
    currentWeek.push({ dateStr, count, dayOfWeek: iter.getDay() });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
      if (iter > today) break;
    }
    iter.setDate(iter.getDate() + 1);
  }

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-[#111827] border border-[#1e293b]/60';
    if (count === 1) return 'bg-blue-950/80 border border-blue-800 text-white';
    if (count === 2) return 'bg-blue-600 border border-blue-400 text-white';
    return 'bg-blue-400 border border-white text-[#05060a] font-bold shadow-[0_0_6px_#38bdf8]';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#05060a]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 bg-[#0a0c14] border border-[#1e293b] rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1e293b] bg-[#05060a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center shadow-[0_0_8px_#2563eb]">
              <Activity size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                // TELEMETRY_METRICS_DASHBOARD
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                ENGINEERING VELOCITY, PEAK FOCUS CYCLES & HEATMAP
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

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            
            <div className="p-3.5 rounded bg-[#111827] border border-[#1e293b]">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                <span>STREAK_ACTIVE</span>
                <Flame size={14} className="text-amber-400 animate-bounce" />
              </div>
              <div className="text-2xl font-black text-amber-400">
                {stats.currentStreak} <span className="text-xs font-normal text-slate-400">DAYS</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                ALL_TIME_MAX: {stats.longestStreak} DAYS
              </div>
            </div>

            <div className="p-3.5 rounded bg-[#111827] border border-[#1e293b]">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                <span>TOTAL_HOURS</span>
                <Clock size={14} className="text-blue-400" />
              </div>
              <div className="text-2xl font-black text-blue-400">
                {stats.totalHours} <span className="text-xs font-normal text-slate-400">HRS</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                ~{(stats.totalHours / Math.max(1, stats.totalEntries)).toFixed(1)}H / SESSION
              </div>
            </div>

            <div className="p-3.5 rounded bg-[#111827] border border-[#1e293b]">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                <span>PEAK_DAY</span>
                <Calendar size={14} className="text-emerald-400" />
              </div>
              <div className="text-base font-bold text-emerald-400 truncate">
                {dayNames[peakDayIndex].toUpperCase()}
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                {maxDayCount} SESSIONS COMMITTED
              </div>
            </div>

            <div className="p-3.5 rounded bg-[#111827] border border-[#1e293b]">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                <span>PEAK_HOUR</span>
                <Zap size={14} className="text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-400">
                {peakHour.toString().padStart(2, '0')}:00
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                HIGH_FLOW_WINDOW
              </div>
            </div>

          </div>

          {/* Section 1: Días Más Productivos (Bar Chart) */}
          <div className="p-4 rounded bg-[#111827] border border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 size={15} className="text-blue-400" />
                  <span>// WEEKLY_DISTRIBUTION_HISTOGRAM</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  LOGS RECORDED BY DAY OF WEEK
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#05060a] text-blue-400 border border-blue-500/40">
                PEAK: {dayNames[peakDayIndex].toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2">
              {[0, 1, 2, 3, 4, 5, 6].map(dayNum => {
                const count = stats.daysOfWeek[dayNum] || 0;
                const maxVal = Math.max(1, ...Object.values(stats.daysOfWeek).map(v => Number(v) || 0));
                const heightPct = Math.max(12, Math.round((count / maxVal) * 100));
                const isPeak = dayNum === peakDayIndex && count > 0;

                return (
                  <div key={dayNum} className="flex flex-col items-center gap-1.5">
                    <div className="h-28 w-full bg-[#05060a] border border-[#1e293b] rounded flex items-end p-1 relative group">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded transition-all duration-500 flex items-center justify-center text-[10px] font-mono font-bold ${
                          isPeak
                            ? 'bg-blue-500 text-white shadow-[0_0_10px_#3b82f6]'
                            : count > 0
                            ? 'bg-blue-700/80 hover:bg-blue-600 text-white'
                            : 'bg-transparent text-transparent'
                        }`}
                      >
                        {count > 0 && count}
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#05060a] border border-[#1e293b] text-[10px] text-slate-200 px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap font-mono">
                        {dayNames[dayNum]}: {count} logs
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        isPeak ? 'text-blue-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {shortDayNames[dayNum]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Horas Más Productivas (24h Timeline Chart) */}
          <div className="p-4 rounded bg-[#111827] border border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-purple-400" />
                  <span>// 24H_CHRONO_TIMELINE (00:00 - 23:00)</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  ACTIVITY INTENSITY ACROSS 24-HOUR CLOCK CYCLES
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#05060a] text-purple-400 border border-purple-500/40">
                PEAK: {peakHour}:00 HRS
              </span>
            </div>

            <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 pt-2">
              {Array.from({ length: 24 }, (_, h) => {
                const count = stats.hoursOfDay[h] || 0;
                const maxVal = Math.max(1, ...Object.values(stats.hoursOfDay).map(v => Number(v) || 0));
                const heightPct = Math.max(10, Math.round((count / maxVal) * 100));
                const isPeak = h === peakHour && count > 0;

                return (
                  <div key={h} className="flex flex-col items-center gap-1">
                    <div className="h-20 w-full bg-[#05060a] border border-[#1e293b] rounded flex items-end p-0.5 relative group">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded transition-all duration-300 ${
                          isPeak
                            ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
                            : count > 0
                            ? 'bg-purple-600/80 hover:bg-purple-500'
                            : 'bg-transparent'
                        }`}
                      />
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#05060a] border border-[#1e293b] text-[9px] text-slate-200 px-1 py-0.5 rounded shadow z-10 whitespace-nowrap font-mono">
                        {h}:00 - {count} logs
                      </div>
                    </div>
                    {h % 3 === 0 && (
                      <span className="text-[9px] font-mono text-slate-500">{h}h</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: GitHub Style Heatmap */}
          <div className="p-4 rounded bg-[#111827] border border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Award size={15} className="text-emerald-400" />
                  <span>// COMMIT_HEATMAP (LAST 12 WEEKS)</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  ENGINEERING FREQUENCY MATRIX
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                <span>LESS</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-[#111827] border border-[#1e293b]" />
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-950 border border-blue-800" />
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 border border-blue-400" />
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 border border-white" />
                <span>MORE</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="flex gap-1.5 min-w-max">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1.5">
                    {week.map(day => (
                      <div
                        key={day.dateStr}
                        className={`w-3.5 h-3.5 rounded-sm ${getHeatmapColor(
                          day.count
                        )} transition hover:ring-1 hover:ring-white`}
                        title={`${day.dateStr}: ${day.count} registro(s)`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Top Tech Tags */}
          {stats.topTags.length > 0 && (
            <div className="p-4 rounded bg-[#111827] border border-[#1e293b] space-y-3">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={15} className="text-blue-400" />
                <span>// STACK_FREQUENCY_BREAKDOWN</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stats.topTags.slice(0, 8).map(t => {
                  const maxTagCount = stats.topTags[0]?.count || 1;
                  const pct = Math.round((t.count / maxTagCount) * 100);

                  return (
                    <div
                      key={t.tag}
                      className="p-2.5 rounded bg-[#05060a] border border-[#1e293b] flex items-center justify-between gap-3"
                    >
                      <span className="text-xs font-mono text-blue-300 font-bold">
                        #{t.tag}
                      </span>
                      <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                        <div className="h-1.5 w-full bg-[#111827] rounded-full overflow-hidden border border-[#1e293b]">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
                          {t.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
            DISMISS_VIEW
          </button>
        </div>

      </div>
    </div>
  );
};
