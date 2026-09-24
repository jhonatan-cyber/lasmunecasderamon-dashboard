import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/api/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/login', '/asistencia-qr', '/access-denied', '/offline'],
        disallow: [
          '/',
          '/dashboard',
          '/api/',
          '/_next/',
          '/admin/',
          '/settings',
          '/reports',
          '/error-logs',
          '/api-docs',
          '/change-password',
          '/profile',
          '/help',
          '/notifications',
          '/access-denied?from='
        ]
      }
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`
  };
}
