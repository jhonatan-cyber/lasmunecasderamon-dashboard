import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/api/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicPages = ['', '/login', '/asistencia-qr', '/offline'].map(path => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.5
  }));

  const confirmationPages = [
    '/confirmar-anticipo',
    '/confirmar-anulacion',
    '/confirmar-anulacion-cuenta',
    '/confirmar-anulacion-servicio',
    '/confirmar-gratificacion'
  ].map(path => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: 'yearly' as const,
    priority: 0.1
  }));

  return [...publicPages, ...confirmationPages];
}
