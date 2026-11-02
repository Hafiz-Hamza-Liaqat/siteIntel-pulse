/**
 * SiteIntel Pulse — Centralized SEO & Canonical Site Configuration
 *
 * Governs canonical origin resolution, metadata generation, public route inventories,
 * and search/AI crawler access boundaries.
 */

export interface PublicRouteConfig {
  path: string;
  title: string;
  description: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  lastModified: string;
}

/**
 * P0 Public canonical indexable routes.
 * Excludes private report workbench, authentication pages, API endpoints, and staging URLs.
 * Content dates correspond to actual verified release dates; timestamps are not fabricated.
 */
export const P0_PUBLIC_ROUTES: PublicRouteConfig[] = [
  {
    path: '/',
    title: 'SiteIntel Pulse — Website Intelligence & Growth Audit Platform',
    description:
      'Evidence-based website health, SEO, performance, security, and growth intelligence platform for platform owners.',
    changeFrequency: 'weekly',
    priority: 1.0,
    lastModified: '2026-10-29T00:00:00.000Z',
  },
  {
    path: '/about',
    title: 'About SiteIntel Pulse — Evidence-Driven Website Auditing',
    description:
      'Learn about SiteIntel Pulse, our dual-audience reporting architecture, our 56-rule audit catalogue, and our commitment to honest, evidence-linked findings.',
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: '2026-10-29T00:00:00.000Z',
  },
  {
    path: '/contact',
    title: 'Contact Us — SiteIntel Pulse Support & Communication',
    description:
      'Reach the SiteIntel Pulse team for platform inquiries, support, bug reports, and technical assistance.',
    changeFrequency: 'monthly',
    priority: 0.7,
    lastModified: '2026-10-29T00:00:00.000Z',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy — SiteIntel Pulse',
    description:
      'Truthful disclosure of data collection, passive scan processing, retention policies, isolated guest sessions, and cookies for SiteIntel Pulse.',
    changeFrequency: 'monthly',
    priority: 0.5,
    lastModified: '2026-10-29T00:00:00.000Z',
  },
  {
    path: '/terms',
    title: 'Terms of Service — SiteIntel Pulse',
    description:
      'Terms of service, audit scope, user responsibilities, and service boundaries for the SiteIntel Pulse website intelligence platform.',
    changeFrequency: 'monthly',
    priority: 0.5,
    lastModified: '2026-10-29T00:00:00.000Z',
  },
  {
    path: '/disclaimer',
    title: 'Methodology & Service Disclaimer — SiteIntel Pulse',
    description:
      'Important disclaimers regarding automated scan limitations, non-guarantee of search rankings or financial outcomes, and non-evaluated check disclosures.',
    changeFrequency: 'monthly',
    priority: 0.5,
    lastModified: '2026-10-29T00:00:00.000Z',
  },
];

/**
 * Checks whether an explicit, valid production origin is configured via environment variables.
 */
export function isProductionDomainConfigured(): boolean {
  const raw = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw || raw.trim() === '') return false;
  try {
    const url = new URL(raw.trim());
    const isLocal =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1' ||
      url.hostname.endsWith('.local');
    return !isLocal && (url.protocol === 'https:' || url.protocol === 'http:');
  } catch {
    return false;
  }
}

/**
 * Resolves the canonical site origin.
 *
 * Rules:
 * 1. Read from explicit environment variable `SITE_URL` (or `NEXT_PUBLIC_SITE_URL`).
 * 2. In local development / test, falls back to `http://localhost:3000`.
 * 3. In production (`NODE_ENV === 'production'`), NEVER silently emit localhost or a fabricated domain.
 *    Throws an explicit error if missing or if set to localhost.
 */
export function getSiteOrigin(): string {
  const raw = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const isProd = process.env.NODE_ENV === 'production';

  if (raw && raw.trim() !== '') {
    const trimmed = raw.trim().replace(/\/+$/, '');
    try {
      const url = new URL(trimmed);
      const isLocal =
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '::1' ||
        url.hostname.endsWith('.local');

      if (isProd && isLocal) {
        throw new Error(
          `[SEO Config] Production canonical origin cannot be localhost ("${trimmed}"). ` +
            'Set SITE_URL to the verified production HTTPS canonical origin.'
        );
      }
      return trimmed;
    } catch (err: any) {
      if (err.message.includes('[SEO Config]')) throw err;
      throw new Error(`[SEO Config] Invalid URL provided in SITE_URL: "${raw}"`);
    }
  }

  if (isProd) {
    throw new Error(
      '[SEO Config] Missing production domain configuration. Set the SITE_URL environment variable ' +
        'to the verified production canonical origin. Production must never emit localhost or a fabricated domain.'
    );
  }

  return 'http://localhost:3000';
}

/**
 * Resolves canonical URL for a given route path.
 */
export function getCanonicalUrl(path: string = '/'): string {
  const origin = getSiteOrigin();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

/**
 * Returns a URL object for Next.js metadataBase, or undefined if unconfigured in production.
 */
export function getMetadataBase(): URL | undefined {
  try {
    return new URL(getSiteOrigin());
  } catch {
    return undefined;
  }
}

export const siteConfig = {
  name: 'SiteIntel Pulse',
  titleTemplate: '%s | SiteIntel Pulse',
  defaultTitle: 'SiteIntel Pulse — Website Intelligence & Growth Audit Platform',
  description:
    'Evidence-based website health, SEO, performance, security, and growth intelligence platform for platform owners.',
  tagline: 'Understand your website. Find what to fix. Grow with confidence.',
  links: {
    github: 'https://github.com/siteintel-pulse',
  },
  headerNav: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Owner Report', href: '/owner-report' },
    { label: 'Expert Audit', href: '/expert-audit' },
  ],
  footerNav: {
    product: [
      { label: 'Free Website Audit', href: '/' },
      { label: 'Website Owner Report', href: '/owner-report' },
      { label: 'Expert Diagnostic Workbench', href: '/expert-audit' },
    ],
    company: [
      { label: 'About SiteIntel Pulse', href: '/about' },
      { label: 'Contact Us', href: '/contact' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Methodology & Disclaimer', href: '/disclaimer' },
    ],
  },
};
