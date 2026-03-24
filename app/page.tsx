import type { Metadata } from 'next';
import LandingPage from './landing/page';
import { createMarketingMetadata } from '@/lib/site';

export const metadata: Metadata = createMarketingMetadata();

export default function HomePage() {
  return <LandingPage />;
}
