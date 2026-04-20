'use client';

import dynamic from 'next/dynamic';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/contexts/SidebarContext';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import ThemeSwitcher from '@/components/shared/ThemeSwitcher';
import { HeaderUserMenu } from './header/HeaderUserMenu';

const CodigoVerificacionHeader = dynamic(
  () =>
    import('@/components/dashboard/CodigoVerificacionHeader').then(
      mod => mod.CodigoVerificacionHeader
    ),
  {
    loading: () => null
  }
);

const HeaderNotifications = dynamic(
  () => import('./header/HeaderNotifications').then(mod => mod.HeaderNotifications),
  {
    loading: () => null
  }
);

function SidebarControls() {
  const { toggleSidebar, isCollapsed, toggleCollapse } = useSidebar();

  return (
    <div className='flex items-center gap-2 sm:gap-4'>
      <Button variant='ghost' size='icon' className='lg:hidden' onClick={toggleSidebar}>
        <Menu className='h-5 w-5' />
      </Button>

      <Button
        variant='ghost'
        size='icon'
        className='hidden lg:flex'
        onClick={toggleCollapse}
        title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {isCollapsed ? <ChevronRight className='h-5 w-5' /> : <ChevronLeft className='h-5 w-5' />}
      </Button>
    </div>
  );
}

export function Header({ showSidebarControls = true }: { showSidebarControls?: boolean }) {
  const { user } = useCurrentUser();

  const isAnfitriona = user?.role?.toLowerCase() === 'anfitriona';
  const isCajero = user?.role?.toLowerCase() === 'cajero';
  const isAdmin = user?.role?.toLowerCase() === 'administrador';
  const shouldShowNotifications = isAdmin || isCajero;

  return (
    <header className='bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-2 sm:px-6 sticky top-0 z-50'>
      <div className='flex min-w-[44px] items-center gap-2 sm:gap-4'>
        {showSidebarControls ? <SidebarControls /> : null}
      </div>

      <div className='flex items-center gap-2 sm:gap-4'>
        {!isAnfitriona && (isAdmin || isCajero) && (
          <CodigoVerificacionHeader userRole={user?.role} />
        )}
        <ThemeSwitcher />
        {shouldShowNotifications ? <HeaderNotifications /> : null}
        <div className='h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1 sm:mx-2'></div>
        <HeaderUserMenu />
      </div>
    </header>
  );
}
