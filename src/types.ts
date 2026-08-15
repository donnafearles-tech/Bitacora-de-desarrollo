export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  summary: string;
  project?: string;
  activities: string;
  obstacles: string;
  solutions: string;
  plan: string;
  tags: string[];
  image?: string; // base64 or url
  timeSpentHours: number;
  mood?: 'flow' | 'productive' | 'blocked' | 'learning' | 'refactor';
  created_at: string; // ISO string
  updated_at?: string;
}

export interface ProductivityStats {
  totalEntries: number;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  daysOfWeek: { [key: number]: number }; // 0 = Sun, 1 = Mon ...
  hoursOfDay: { [key: number]: number }; // 0 to 23
  topTags: { tag: string; count: number }[];
  topProjects: { project: string; count: number }[];
  dateMap: { [date: string]: number }; // for calendar heatmap
}

export interface AISummaryRequest {
  period?: 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  provider?: 'gemini' | 'moonshot' | 'custom';
  customApiKey?: string;
}

export interface AISummaryResponse {
  summary: string;
  traction: string[];
  blockers: string[];
  recommendations: string[];
  statsHeadline?: string;
  generatedAt: string;
}

export interface AISolveErrorRequest {
  errorText: string;
  context?: string;
  language?: string;
}

export interface AISolveErrorResponse {
  diagnosis: string;
  solutionCode?: string;
  explanation: string;
  bestPractices: string[];
}
