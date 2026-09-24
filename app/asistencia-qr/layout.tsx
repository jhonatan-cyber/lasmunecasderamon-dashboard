import type { Metadata } from 'next';
import type React from 'react';
import { createMarketingMetadata } from '@/lib/api/site';

export const metadata: Metadata = createMarketingMetadata({
  title: 'Asistencia QR',
  description: 'Registro de asistencia por código QR en Las Munecas de Ramon.',
  alternates: { canonical: '/asistencia-qr' },
  robots: { index: false, follow: false }
});

export default function AsistenciaQrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
