import fs from 'fs';
import path from 'path';
import { LogEntry, ProductivityStats } from '../src/types';
import { getSupabase, rowToEntry, entryToRow, POSSIBLE_TABLE_NAMES } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bitacora_db.json');

let inMemoryEntries: LogEntry[] = [];
let activeTableName = 'devlog_entries';

// Initialize local fallback storage file
function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryEntries = parsed;
        }
      } catch (e) {
        // preserve
      }
    }
  } catch (err) {
    console.error('Error initializing storage file:', err);
  }
}

function saveStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Only save if we actually have entries or if file doesn't exist
    if (inMemoryEntries.length > 0 || !fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryEntries, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error saving storage file:', err);
  }
}

initStorage();

export const Storage = {
  // Sync all entries with Supabase if available
  async getAllAsync(filter?: {
    q?: string;
    tag?: string;
    project?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LogEntry[]> {
    const supabase = getSupabase();

    if (supabase) {
      // Try activeTableName first, then try possible alternatives if table not found
      const tablesToTry = [activeTableName, ...POSSIBLE_TABLE_NAMES.filter(t => t !== activeTableName)];

      for (const tableName of tablesToTry) {
        try {
          let query = supabase
            .from(tableName)
            .select('*')
            .order('date', { ascending: false });

          if (filter?.project) {
            query = query.eq('project', filter.project);
          }
          if (filter?.startDate) {
            query = query.gte('date', filter.startDate);
          }
          if (filter?.endDate) {
            query = query.lte('date', filter.endDate);
          }

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            activeTableName = tableName;
            const supabaseEntries = data.map(rowToEntry);

            if (supabaseEntries.length > 0) {
              inMemoryEntries = supabaseEntries;
              saveStorage();
            }

            let filtered = supabaseEntries.length > 0 ? supabaseEntries : inMemoryEntries;
            if (filter?.q) {
              const qLower = filter.q.toLowerCase().trim();
              filtered = filtered.filter(e =>
                e.summary.toLowerCase().includes(qLower) ||
                e.activities.toLowerCase().includes(qLower) ||
                (e.obstacles && e.obstacles.toLowerCase().includes(qLower)) ||
                (e.solutions && e.solutions.toLowerCase().includes(qLower)) ||
                (e.plan && e.plan.toLowerCase().includes(qLower)) ||
                (e.project && e.project.toLowerCase().includes(qLower)) ||
                e.tags.some(t => t.toLowerCase().includes(qLower))
              );
            }
            if (filter?.tag) {
              const tagLower = filter.tag.toLowerCase().trim();
              filtered = filtered.filter(e => e.tags.some(t => t.toLowerCase() === tagLower));
            }
            return filtered;
          }
        } catch (err) {
          console.warn(`Supabase query on table '${tableName}' failed:`, err);
        }
      }
    }

    return this.getAll(filter);
  },

  getAll(filter?: { q?: string; tag?: string; project?: string; startDate?: string; endDate?: string }): LogEntry[] {
    let result = [...inMemoryEntries];

    if (filter?.q) {
      const qLower = filter.q.toLowerCase().trim();
      result = result.filter(e =>
        e.summary.toLowerCase().includes(qLower) ||
        e.activities.toLowerCase().includes(qLower) ||
        (e.obstacles && e.obstacles.toLowerCase().includes(qLower)) ||
        (e.solutions && e.solutions.toLowerCase().includes(qLower)) ||
        (e.plan && e.plan.toLowerCase().includes(qLower)) ||
        (e.project && e.project.toLowerCase().includes(qLower)) ||
        e.tags.some(t => t.toLowerCase().includes(qLower))
      );
    }

    if (filter?.tag) {
      const tagLower = filter.tag.toLowerCase().trim();
      result = result.filter(e => e.tags.some(t => t.toLowerCase() === tagLower));
    }

    if (filter?.project) {
      result = result.filter(e => e.project?.toLowerCase() === filter.project?.toLowerCase());
    }

    if (filter?.startDate) {
      result = result.filter(e => e.date >= filter.startDate!);
    }

    if (filter?.endDate) {
      result = result.filter(e => e.date <= filter.endDate!);
    }

    // Sort by date DESC and created_at DESC
    return result.sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  },

  async getByDateAsync(date: string): Promise<LogEntry | undefined> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('devlog_entries')
          .select('*')
          .eq('date', date)
          .maybeSingle();

        if (!error && data) {
          return rowToEntry(data);
        }
      } catch (err) {
        console.warn('Supabase getByDate error:', err);
      }
    }
    return this.getByDate(date);
  },

  getByDate(date: string): LogEntry | undefined {
    return inMemoryEntries.find(e => e.date === date);
  },

  async getByIdAsync(id: string): Promise<LogEntry | undefined> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('devlog_entries')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return rowToEntry(data);
        }
      } catch (err) {
        console.warn('Supabase getById error:', err);
      }
    }
    return this.getById(id);
  },

  getById(id: string): LogEntry | undefined {
    return inMemoryEntries.find(e => e.id === id);
  },

  async upsertAsync(entryData: Partial<LogEntry> & { date: string; summary: string }): Promise<LogEntry> {
    // 1. Update local storage first
    const localEntry = this.upsert(entryData);

    // 2. Persist to Supabase if configured
    const supabase = getSupabase();
    if (supabase) {
      try {
        const row = entryToRow(localEntry);
        const { error } = await supabase
          .from('devlog_entries')
          .upsert(row, { onConflict: 'id' });

        if (error) {
          console.warn('Supabase upsert warning:', error.message);
        }
      } catch (err) {
        console.warn('Supabase upsert error:', err);
      }
    }

    return localEntry;
  },

  upsert(entryData: Partial<LogEntry> & { date: string; summary: string }): LogEntry {
    // Look up ONLY by unique ID when editing
    const existingIndex = entryData.id
      ? inMemoryEntries.findIndex(e => e.id === entryData.id)
      : -1;

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = inMemoryEntries[existingIndex];
      const updated: LogEntry = {
        ...existing,
        ...entryData,
        tags: Array.isArray(entryData.tags)
          ? entryData.tags.map(t => t.trim().toLowerCase()).filter(Boolean)
          : existing.tags,
        updated_at: now,
      };
      inMemoryEntries[existingIndex] = updated;
      saveStorage();
      return updated;
    } else {
      const newEntry: LogEntry = {
        id: entryData.id || `entry-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        date: entryData.date,
        summary: entryData.summary,
        project: entryData.project || 'General',
        activities: entryData.activities || '',
        obstacles: entryData.obstacles || '',
        solutions: entryData.solutions || '',
        plan: entryData.plan || '',
        tags: Array.isArray(entryData.tags)
          ? entryData.tags.map(t => t.trim().toLowerCase()).filter(Boolean)
          : [],
        image: entryData.image,
        timeSpentHours: typeof entryData.timeSpentHours === 'number' ? entryData.timeSpentHours : 4,
        mood: entryData.mood || 'productive',
        created_at: entryData.created_at || now,
        updated_at: now,
      };
      inMemoryEntries.unshift(newEntry);
      saveStorage();
      return newEntry;
    }
  },

  async deleteAsync(idOrDate: string): Promise<boolean> {
    const localResult = this.delete(idOrDate);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('devlog_entries')
          .delete()
          .eq('id', idOrDate);
      } catch (err) {
        console.warn('Supabase delete error:', err);
      }
    }

    return localResult;
  },

  delete(idOrDate: string): boolean {
    const prevLen = inMemoryEntries.length;
    inMemoryEntries = inMemoryEntries.filter(e => e.id !== idOrDate);
    if (inMemoryEntries.length !== prevLen) {
      saveStorage();
      return true;
    }
    return false;
  },

  async restoreAllAsync(entries: LogEntry[]): Promise<boolean> {
    const res = this.restoreAll(entries);
    const supabase = getSupabase();
    if (supabase && Array.isArray(entries)) {
      try {
        const rows = entries.map(entryToRow);
        await supabase.from('devlog_entries').upsert(rows, { onConflict: 'date' });
      } catch (err) {
        console.warn('Supabase restoreAll error:', err);
      }
    }
    return res;
  },

  restoreAll(entries: LogEntry[]): boolean {
    if (Array.isArray(entries)) {
      inMemoryEntries = entries;
      saveStorage();
      return true;
    }
    return false;
  },

  async getStatsAsync(): Promise<ProductivityStats> {
    // Sync entries first if available
    await this.getAllAsync();
    return this.getStats();
  },

  getStats(): ProductivityStats {
    const daysOfWeek: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const hoursOfDay: { [key: number]: number } = {};
    for (let i = 0; i < 24; i++) hoursOfDay[i] = 0;

    const tagCounts: { [tag: string]: number } = {};
    const projectCounts: { [proj: string]: number } = {};
    const dateMap: { [date: string]: number } = {};
    let totalHours = 0;

    const sortedEntries = [...inMemoryEntries].sort((a, b) => a.date.localeCompare(b.date));

    sortedEntries.forEach(entry => {
      // Parse date for Day of week (0=Sun, 1=Mon, ..., 6=Sat)
      const parts = entry.date.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const day = d.getDay();
        daysOfWeek[day] = (daysOfWeek[day] || 0) + 1;
      }

      // Parse timestamp for Hour of day (0..23)
      if (entry.created_at) {
        const createdDate = new Date(entry.created_at);
        const hour = createdDate.getHours();
        if (!isNaN(hour) && hour >= 0 && hour < 24) {
          hoursOfDay[hour] = (hoursOfDay[hour] || 0) + 1;
        } else {
          hoursOfDay[14] = (hoursOfDay[14] || 0) + 1;
        }
      } else {
        hoursOfDay[14] = (hoursOfDay[14] || 0) + 1;
      }

      // Count tags
      entry.tags?.forEach(tag => {
        const t = tag.trim().toLowerCase();
        if (t) tagCounts[t] = (tagCounts[t] || 0) + 1;
      });

      // Count projects
      const proj = entry.project || 'General';
      projectCounts[proj] = (projectCounts[proj] || 0) + 1;

      // Calendar date count
      dateMap[entry.date] = (dateMap[entry.date] || 0) + 1;

      totalHours += Number(entry.timeSpentHours) || 0;
    });

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const uniqueDates = Array.from(new Set(sortedEntries.map(e => e.date))).sort();

    if (uniqueDates.length > 0) {
      for (let i = 0; i < uniqueDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prev = new Date(uniqueDates[i - 1]);
          const curr = new Date(uniqueDates[i]);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            tempStreak += 1;
          } else if (diffDays > 1) {
            tempStreak = 1;
          }
        }
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      }

      // Check current streak relative to today
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const hasToday = uniqueDates.includes(todayStr);
      const hasYesterday = uniqueDates.includes(yesterdayStr);

      if (hasToday || hasYesterday) {
        currentStreak = tempStreak;
      } else {
        currentStreak = 0;
      }
    }

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topProjects = Object.entries(projectCounts)
      .map(([project, count]) => ({ project, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalEntries: inMemoryEntries.length,
      totalHours: Math.round(totalHours * 10) / 10,
      currentStreak,
      longestStreak,
      daysOfWeek,
      hoursOfDay,
      topTags,
      topProjects,
      dateMap,
    };
  },
};
