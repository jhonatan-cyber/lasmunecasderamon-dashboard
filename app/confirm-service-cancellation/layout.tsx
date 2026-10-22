import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  title: 'Confirmar anulación de servicio',
  robots: { index: false, follow: false }
};

export default function ConfirmarAnulacionServicioLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>{children}</div>;
}
