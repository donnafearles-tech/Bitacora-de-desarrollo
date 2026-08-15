import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LogEntry } from '../src/types';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseEnv() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    '';

  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_API_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  const jwksUrl =
    process.env.SUPABASE_JWKS_URL ||
    (url ? `${url.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json` : undefined);

  return {
    url: url.trim(),
    key: key.trim(),
    jwksUrl,
    isConfigured: Boolean(url.trim() && key.trim()),
  };
}

export function getSupabaseConfig(): {
  isConfigured: boolean;
  url?: string;
  jwksUrl?: string;
  hasKey: boolean;
  maskedUrl?: string;
  maskedKey?: string;
} {
  const { url, key, jwksUrl, isConfigured } = getSupabaseEnv();

  const maskedUrl = url ? url.replace(/^(https?:\/\/[a-z0-9]{4})[a-z0-9]+(\..+)$/i, '$1****$2') : undefined;
  const maskedKey = key ? `${key.slice(0, 6)}...${key.slice(-4)}` : undefined;

  return {
    isConfigured,
    url: url || undefined,
    jwksUrl: jwksUrl || undefined,
    hasKey: Boolean(key),
    maskedUrl,
    maskedKey,
  };
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const { url, key, isConfigured } = getSupabaseEnv();

  if (isConfigured) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      return supabaseClient;
    } catch (err) {
      console.error('Error initializing Supabase client:', err);
      return null;
    }
  }

  return null;
}

// Convert Supabase database row to LogEntry
export function rowToEntry(row: any): LogEntry {
  let parsedTags: string[] = [];
  if (Array.isArray(row.tags)) {
    parsedTags = row.tags;
  } else if (typeof row.tags === 'string') {
    try {
      parsedTags = JSON.parse(row.tags);
    } catch {
      parsedTags = row.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
  }

  let parsedTagDescriptions: Record<string, string> | undefined = undefined;
  if (row.tag_descriptions || row.tagDescriptions) {
    const raw = row.tag_descriptions || row.tagDescriptions;
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      parsedTagDescriptions = raw;
    } else if (typeof raw === 'string') {
      try {
        parsedTagDescriptions = JSON.parse(raw);
      } catch {
        // ignore
      }
    }
  }

  return {
    id: row.id || `entry-${row.date}`,
    date: row.date,
    summary: row.summary || '',
    project: row.project || 'General',
    activities: row.activities || '',
    obstacles: row.obstacles || '',
    solutions: row.solutions || '',
    plan: row.plan || '',
    tags: parsedTags,
    tagDescriptions: parsedTagDescriptions,
    image: row.image || undefined,
    timeSpentHours: Number(row.time_spent_hours ?? row.timeSpentHours ?? 4),
    mood: row.mood || 'productive',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Convert LogEntry to Supabase database row
export function entryToRow(entry: Partial<LogEntry> & { date: string; summary: string }): any {
  return {
    id: entry.id,
    date: entry.date,
    summary: entry.summary,
    project: entry.project || 'General',
    activities: entry.activities || '',
    obstacles: entry.obstacles || '',
    solutions: entry.solutions || '',
    plan: entry.plan || '',
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    image: entry.image || null,
    time_spent_hours: entry.timeSpentHours ?? 4,
    mood: entry.mood || 'productive',
    created_at: entry.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Candidate table names in case the user named it differently in Supabase
export const POSSIBLE_TABLE_NAMES = [
  'devlog_entries',
  'bitacora_entries',
  'bitacora_logs',
  'bitacora',
  'entries',
  'logs',
  'dev_logs',
];
