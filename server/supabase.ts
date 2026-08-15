import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LogEntry } from '../src/types';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfig(): {
  isConfigured: boolean;
  url?: string;
  jwksUrl?: string;
  hasKey: boolean;
} {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  const jwksUrl =
    process.env.SUPABASE_JWKS_URL ||
    (url ? `${url.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json` : undefined);

  return {
    isConfigured: Boolean(url && key),
    url: url || undefined,
    jwksUrl: jwksUrl || undefined,
    hasKey: Boolean(key),
  };
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key) {
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
  return {
    id: row.id,
    date: row.date,
    summary: row.summary || '',
    project: row.project || 'General',
    activities: row.activities || '',
    obstacles: row.obstacles || '',
    solutions: row.solutions || '',
    plan: row.plan || '',
    tags: Array.isArray(row.tags) ? row.tags : typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : [],
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
