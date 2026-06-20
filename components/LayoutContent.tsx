'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { ProtectedAppProviders } from '@/components/providers/ProtectedAppProviders';
import { TimerDisplay } from '@/components/dashboard/TimerDisplay';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useSessionCheck } from '@/hooks/auth/useSessionCheck';
import React from 'react';
import { cn } from '@/lib/utils/utils';
import { useEffect } from 'react';

interface LayoutUser {
  role?: string;
}

function MainLayout({ children, user }: { children: React.ReactNode; user: LayoutUser | null }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const isAdminOrCajero =
    user?.role?.toLowerCase() === 'administrador' || user?.role?.toLowerCase() === 'cajero';

  return (
    <div className={cn('flex h-screen bg-background', !isAdminOrCajero && 'hide-sidebar')}>
      {isAdminOrCajero ? <Sidebar /> : null}
      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
          !isAdminOrCajero && 'lg:ml-0'
        )}
      >
        <Header showSidebarControls={isAdminOrCajero} />
        <main className='flex-1 overflow-x-auto overflow-y-auto bg-background pb-4 sm:pb-6'>
          <div className='min-h-full w-full'>{children}</div>
        </main>
      </div>
      {isAdminOrCajero && <TimerDisplay />}
    </div>
  );
}

function ProtectedLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();

  useSessionCheck();

  const isAdminOrCajero =
    user?.role?.toLowerCase() === 'administrador' || user?.role?.toLowerCase() === 'cajero';

  return (
    <RouteGuard>
      {isAdminOrCajero ? (
        <SidebarProvider>
          <MainLayout user={user}>{children}</MainLayout>
        </SidebarProvider>
      ) : (
        <MainLayout user={user}>{children}</MainLayout>
      )}
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
    '/confirmar-anulacion-cuenta',
    '/confirmar-anticipo',
    '/'
  ].includes(pathname || '/');

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <ProtectedAppProviders>
      <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
    </ProtectedAppProviders>
  );
}
