'use client';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { UserImageProvider } from '@/contexts/UserImageContext';

import { TimerDisplay } from '@/components/dashboard/TimerDisplay';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSessionCheck } from '@/hooks/useSessionCheck';
import React from 'react';
import { cn } from '@/lib/utils';

function MainLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div className='flex h-screen bg-background'>
      <Sidebar />
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden transition-all duration-300',
        // Ajustar margen izquierdo en desktop cuando el sidebar está colapsado
        'lg:ml-0' // Reset default margin
      )}>
        <Header />
        <main className='flex-1 overflow-x-auto overflow-y-auto bg-background pb-4 sm:pb-6'>
          <div className='min-h-full'>
            {children}
          </div>
        </main>
      </div>
      <TimerDisplay />
    </div>
  );
}

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isApiDocs = pathname === '/api-docs';
  const isConfirmarAnulacion = pathname === '/confirmar-anulacion';
  const isConfirmarAnulacionServicio = pathname === '/confirmar-anulacion-servicio';
  const isLanding = pathname === '/landing';
  const isRoot = pathname === '/';
  const isTerminos = pathname === '/terminos-y-condiciones';
  const isPolitica = pathname === '/politica-de-privacidad';

  // Si es una página pública, no usar useCurrentUser ni mostrar sidebar/header
  if (isLogin || isApiDocs || isConfirmarAnulacion || isConfirmarAnulacionServicio || isLanding || isRoot || isTerminos || isPolitica) {
    return <>{children}</>;
  }

  // Solo usar useCurrentUser si no es una página pública
  const { user } = useCurrentUser();
  
  // Verificar sesión periódicamente (solo en páginas protegidas)
  useSessionCheck();
  
  return (
    <UserImageProvider>
      <SidebarProvider>
        <MainLayout>{children}</MainLayout>
      </SidebarProvider>
    </UserImageProvider>
  );
}
