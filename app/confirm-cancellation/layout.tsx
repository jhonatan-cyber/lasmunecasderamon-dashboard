import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  title: 'Confirmar anulación',
  robots: { index: false, follow: false }
};

export default function ConfirmarAnulacionLayout({ children }: { children: React.ReactNode }) {
  return <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>{children}</div>;
}
