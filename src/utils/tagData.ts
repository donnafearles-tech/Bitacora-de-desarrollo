export interface TagCategory {
  category: string;
  icon: string;
  tags: string[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    category: 'Backend & APIs',
    icon: '💻',
    tags: ['python', 'fastapi', 'nodejs', 'typescript', 'express', 'django', 'flask', 'graphql', 'rest-api', 'auth', 'jwt', 'golang', 'rust'],
  },
  {
    category: 'Frontend & UI',
    icon: '🎨',
    tags: ['react', 'nextjs', 'vue', 'tailwind', 'typescript', 'vite', 'redux', 'zustand', 'css', 'ui-ux', 'responsive'],
  },
  {
    category: 'Bases de Datos',
    icon: '🗄️',
    tags: ['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'prisma', 'drizzle', 'sql', 'query-optimization'],
  },
  {
    category: 'DevOps & Cloud',
    icon: '⚙️',
    tags: ['docker', 'kubernetes', 'github-actions', 'ci-cd', 'aws', 'gcp', 'nginx', 'linux', 'deploy', 'terraform'],
  },
  {
    category: 'Mantenimiento & Calidad',
    icon: '🐛',
    tags: ['bug', 'hotfix', 'refactor', 'testing', 'unit-tests', 'jest', 'pytest', 'performance', 'security', 'logging'],
  },
  {
    category: 'IA & Machine Learning',
    icon: '🤖',
    tags: ['gemini', 'kimi', 'openai', 'llm', 'langchain', 'ai-agent', 'embeddings', 'rag', 'prompts'],
  },
];

// Related tags dictionary mapping a tag to its natural complements
export const RELATED_TAGS_MAP: Record<string, string[]> = {
  python: ['fastapi', 'django', 'pytest', 'postgresql', 'docker'],
  fastapi: ['python', 'pydantic', 'sqlalchemy', 'jwt', 'docker', 'rest-api'],
  django: ['python', 'postgresql', 'rest-framework', 'auth', 'orm'],
  react: ['typescript', 'tailwind', 'vite', 'nextjs', 'zustand', 'redux'],
  nextjs: ['react', 'typescript', 'tailwind', 'vercel', 'ssr'],
  nodejs: ['typescript', 'express', 'postgresql', 'mongodb', 'docker'],
  typescript: ['react', 'nodejs', 'tailwind', 'vite', 'graphql'],
  docker: ['kubernetes', 'ci-cd', 'github-actions', 'compose', 'linux'],
  postgresql: ['sql', 'prisma', 'drizzle', 'database', 'performance'],
  bug: ['hotfix', 'debugging', 'testing', 'refactor', 'logs'],
  auth: ['jwt', 'oauth', 'security', 'session', 'middleware'],
  redis: ['cache', 'performance', 'websocket', 'queues'],
};

/**
 * Given the currently selected tags and the existing database tags,
 * return smart suggested complementary tags.
 */
export function getSmartRelatedTags(
  currentTags: string[],
  frequentTags: { tag: string; count: number }[]
): string[] {
  const suggestions = new Set<string>();

  // 1. Add related tags based on current tags
  currentTags.forEach(tag => {
    const clean = tag.toLowerCase().trim();
    const related = RELATED_TAGS_MAP[clean];
    if (related) {
      related.forEach(r => {
        if (!currentTags.includes(r)) {
          suggestions.add(r);
        }
      });
    }
  });

  // 2. Add top frequent tags from user history if not already selected
  frequentTags.slice(0, 10).forEach(item => {
    const clean = item.tag.toLowerCase().trim();
    if (!currentTags.includes(clean)) {
      suggestions.add(clean);
    }
  });

  return Array.from(suggestions).slice(0, 12);
}
