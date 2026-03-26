'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { UserImageProvider } from '@/contexts/UserImageContext';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { ProtectedAppProviders } from '@/components/providers/ProtectedAppProviders';
import { TimerDisplay } from '@/components/dashboard/TimerDisplay';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useSessionCheck } from '@/hooks/auth/useSessionCheck';
import React from 'react';
import { cn } from '@/lib/utils/utils';

interface LayoutUser {
  role?: string;
}

function MainLayout({
  children,
  user
}: {
  children: React.ReactNode;
  user: LayoutUser | null;
}) {
  const isAdminOrCajero =
    user?.role?.toLowerCase() === 'administrador' || user?.role?.toLowerCase() === 'cajero';

  return (
    <div className={cn('flex h-screen bg-background', !isAdminOrCajero && 'hide-sidebar')}>
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
          !isAdminOrCajero && 'lg:ml-0'
        )}
      >
        <Header />
        <main className='flex-1 overflow-x-auto overflow-y-auto bg-background pb-4 sm:pb-6'>
          <div className='min-h-full'>{children}</div>
        </main>
      </div>
      {isAdminOrCajero && <TimerDisplay />}
    </div>
  );
}

function ProtectedLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();

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

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <ProtectedAppProviders>
      <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
    </ProtectedAppProviders>
  );
}
