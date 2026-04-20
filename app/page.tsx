import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import LandingPage from './landing/page';
import { createMarketingMetadata, siteConfig } from '@/lib/api/site';

export const metadata: Metadata = createMarketingMetadata({
  title: `${siteConfig.name} | Nightclub Exclusivo & Shows Privados en Linares`,
  description:
    'Vive la mejor experiencia VIP en Las Muñecas de Ramón, el nightclub más exclusivo de Linares. Disfruta de shows en vivo, tragos premium y el mejor ambiente nocturno.',
  keywords: [
    'nightclub linares',
    'club nocturno linares',
    'shows en vivo linares',
    'las muñecas de ramon',
    'vip linares',
    'cabaret linares',
    'entretenimiento nocturno maule'
  ]
});

export default async function HomePage() {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NightClub',
    name: siteConfig.name,
    image: `${siteConfig.url}${siteConfig.ogImage}`,
    description: siteConfig.description,
    url: siteConfig.url,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Linares',
      addressRegion: 'Maule',
      addressCountry: 'CL'
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '22:00',
        closes: '05:00'
      }
    ]
  };

  return (
    <>
      <Script
        id='home-jsonld'
        nonce={nonce}
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')
        }}
      />
      <LandingPage />
    </>
  );
}
