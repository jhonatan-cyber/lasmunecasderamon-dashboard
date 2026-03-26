import type { Metadata } from 'next';
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

export default function HomePage() {
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
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
