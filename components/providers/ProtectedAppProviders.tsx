'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { AnulacionProvider } from '@/contexts/AnulacionContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ServicioAnfitrionasProvider } from '@/contexts/ServicioAnfitrionasContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { FetchInterceptorInit } from '@/components/FetchInterceptorInit';
import { SyncProvider } from '@/contexts/SyncContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';

const AnulacionNotificationModal = dynamic(
  () => import('@/components/AnulacionNotificationModal'),
  {
    loading: () => null
  }
);

function FeatureScopedProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const role = user?.role?.toLowerCase();
  const isAdminOrCajero = role === 'administrador' || role === 'cajero';
  const needsNotifications = role === 'administrador' || role === 'cajero';
  const needsAnulacion =
    pathname?.startsWith('/sales') || pathname?.startsWith('/returns/services');
  const needsServicioAnfitrionas = pathname?.startsWith('/private-rooms');
  const needsTimer =
    isAdminOrCajero ||
    pathname?.startsWith('/sales') ||
    pathname?.startsWith('/returns/services') ||
    pathname?.startsWith('/private-rooms') ||
    pathname?.startsWith('/accounts/new') ||
    pathname?.startsWith('/anfitriona-servicios');

  let content = <>{children}</>;

  if (needsTimer) {
    content = <TimerProvider>{content}</TimerProvider>;
  }

  if (needsServicioAnfitrionas) {
    content = <ServicioAnfitrionasProvider>{content}</ServicioAnfitrionasProvider>;
  }

  if (needsAnulacion) {
    content = (
      <AnulacionProvider>
        {content}
        <AnulacionNotificationModal />
      </AnulacionProvider>
    );
  }

  if (needsNotifications) {
    content = <NotificationsProvider>{content}</NotificationsProvider>;
  }

  return <TooltipProvider>{content}</TooltipProvider>;
}

export function ProtectedAppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FetchInterceptorInit />
      <QueryProvider>
        <SyncProvider>
          <FeatureScopedProviders>{children}</FeatureScopedProviders>
        </SyncProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
