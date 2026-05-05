/* eslint-disable */
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  ShoppingCart,
  Package,
  Settings,
  Home,
  FileText,
  TrendingUp,
  UserCheck,
  Tag,
  Shield,
  Clock,
  CreditCard,
  Calculator,
  Bed,
  Lock,
  Gift,
  Percent,
  DollarSign,
  RotateCcw,
  Calendar as CalendarIcon,
  X,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

type SidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  module: string;
  action: string;
  fallbackModule?: string;
  fallbackAction?: string;
};

type SidebarSection = {
  key: string;
  title: string;
  items: SidebarItem[];
};

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    key: 'principal',
    title: 'Principal',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        module: 'dashboard',
        action: 'ver_dashboard',
        fallbackModule: 'dashboard',
        fallbackAction: 'view'
      },
      {
        name: 'Usuarios',
        href: '/users',
        icon: Users,
        module: 'usuarios',
        action: 'listar_usuarios',
        fallbackModule: 'users',
        fallbackAction: 'view'
      },
      {
        name: 'Clientes',
        href: '/clients',
        icon: UserCheck,
        module: 'clientes',
        action: 'listar_clientes',
        fallbackModule: 'clients',
        fallbackAction: 'view'
      },
      {
        name: 'Productos',
        href: '/products',
        icon: Package,
        module: 'productos',
        action: 'listar_categoria_productos',
        fallbackModule: 'products',
        fallbackAction: 'view'
      },
      {
        name: 'Categorías',
        href: '/categories',
        icon: Tag,
        module: 'categorias',
        action: 'listar_categorias',
        fallbackModule: 'categories',
        fallbackAction: 'view'
      },
      {
        name: 'Pedidos',
        href: '/orders',
        icon: ShoppingCart,
        module: 'pedidos',
        action: 'listar_pedidos',
        fallbackModule: 'orders',
        fallbackAction: 'view'
      },
      {
        name: 'Reportes',
        href: '/reports',
        icon: FileText,
        module: 'reportes',
        action: 'listar_reportes',
        fallbackModule: 'reports',
        fallbackAction: 'view'
      },
      {
        name: 'Ventas',
        href: '/sales',
        icon: TrendingUp,
        module: 'ventas',
        action: 'listar_ventas',
        fallbackModule: 'sales',
        fallbackAction: 'view'
      }
    ]
  },
  {
    key: 'rrhh',
    title: 'Recursos Humanos',
    items: [
      {
        name: 'Roles',
        href: '/roles',
        icon: Shield,
        module: 'roles',
        action: 'listar_roles',
        fallbackModule: 'roles',
        fallbackAction: 'view'
      },
      {
        name: 'Asistencias',
        href: '/attendance',
        icon: Clock,
        module: 'asistencias',
        action: 'listar_asistencias',
        fallbackModule: 'attendance',
        fallbackAction: 'view'
      },
      {
        name: 'Horas Extras',
        href: '/overtime',
        icon: Clock,
        module: 'horas_extras',
        action: 'listar_horas_extras',
        fallbackModule: 'overtime',
        fallbackAction: 'view'
      }
    ]
  },
  {
    key: 'finanzas',
    title: 'Finanzas',
    items: [
      {
        name: 'Cajas',
        href: '/cash-register',
        icon: CreditCard,
        module: 'caja',
        action: 'listar_caja',
        fallbackModule: 'cash_register',
        fallbackAction: 'view'
      },
      {
        name: 'Cuentas',
        href: '/accounts',
        icon: Calculator,
        module: 'cuentas',
        action: 'listar_cuentas',
        fallbackModule: 'accounts',
        fallbackAction: 'view'
      },
      {
        name: 'Propinas',
        href: '/tips',
        icon: Gift,
        module: 'propinas',
        action: 'listar_propinas',
        fallbackModule: 'tips',
        fallbackAction: 'view'
      },
      {
        name: 'Comisiones',
        href: '/commissions',
        icon: Percent,
        module: 'comisiones',
        action: 'listar_comisiones',
        fallbackModule: 'commissions',
        fallbackAction: 'view'
      },
      {
        name: 'Pagos a Trabajadores',
        href: '/payroll',
        icon: DollarSign,
        module: 'pagos_trabajadores',
        action: 'listar_pagos',
        fallbackModule: 'payroll',
        fallbackAction: 'view'
      },
      {
        name: 'Detalle Planillas',
        href: '/payroll/calendar',
        icon: CalendarIcon,
        module: 'payroll_details',
        action: 'listar_detalles',
        fallbackModule: 'payroll_details',
        fallbackAction: 'view'
      },
      {
        name: 'Anticipos',
        href: '/advances',
        icon: DollarSign,
        module: 'anticipos',
        action: 'listar_anticipos',
        fallbackModule: 'advances',
        fallbackAction: 'view'
      },
      {
        name: 'Gratificaciones',
        href: '/gratificaciones',
        icon: Trophy,
        module: 'gratificaciones',
        action: 'listar_gratificaciones',
        fallbackModule: 'gratificaciones',
        fallbackAction: 'view'
      },
      {
        name: 'Devoluciones',
        href: '/returns',
        icon: RotateCcw,
        module: 'devoluciones',
        action: 'listar_devoluciones',
        fallbackModule: 'returns',
        fallbackAction: 'view'
      }
    ]
  },
  {
    key: 'servicios',
    title: 'Servicios',
    items: [
      {
        name: 'Crear Privado',
        href: '/rooms',
        icon: Bed,
        module: 'rooms',
        action: 'crear',
        fallbackModule: 'rooms',
        fallbackAction: 'create'
      },
      {
        name: 'Vender Privado',
        href: '/private-rooms',
        icon: Lock,
        module: 'private_rooms',
        action: 'listar_privados',
        fallbackModule: 'private_rooms',
        fallbackAction: 'view'
      }
    ]
  },
  {
    key: 'configuracion',
    title: 'Configuración',
    items: [
      {
        name: 'Configuración',
        href: '/settings',
        icon: Settings,
        module: 'settings',
        action: 'view'
      }
    ]
  }
];

type SidebarShellProps = {
  isCollapsed: boolean;
  children: React.ReactNode;
};

function SidebarShell({ isCollapsed, children }: SidebarShellProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 mobile-sidebar transition-all duration-300 floating-sidebar',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {children}
    </div>
  );
}

type SidebarHeaderProps = {
  isCollapsed: boolean;
  onClose?: () => void;
  loading?: boolean;
};

function SidebarHeader({ isCollapsed, onClose, loading = false }: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        'flex h-16 items-center border-b border-gray-200 dark:border-neutral-800 transition-all duration-300',
        isCollapsed ? 'px-2 justify-center' : 'px-6'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 transition-all duration-300',
          isCollapsed ? 'justify-center' : 'flex-1 justify-center'
        )}
      >
        <img
          src='/img/system/logo1.png'
          alt='Las MuÃ±ecas de RamÃ³n'
          style={{ height: isCollapsed ? '2rem' : loading ? '2.5rem' : '2.75rem', width: 'auto' }}
          className={cn(!loading && 'transition-all duration-300')}
        />
        {!isCollapsed && (
          <span className='text-sm font-bold text-gray-900 dark:text-neutral-100 transition-opacity duration-300'>
            Panel Administrativo
          </span>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className='lg:hidden ml-auto p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors'
        >
          <X className='h-5 w-5 text-gray-500 dark:text-neutral-400' />
        </button>
      )}
    </div>
  );
}

function SidebarSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <SidebarShell isCollapsed={isCollapsed}>
      <SidebarHeader isCollapsed={isCollapsed} loading />
      <nav className='flex-1 px-4 py-6 space-y-2 overflow-y-auto'>
        {!isCollapsed && (
          <>
            <div className='h-4 bg-gray-200 rounded w-20 mb-4 animate-pulse' />
            {[1, 2, 3].map(item => (
              <div key={item} className='h-10 bg-gray-100 rounded animate-pulse mb-2' />
            ))}
          </>
        )}
      </nav>
    </SidebarShell>
  );
}

type SidebarSectionBlockProps = {
  title: string;
  items: SidebarItem[];
  pathname: string;
  isCollapsed: boolean;
  onNavigate: () => void;
};

function SidebarSectionBlock({
  title,
  items,
  pathname,
  isCollapsed,
  onNavigate
}: SidebarSectionBlockProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      {!isCollapsed && (
        <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
          {title}
        </h3>
      )}
      <ul className='space-y-1'>
        {items.map(item => {
          const isActive = pathname === item.href;

          const linkContent = (
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg group nav-item',
                isActive
                  ? cn('nav-item-active', isCollapsed && 'nav-collapsed')
                  : 'text-gray-700 dark:text-neutral-300'
              )}
            >
              <item.icon className='h-5 w-5 flex-shrink-0 nav-icon' />
              {!isCollapsed && <span className='truncate'>{item.name}</span>}
            </Link>
          );

          return (
            <li key={item.name}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side='right'>
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                linkContent
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const { isSidebarOpen, isCollapsed, closeSidebar } = useSidebar();
  const { user, loading: userLoading } = useCurrentUser();
  const {
    userPermissions: permissions,
    isLoading: permissionsLoading,
    hasPermission
  } = useUserPermissions();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = user?.role?.toLowerCase() === 'administrador';
  const needsPermissions = Boolean(user) && !isAdmin;
  const permissionsReady = !needsPermissions || permissions.length > 0;

  const hasModulePermission = React.useCallback(
    (item: SidebarItem) => {
      if (isAdmin) {
        return true;
      }

      if (!permissions.length) {
        return false;
      }

      return (
        hasPermission(item.module, item.action) ||
        Boolean(
          item.fallbackModule &&
          item.fallbackAction &&
          hasPermission(item.fallbackModule, item.fallbackAction)
        )
      );
    },
    [hasPermission, isAdmin, permissions.length]
  );

  const visibleSections = React.useMemo(
    () =>
      SIDEBAR_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(hasModulePermission)
      })).filter(section => section.items.length > 0),
    [hasModulePermission]
  );

  if (!mounted || userLoading || (needsPermissions && permissionsLoading && !permissionsReady)) {
    return <SidebarSkeleton isCollapsed={isCollapsed} />;
  }

  const content = (
    <SidebarShell isCollapsed={isCollapsed}>
      <SidebarHeader isCollapsed={isCollapsed} onClose={closeSidebar} />
      <nav className='flex-1 px-4 py-6 space-y-8 overflow-y-auto'>
        {visibleSections.map(section => (
          <SidebarSectionBlock
            key={section.key}
            title={section.title}
            items={section.items}
            pathname={pathname}
            isCollapsed={isCollapsed}
            onNavigate={closeSidebar}
          />
        ))}
      </nav>
    </SidebarShell>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <>
        <div className='hidden lg:block'>{content}</div>
        {isSidebarOpen && (
          <div className='lg:hidden fixed inset-0 z-50'>
            <div
              className='fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 sidebar-overlay'
              onClick={closeSidebar}
            />
            <div className='fixed inset-y-0 left-0 z-50 sidebar-enter'>{content}</div>
          </div>
        )}
      </>
    </TooltipProvider>
  );
}
