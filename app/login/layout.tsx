import type { Metadata } from 'next';
import type React from 'react';
import { createMarketingMetadata } from '@/lib/site';

export const metadata: Metadata = createMarketingMetadata({
  title: 'Login',
  description: 'Acceso al panel operativo y administrativo de Las Munecas de Ramon.',
  alternates: {
    canonical: '/login',
  },
  robots: {
    index: false,
    follow: false,
  },
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='bg-gray-50 min-h-screen'>
      {children}
    </div>
  );
}
