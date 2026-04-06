'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AnulacionProvider } from '@/contexts/AnulacionContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ServicioAnfitrionasProvider } from '@/contexts/ServicioAnfitrionasContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import AnulacionNotificationModal from '@/components/AnulacionNotificationModal';
import { FetchInterceptorInit } from '@/components/FetchInterceptorInit';
import { PermissionsSSEListener } from '@/components/PermissionsSSEListener';
import { SyncProvider } from '@/contexts/SyncContext';
import { TooltipProvider } from '@/components/ui/tooltip';

export function ProtectedAppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FetchInterceptorInit />
      <PermissionsSSEListener />
      <QueryProvider>
        <SyncProvider>
          <AnulacionProvider>
            <TimerProvider>
              <ServicioAnfitrionasProvider>
                <NotificationsProvider>
                  <TooltipProvider>
                    {children}
                    <AnulacionNotificationModal />
                  </TooltipProvider>
                </NotificationsProvider>
              </ServicioAnfitrionasProvider>
            </TimerProvider>
          </AnulacionProvider>
        </SyncProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
