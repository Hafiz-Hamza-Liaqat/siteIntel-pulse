/**
 * SiteIntel Pulse — Bot Policy Matrix & Crawler Access Governance
 *
 * Distinctly classifies crawlers into three functional tiers:
 * 1. Search and retrieval crawlers: Allowed on public indexable pages.
 * 2. User-initiated fetch agents: Allowed on public pages to retrieve user-requested links.
 * 3. Model-training crawlers: Governed by explicit configuration (ALLOW_AI_MODEL_TRAINING).
 *
 * Does not conflate search visibility with AI model training.
 * Restricts unnecessary API crawling without using robots.txt as an authentication boundary.
 */

export interface BotDefinition {
  userAgent: string;
  category: 'search' | 'user_fetch' | 'training';
  publisher: string;
  purpose: string;
  defaultAllowed: boolean;
}

export const BOT_POLICY_MATRIX: BotDefinition[] = [
  // Tier 1: Search and Retrieval Crawlers (Public Indexing)
  {
    userAgent: 'Googlebot',
    category: 'search',
    publisher: 'Google',
    purpose: 'Discovers and indexes public web pages for Google Search results.',
    defaultAllowed: true,
  },
  {
    userAgent: 'bingbot',
    category: 'search',
    publisher: 'Microsoft',
    purpose: 'Discovers and indexes public web pages for Bing and Copilot search results.',
    defaultAllowed: true,
  },
  {
    userAgent: 'Applebot',
    category: 'search',
    publisher: 'Apple',
    purpose: 'Retrieves public content for Siri, Spotlight, and Safari search suggestions.',
    defaultAllowed: true,
  },
  {
    userAgent: 'OAI-SearchBot',
    category: 'search',
    publisher: 'OpenAI',
    purpose: 'Retrieves public content exclusively for ChatGPT Search indexation and live results.',
    defaultAllowed: true,
  },
  {
    userAgent: 'Claude-SearchBot',
    category: 'search',
    publisher: 'Anthropic',
    purpose: 'Retrieves public content for Claude search and citations.',
    defaultAllowed: true,
  },
  {
    userAgent: 'PerplexityBot',
    category: 'search',
    publisher: 'Perplexity',
    purpose: 'Indexes public content to synthesize answers and cite authoritative sources.',
    defaultAllowed: true,
  },

  // Tier 2: User-Initiated Fetch Agents (On-Demand User Retrieval)
  {
    userAgent: 'ChatGPT-User',
    category: 'user_fetch',
    publisher: 'OpenAI',
    purpose: 'Fetches public links directly requested by a user during a ChatGPT session.',
    defaultAllowed: true,
  },
  {
    userAgent: 'Claude-User',
    category: 'user_fetch',
    publisher: 'Anthropic',
    purpose: 'Fetches public links directly provided by a user during a Claude conversation.',
    defaultAllowed: true,
  },
  {
    userAgent: 'Perplexity-User',
    category: 'user_fetch',
    publisher: 'Perplexity',
    purpose: 'Fetches public URLs specifically queried by a user in Perplexity.',
    defaultAllowed: true,
  },

  // Tier 3: Model-Training Crawlers (Offline Dataset Scraping)
  {
    userAgent: 'GPTBot',
    category: 'training',
    publisher: 'OpenAI',
    purpose: 'Scrapes web content to train future OpenAI foundation models.',
    defaultAllowed: false,
  },
  {
    userAgent: 'ClaudeBot',
    category: 'training',
    publisher: 'Anthropic',
    purpose: 'Scrapes web content to train future Anthropic foundation models.',
    defaultAllowed: false,
  },
  {
    userAgent: 'Google-Extended',
    category: 'training',
    publisher: 'Google',
    purpose: 'Scrapes web content to train Google Gemini and Vertex AI foundation models.',
    defaultAllowed: false,
  },
  {
    userAgent: 'Applebot-Extended',
    category: 'training',
    publisher: 'Apple',
    purpose: 'Scrapes web content for Apple Intelligence foundation model training.',
    defaultAllowed: false,
  },
];

/**
 * Checks whether model-training crawlers are explicitly permitted via environment.
 * Default is false (disallowed), ensuring explicit consent rather than accidental scraping.
 */
export function isAiModelTrainingAllowed(): boolean {
  return process.env.ALLOW_AI_MODEL_TRAINING === 'true';
}

/**
 * Standard paths disallowed from crawler traffic.
 * Note: /owner-report, /expert-audit, and /login are intentionally omitted from robots disallows
 * so search engines can read their <meta name="robots" content="noindex, nofollow"> directive.
 * API routes are disallowed to eliminate wasteful crawler bandwidth.
 */
export const ROBOTS_DISALLOWED_PATHS = ['/api/'];
