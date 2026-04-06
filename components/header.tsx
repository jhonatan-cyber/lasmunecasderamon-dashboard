'use client';

import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/contexts/SidebarContext';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { CodigoVerificacionHeader } from '@/components/dashboard/CodigoVerificacionHeader';
import ThemeSwitcher from '@/components/shared/ThemeSwitcher';
import { HeaderUserMenu } from './header/HeaderUserMenu';
import { HeaderNotifications } from './header/HeaderNotifications';

export function Header() {
  const { user } = useCurrentUser();
  const { toggleSidebar, isCollapsed, toggleCollapse } = useSidebar();

  const isAnfitriona = user?.role?.toLowerCase() === 'anfitriona';
  const isCajero = user?.role?.toLowerCase() === 'cajero';
  const isAdmin = user?.role?.toLowerCase() === 'administrador';

  return (
    <header className='bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-2 sm:px-6 sticky top-0 z-50'>
      <div className='flex items-center gap-2 sm:gap-4'>
        {/* Mobile menu toggle */}
        <Button
          variant='ghost'
          size='icon'
          className='lg:hidden'
          onClick={toggleSidebar}
        >
          <Menu className='h-5 w-5' />
        </Button>
        
        {/* Desktop sidebar collapse toggle */}
        <Button
          variant='ghost'
          size='icon'
          className='hidden lg:flex'
          onClick={toggleCollapse}
          title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? <ChevronRight className='h-5 w-5' /> : <ChevronLeft className='h-5 w-5' />}
        </Button>
      </div>

      <div className='flex items-center gap-2 sm:gap-4'>
        {/* Dashboard Code / Verify Code - Desktop mainly */}
        {!isAnfitriona && (isAdmin || isCajero) && <CodigoVerificacionHeader />}
        
        <ThemeSwitcher />

        <HeaderNotifications />
        
        <div className='h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1 sm:mx-2'></div>

        <HeaderUserMenu />
      </div>
    </header>
  );
}
