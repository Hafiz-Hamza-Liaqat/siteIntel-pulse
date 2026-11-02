# SiteIntel Pulse — Bot Policy Matrix & Crawler Governance

**Version:** 1.0  
**Effective Date:** 29 October 2026  
**Status:** Implemented in `src/app/robots.ts` and `src/lib/seo/bot-policy.ts`

---

## 1. Governance Architecture

SiteIntel Pulse separates web crawlers into three distinct operational tiers to prevent conflating search visibility with AI training permissions:

1. **Search & Retrieval Crawlers:** Permitted on all public, canonical marketing and educational pages to ensure discoverability across Google, Bing, Copilot, ChatGPT Search, Claude Search, and Perplexity.
2. **User-Initiated Fetch Agents:** Permitted on public pages to allow end-users to share, inspect, and summarize SiteIntel Pulse public pages in real-time conversations.
3. **Model-Training Crawlers:** Subject to an explicit, configurable gate (`ALLOW_AI_MODEL_TRAINING=true|false`). By default, training crawlers are disallowed to prevent offline dataset scraping without explicit publisher consent.

Robots.txt is treated strictly as a crawler traffic coordination mechanism. It is **never** relied upon as a security, privacy, or authorization boundary. Private audits, reports, and tenant accounts are protected by multi-tenant database isolation, session authentication, and server-side authorization guards.

---

## 2. Crawler Policy Matrix

| User-Agent Token | Operator | Purpose Tier | Default Policy | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`*` (Wildcard)** | All legitimate crawlers | Baseline | **Allow public / Disallow `/api/`** | Grants universal access to public indexable routes while restricting unnecessary API traffic. |
| **`Googlebot`** | Google LLC | Search & Retrieval | **Allow** | Crawls public canonical pages for Google Search. |
| **`bingbot`** | Microsoft Corp | Search & Retrieval | **Allow** | Crawls public canonical pages for Bing and Copilot. |
| **`Applebot`** | Apple Inc | Search & Retrieval | **Allow** | Crawls public content for Siri and Safari suggestions. |
| **`OAI-SearchBot`** | OpenAI | Search & Retrieval | **Allow** | Surfaces public SiteIntel Pulse pages in ChatGPT Search results. |
| **`Claude-SearchBot`** | Anthropic | Search & Retrieval | **Allow** | Discovers public pages for Claude search citations. |
| **`PerplexityBot`** | Perplexity AI | Search & Retrieval | **Allow** | Indexes public content for referenced answers. |
| **`ChatGPT-User`** | OpenAI | User-Initiated Fetch | **Allow** | Fetches links when a ChatGPT user pastes a public SiteIntel Pulse URL. |
| **`Claude-User`** | Anthropic | User-Initiated Fetch | **Allow** | Fetches links when a Claude user references a public SiteIntel Pulse URL. |
| **`Perplexity-User`** | Perplexity AI | User-Initiated Fetch | **Allow** | Fetches links when a Perplexity user queries a public SiteIntel Pulse URL. |
| **`GPTBot`** | OpenAI | Model Training | **Configurable (`ALLOW_AI_MODEL_TRAINING`)** | Defaults to Disallow unless explicitly opted in by platform owner. |
| **`ClaudeBot`** | Anthropic | Model Training | **Configurable (`ALLOW_AI_MODEL_TRAINING`)** | Defaults to Disallow unless explicitly opted in by platform owner. |
| **`Google-Extended`** | Google LLC | Model Training | **Configurable (`ALLOW_AI_MODEL_TRAINING`)** | Defaults to Disallow unless explicitly opted in by platform owner. |
| **`Applebot-Extended`** | Apple Inc | Model Training | **Configurable (`ALLOW_AI_MODEL_TRAINING`)** | Defaults to Disallow unless explicitly opted in by platform owner. |

---

## 3. Disallow vs. Noindex Policy for Private Routes

Search engines must be able to crawl a URL to read and respect its `<meta name="robots" content="noindex, nofollow">` tag or `X-Robots-Tag: noindex, nofollow` HTTP response header.

- **Private Application Routes (`/owner-report`, `/expert-audit`, `/login`):**
  These routes are **NOT** disallowed in `robots.txt`. They emit explicit `noindex, nofollow` directives in their HTML metadata and HTTP response headers.
- **API Routes (`/api/*`):**
  Disallowed in `robots.txt` because automated crawlers have no utility crawling internal REST/RPC endpoints. In addition, all sensitive API endpoints return `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store`.
