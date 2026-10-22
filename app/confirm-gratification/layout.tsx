import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  title: 'Confirmar gratificación',
  robots: { index: false, follow: false }
};

export default function ConfirmarGratificacionLayout({ children }: { children: React.ReactNode }) {
  return <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>{children}</div>;
}
