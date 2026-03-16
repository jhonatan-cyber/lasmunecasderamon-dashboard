'use client';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { UserImageProvider } from '@/contexts/UserImageContext';
import { RouteGuard } from '@/components/auth/RouteGuard';

import { TimerDisplay } from '@/components/dashboard/TimerDisplay';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useSessionCheck } from '@/hooks/auth/useSessionCheck';
import React from 'react';
import { cn } from '@/lib/utils';

function MainLayout({ children, user }: { children: React.ReactNode, user: any }) {
  const isAdminOrCajero = user?.role?.toLowerCase() === 'administrador' || user?.role?.toLowerCase() === 'cajero';

  return (
    <div className='flex h-screen bg-background'>
      <Sidebar />
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden transition-all duration-300',
    
        'lg:ml-0' // Reset default margin
      )}>
        <Header />
        <main className='flex-1 overflow-x-auto overflow-y-auto bg-background pb-4 sm:pb-6'>
          <div className='min-h-full'>
            {children}
          </div>
        </main>
      </div>
      {isAdminOrCajero && <TimerDisplay />}
    </div>
  );
}

function ProtectedLayoutContent({ children }: { children: React.ReactNode }) {
  // Solo usar hooks si es una página protegida
  const { user } = useCurrentUser();

  // Verificar sesión periódicamente (solo en páginas protegidas)
  useSessionCheck();

  return (
    <RouteGuard>
      <UserImageProvider>
        <SidebarProvider>
          <MainLayout user={user}>{children}</MainLayout>
        </SidebarProvider>
      </UserImageProvider>
    </RouteGuard>
  );
}

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublicRoute = [
    '/login',
    '/api-docs',
    '/confirmar-anulacion',
    '/confirmar-anulacion-servicio',
    '/landing',
    '/',
    '/terminos-y-condiciones',
    '/politica-de-privacidad'
  ].includes(pathname || '/');

  // Si es una página pública, no llamar hooks adicionales y renderizar directamente
  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <ProtectedLayoutContent>{children}</ProtectedLayoutContent>;
}
