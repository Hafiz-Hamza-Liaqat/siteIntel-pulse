import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import {
  getSiteOrigin,
  getCanonicalUrl,
  isProductionDomainConfigured,
  P0_PUBLIC_ROUTES,
  siteConfig,
} from './site-config';
import { BOT_POLICY_MATRIX, isAiModelTrainingAllowed } from './bot-policy';
import { metadata as ownerMetadata } from '@/app/owner-report/layout';
import { metadata as expertMetadata } from '@/app/expert-audit/layout';
import { metadata as loginMetadata } from '@/app/login/layout';
import { metadata as rootMetadata } from '@/app/layout';
import { metadata as aboutMetadata } from '@/app/about/page';
import { metadata as contactMetadata } from '@/app/contact/page';
import { metadata as privacyMetadata } from '@/app/privacy/page';
import { metadata as termsMetadata } from '@/app/terms/page';
import { metadata as disclaimerMetadata } from '@/app/disclaimer/page';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
import nextConfig from '../../../next.config.mjs';

describe('P0 SEO Foundation & Search Access Acceptance Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // --------------------------------------------------------------------------
  // TEST 1: Robots.txt Rules & Bot Policy Matrix
  // --------------------------------------------------------------------------
  describe('1. Robots.txt Crawler Access & Bot Matrix', () => {
    it('allows intended search and AI retrieval crawlers on public pages', () => {
      const robotsResult = robots();
      expect(robotsResult.rules).toBeDefined();

      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      // Verify Wildcard crawler rule
      const wildcardRule = rules.find((r) => r.userAgent === '*');
      expect(wildcardRule).toBeDefined();
      expect(wildcardRule?.allow).toBe('/');
      expect(wildcardRule?.disallow).toContain('/api/');

      // Verify key search crawlers are explicitly permitted
      const expectedAllowedSearchBots = [
        'Googlebot',
        'bingbot',
        'Applebot',
        'OAI-SearchBot',
        'Claude-SearchBot',
        'PerplexityBot',
      ];
      for (const bot of expectedAllowedSearchBots) {
        const botRule = rules.find((r) => r.userAgent === bot);
        expect(botRule, `Expected rule for bot: ${bot}`).toBeDefined();
        expect(botRule?.allow).toBe('/');
        expect(botRule?.disallow).toContain('/api/');
      }

      // Verify user-initiated fetch agents are permitted
      const expectedUserFetchBots = ['ChatGPT-User', 'Claude-User', 'Perplexity-User'];
      for (const bot of expectedUserFetchBots) {
        const botRule = rules.find((r) => r.userAgent === bot);
        expect(botRule, `Expected rule for user-fetch bot: ${bot}`).toBeDefined();
        expect(botRule?.allow).toBe('/');
      }
    });

    it('disallows model-training crawlers by default without blocking search crawlers', () => {
      delete process.env.ALLOW_AI_MODEL_TRAINING;
      expect(isAiModelTrainingAllowed()).toBe(false);

      const robotsResult = robots();
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      const trainingBots = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended'];
      for (const bot of trainingBots) {
        const botRule = rules.find((r) => r.userAgent === bot);
        expect(botRule, `Expected rule for training bot: ${bot}`).toBeDefined();
        expect(botRule?.disallow).toBe('/');
      }

      // Verify OAI-SearchBot remains allowed even when GPTBot is disallowed
      const oaiSearchRule = rules.find((r) => r.userAgent === 'OAI-SearchBot');
      expect(oaiSearchRule?.allow).toBe('/');
    });

    it('allows model-training crawlers when ALLOW_AI_MODEL_TRAINING is explicitly true', () => {
      process.env.ALLOW_AI_MODEL_TRAINING = 'true';
      expect(isAiModelTrainingAllowed()).toBe(true);

      const robotsResult = robots();
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      const gptBotRule = rules.find((r) => r.userAgent === 'GPTBot');
      expect(gptBotRule?.allow).toBe('/');
      expect(gptBotRule?.disallow).toContain('/api/');
    });

    it('never disallows private routes in robots.txt so noindex tags can be read', () => {
      const robotsResult = robots();
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      for (const rule of rules) {
        const disallows = Array.isArray(rule.disallow)
          ? rule.disallow
          : [rule.disallow].filter(Boolean);

        expect(disallows).not.toContain('/owner-report');
        expect(disallows).not.toContain('/expert-audit');
        expect(disallows).not.toContain('/login');
      }
    });
  });

  // --------------------------------------------------------------------------
  // TEST 2 & 3: Route Protection, Authorization & Noindex Behavior
  // --------------------------------------------------------------------------
  describe('2 & 3. Route Protection, Cache-Control & Noindex Directives', () => {
    it('marks private page layouts with robots: noindex, nofollow', () => {
      expect(ownerMetadata.robots).toEqual(
        expect.objectContaining({ index: false, follow: false })
      );
      expect(expertMetadata.robots).toEqual(
        expect.objectContaining({ index: false, follow: false })
      );
      expect(loginMetadata.robots).toEqual(
        expect.objectContaining({ index: false, follow: false })
      );
    });

    it('enforces X-Robots-Tag: noindex, nofollow via middleware on private routes', () => {
      const privatePaths = [
        'http://localhost:3000/owner-report',
        'http://localhost:3000/expert-audit',
        'http://localhost:3000/login',
        'http://localhost:3000/api/scan/report',
      ];

      for (const url of privatePaths) {
        const req = new NextRequest(new URL(url));
        const res = middleware(req);
        expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
      }
    });

    it('attaches Cache-Control: private, no-store to sensitive API responses via middleware', () => {
      const req = new NextRequest(new URL('http://localhost:3000/api/scan/report?id=123'));
      const res = middleware(req);
      const cacheControl = res.headers.get('Cache-Control');
      expect(cacheControl).toContain('private');
      expect(cacheControl).toContain('no-store');
    });

    it('protects staging environments by enforcing universal noindex across all routes', () => {
      process.env.STAGING = 'true';
      const req = new NextRequest(new URL('http://localhost:3000/about'));
      const res = middleware(req);
      expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
    });

    it('allows public routes to be crawled without noindex header in normal mode', () => {
      delete process.env.STAGING;
      const req = new NextRequest(new URL('http://localhost:3000/about'));
      const res = middleware(req);
      expect(res.headers.get('X-Robots-Tag')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // TEST 4: Sitemap Validity & Route Canonicalization
  // --------------------------------------------------------------------------
  describe('4. Sitemap Generation & Canonical Indexable Routes', () => {
    it('generates canonical sitemap containing only intended P0 public URLs', () => {
      process.env.SITE_URL = 'https://audit.verified-domain.com';
      const map = sitemap();

      expect(map.length).toBe(P0_PUBLIC_ROUTES.length);

      const urls = map.map((entry) => entry.url);
      expect(urls).toContain('https://audit.verified-domain.com/');
      expect(urls).toContain('https://audit.verified-domain.com/about');
      expect(urls).toContain('https://audit.verified-domain.com/contact');
      expect(urls).toContain('https://audit.verified-domain.com/privacy');
      expect(urls).toContain('https://audit.verified-domain.com/terms');
      expect(urls).toContain('https://audit.verified-domain.com/disclaimer');

      // Excludes private and internal routes
      for (const u of urls) {
        expect(u).not.toContain('/owner-report');
        expect(u).not.toContain('/expert-audit');
        expect(u).not.toContain('/login');
        expect(u).not.toContain('/api/');
        expect(u).not.toContain('?');
      }

      // Valid real lastModified dates
      for (const entry of map) {
        expect(entry.lastModified instanceof Date).toBe(true);
        const dateObj = entry.lastModified as Date;
        expect(isNaN(dateObj.getTime())).toBe(false);
      }
    });
  });

  // --------------------------------------------------------------------------
  // TEST 5 & 6: Public Page Metadata, Crawlability & Truthful Content
  // --------------------------------------------------------------------------
  describe('5 & 6. Public Pages Metadata & Policy Integrity', () => {
    it('configures root layout metadata with metadataBase and title template', () => {
      expect(rootMetadata.title).toEqual(
        expect.objectContaining({
          default: siteConfig.defaultTitle,
          template: siteConfig.titleTemplate,
        })
      );
      expect(rootMetadata.description).toBe(siteConfig.description);
      expect(rootMetadata.robots).toEqual(
        expect.objectContaining({
          index: true,
          follow: true,
        })
      );
    });

    it('ensures each P0 public page exports unique, non-placeholder metadata', () => {
      const pageMetas = [
        { name: 'about', meta: aboutMetadata, canonical: '/about' },
        { name: 'contact', meta: contactMetadata, canonical: '/contact' },
        { name: 'privacy', meta: privacyMetadata, canonical: '/privacy' },
        { name: 'terms', meta: termsMetadata, canonical: '/terms' },
        { name: 'disclaimer', meta: disclaimerMetadata, canonical: '/disclaimer' },
      ];

      for (const page of pageMetas) {
        expect(typeof page.meta.title).toBe('string');
        expect(page.meta.title).not.toMatch(/lorem|todo|placeholder/i);
        expect(typeof page.meta.description).toBe('string');
        expect(page.meta.description!.length).toBeGreaterThan(20);
        expect(page.meta.alternates?.canonical).toBe(page.canonical);
      }
    });

    it('verifies privacy policy discloses actual PBKDF2 password security, guest isolation, and cookies', () => {
      expect(privacyMetadata.description).toContain('isolated guest sessions');
      expect(privacyMetadata.description).toContain('cookies');
    });

    it('verifies terms and disclaimer explicitly disclaim guaranteed search rankings and financial results', () => {
      expect(disclaimerMetadata.description).toContain('non-guarantee of search rankings');
      expect(termsMetadata.description).toContain('service boundaries');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 7: Security Headers Configuration
  // --------------------------------------------------------------------------
  describe('7. Security Response Headers', () => {
    it('defines required security headers including nosniff, Referrer-Policy, and X-Frame-Options', async () => {
      const headersConfig = await (nextConfig as any).headers?.();
      expect(Array.isArray(headersConfig)).toBe(true);

      const catchAll = headersConfig.find((h: any) => h.source === '/:path*');
      expect(catchAll).toBeDefined();

      const headerMap: Record<string, string> = {};
      for (const h of catchAll.headers) {
        headerMap[h.key] = h.value;
      }

      expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
      expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headerMap['X-Frame-Options']).toBe('DENY');
      expect(headerMap['Permissions-Policy']).toBeDefined();
      expect(headerMap['Content-Security-Policy-Report-Only']).toBeDefined();
      expect(headerMap['Content-Security-Policy-Report-Only']).toContain("default-src 'self'");
    });

    it('enforces HSTS only in production mode', async () => {
      (process.env as any).NODE_ENV = 'production';
      const prodHeadersConfig = await (nextConfig as any).headers?.();
      const prodCatchAll = prodHeadersConfig.find((h: any) => h.source === '/:path*');
      const hstsHeader = prodCatchAll.headers.find(
        (h: any) => h.key === 'Strict-Transport-Security'
      );
      expect(hstsHeader).toBeDefined();
      expect(hstsHeader.value).toContain('max-age=63072000');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 8: Domain Configuration Fail-Safe
  // --------------------------------------------------------------------------
  describe('8. Domain Configuration Fail-Safe & Localhost Protection', () => {
    it('throws in production when SITE_URL is not set and refuses to emit localhost or fake domains', () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.SITE_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;

      expect(() => getSiteOrigin()).toThrow(/Missing production domain configuration/);
      expect(() => getCanonicalUrl('/about')).toThrow(/Missing production domain configuration/);
      expect(isProductionDomainConfigured()).toBe(false);
    });

    it('throws in production when SITE_URL is set to localhost or loopback IP', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.SITE_URL = 'http://localhost:3000';

      expect(() => getSiteOrigin()).toThrow(/Production canonical origin cannot be localhost/);
      expect(isProductionDomainConfigured()).toBe(false);
    });

    it('returns empty sitemap in production when domain is unconfigured rather than leaking fake domains', () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.SITE_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;

      const map = sitemap();
      expect(map).toEqual([]);
    });

    it('uses localhost:3000 for local development when SITE_URL is unset', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.SITE_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;

      expect(getSiteOrigin()).toBe('http://localhost:3000');
      expect(getCanonicalUrl('/about')).toBe('http://localhost:3000/about');
    });

    it('uses configured production HTTPS domain when properly provided', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.SITE_URL = 'https://pulse.myverifiedsite.com';

      expect(isProductionDomainConfigured()).toBe(true);
      expect(getSiteOrigin()).toBe('https://pulse.myverifiedsite.com');
      expect(getCanonicalUrl('/terms')).toBe('https://pulse.myverifiedsite.com/terms');
    });
  });
});
