import type { MetadataRoute } from 'next';
import {
  BOT_POLICY_MATRIX,
  ROBOTS_DISALLOWED_PATHS,
  isAiModelTrainingAllowed,
} from '@/lib/seo/bot-policy';
import { getCanonicalUrl, isProductionDomainConfigured } from '@/lib/seo/site-config';

export default function robots(): MetadataRoute.Robots {
  const allowTraining = isAiModelTrainingAllowed();

  // Explicit search and user fetch crawlers
  const allowedBots = BOT_POLICY_MATRIX.filter(
    (b) => b.category === 'search' || b.category === 'user_fetch'
  ).map((b) => b.userAgent);

  // Offline model training crawlers
  const trainingBots = BOT_POLICY_MATRIX.filter((b) => b.category === 'training').map(
    (b) => b.userAgent
  );

  const rules: MetadataRoute.Robots['rules'] = [
    // Baseline wildcard policy: allow public indexable content, disallow internal APIs
    {
      userAgent: '*',
      allow: '/',
      disallow: ROBOTS_DISALLOWED_PATHS,
    },
    // Permitted search engines and conversational AI retrieval bots
    ...allowedBots.map((bot) => ({
      userAgent: bot,
      allow: '/',
      disallow: ROBOTS_DISALLOWED_PATHS,
    })),
    // Training crawlers: governed by explicit platform owner training policy
    ...trainingBots.map((bot) => ({
      userAgent: bot,
      ...(allowTraining
        ? { allow: '/', disallow: ROBOTS_DISALLOWED_PATHS }
        : { disallow: '/' }),
    })),
  ];

  let sitemapUrl: string | undefined;
  if (isProductionDomainConfigured()) {
    sitemapUrl = getCanonicalUrl('/sitemap.xml');
  } else if (process.env.NODE_ENV !== 'production') {
    sitemapUrl = 'http://localhost:3000/sitemap.xml';
  }

  return {
    rules,
    sitemap: sitemapUrl,
  };
}
