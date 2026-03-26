import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createMarketingMetadata } from '@/lib/api/site';

export const metadata: Metadata = createMarketingMetadata({
  alternates: {
    canonical: '/landing'
  }
});

export default function LandingLayout({ children }: { children: ReactNode }) {
  return children;
}
