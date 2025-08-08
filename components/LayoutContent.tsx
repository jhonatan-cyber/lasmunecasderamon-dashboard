'use client';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';

import { TimerDisplay } from '@/components/dashboard/TimerDisplay';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import React from 'react';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isApiDocs = pathname === '/api-docs';
  const isConfirmarAnulacion = pathname === '/confirmar-anulacion';
  const isConfirmarAnulacionServicio = pathname === '/confirmar-anulacion-servicio';

  // Si es una página pública, no usar useCurrentUser
  if (isLogin || isApiDocs || isConfirmarAnulacion || isConfirmarAnulacionServicio) {
    return <>{children}</>;
  }

  // Solo usar useCurrentUser si no es una página pública
  const { user } = useCurrentUser();
  return (
    <SidebarProvider>
      <div className='flex h-screen bg-gray-50'>
        <Sidebar />
        <div className='flex-1 flex flex-col overflow-hidden'>
          <Header />

          <main className='flex-1 overflow-x-auto overflow-y-auto bg-gray-50 pb-4 sm:pb-6'>
            <div className='min-h-full'>
              {children}
            </div>
          </main>
        </div>
        <TimerDisplay />
      </div>
    </SidebarProvider>
  );
}
