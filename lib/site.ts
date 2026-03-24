import type { Metadata } from 'next';

export const siteConfig = {
  name: 'Las Munecas de Ramon',
  legalName: 'Las Munecas de Ramon',
  description:
    'Nightclub exclusivo en Linares con experiencia VIP, shows en vivo y ambiente unico.',
  adminDescription: 'Panel de administracion y operacion de Las Munecas de Ramon.',
  locale: 'es_CL',
  url: 'https://xn--lasmuecasderamon-bub.com',
  domain: 'xn--lasmuecasderamon-bub.com',
  ogImage: '/img/system/logo2.png'
} as const;

export function createMarketingMetadata(
  overrides: Partial<Metadata> = {}
): Metadata {
  const title = overrides.title ?? `${siteConfig.name} | Nightclub exclusivo en Linares`;
  const description = overrides.description ?? siteConfig.description;

  return {
    metadataBase: new URL(siteConfig.url),
    title,
    description,
    manifest: '/manifest.json',
    alternates: {
      canonical: '/',
      ...(overrides.alternates ?? {})
    },
    openGraph: {
      title: typeof title === 'string' ? title : siteConfig.name,
      description,
      url: siteConfig.url,
      siteName: siteConfig.legalName,
      locale: siteConfig.locale,
      type: 'website',
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: siteConfig.name
        }
      ],
      ...(overrides.openGraph ?? {})
    },
    twitter: {
      card: 'summary_large_image',
      title: typeof title === 'string' ? title : siteConfig.name,
      description,
      images: [siteConfig.ogImage],
      ...(overrides.twitter ?? {})
    },
    ...overrides
  };
}
