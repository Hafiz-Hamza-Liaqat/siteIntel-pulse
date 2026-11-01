import type { MetadataRoute } from 'next';
import {
  P0_PUBLIC_ROUTES,
  getCanonicalUrl,
  isProductionDomainConfigured,
} from '@/lib/seo/site-config';

export default function sitemap(): MetadataRoute.Sitemap {
  // In production, guard against emitting localhost or an unconfigured / fabricated domain
  if (process.env.NODE_ENV === 'production' && !isProductionDomainConfigured()) {
    return [];
  }

  const isLocalDev = process.env.NODE_ENV !== 'production' && !isProductionDomainConfigured();
  const devBase = 'http://localhost:3000';

  return P0_PUBLIC_ROUTES.map((route) => ({
    url: isLocalDev ? `${devBase}${route.path}` : getCanonicalUrl(route.path),
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
