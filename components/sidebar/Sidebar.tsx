'use client';

import React from 'react';
import Image from 'next/image';
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
  Trophy,
  Search
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
  description: string;
  items: SidebarItem[];
};

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    key: 'overview',
    title: 'Vista General',
    description: 'Seguimiento y decisiones del día.',
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
        name: 'Reportes',
        href: '/reports',
        icon: FileText,
        module: 'reportes',
        action: 'listar_reportes',
        fallbackModule: 'reports',
        fallbackAction: 'view'
      }
    ]
  },
  {
    key: 'operation',
    title: 'Operación',
    description: 'Ventas, pedidos y atención en piso.',
    items: [
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
        name: 'Ventas',
        href: '/sales',
        icon: TrendingUp,
        module: 'ventas',
        action: 'listar_ventas',
        fallbackModule: 'sales',
        fallbackAction: 'view'
      },
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
    key: 'commercial',
    title: 'Catálogo y Clientes',
    description: 'Base comercial y configuración del menú.',
    items: [
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
      }
    ]
  },
  {
    key: 'finance',
    title: 'Finanzas',
    description: 'Control de pagos, incentivos y cierres.',
    items: [
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
    key: 'team',
    title: 'Equipo',
    description: 'Personas, permisos y jornada laboral.',
    items: [
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
    key: 'settings',
    title: 'Configuración',
    description: 'Ajustes generales de la plataforma.',
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
        'border-b border-gray-200/80 dark:border-neutral-800 transition-all duration-300',
        isCollapsed ? 'px-2 py-4' : 'px-5 py-4'
      )}
    >
      <div
        className={cn(
          'flex items-center',
          isCollapsed ? 'justify-center' : 'justify-between gap-3'
        )}
      >
        <div
          className={cn(
            'flex items-center transition-all duration-300',
            isCollapsed ? 'justify-center' : 'gap-3'
          )}
        >
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-slate-50 shadow-sm ring-1 ring-black/5 dark:from-neutral-800 dark:to-neutral-900 dark:ring-white/10'>
            <Image
              src='/img/system/logo1.png'
              alt='Las Muñecas de Ramón'
              width={0}
              height={0}
              sizes='100vw'
              priority
              style={{
                height: isCollapsed ? '1.8rem' : loading ? '2rem' : '2.15rem',
                width: 'auto'
              }}
              className={cn(!loading && 'transition-all duration-300')}
            />
          </div>
          {!isCollapsed && (
            <div className='flex-1 min-w-0 transition-opacity duration-300'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-neutral-500'>
                Las Muñecas
              </p>
              <p className='truncate text-sm font-semibold text-gray-900 dark:text-neutral-100'>
                Panel Administrativo
              </p>
            </div>
          )}
        </div>
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
  description: string;
  items: SidebarItem[];
  pathname: string;
  isCollapsed: boolean;
  onNavigate: () => void;
};

function SidebarSectionBlock({
  title,
  description,
  items,
  pathname,
  isCollapsed,
  onNavigate
}: SidebarSectionBlockProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className='space-y-2'>
      {!isCollapsed && (
        <div className='px-3'>
          <h3 className='text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-[0.24em]'>
            {title}
          </h3>
          <p className='mt-1 text-xs text-gray-400 dark:text-neutral-500'>{description}</p>
        </div>
      )}
      <ul className='space-y-1.5'>
        {items.map(item => {
          const isActive = pathname === item.href;

          const linkContent = (
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl group nav-item',
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

  const [searchTerm, setSearchTerm] = React.useState('');

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

  const normalizedSearch = searchTerm.toLowerCase().trim();

  const visibleSections = React.useMemo(
    () =>
      SIDEBAR_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(
          item =>
            hasModulePermission(item) &&
            (!normalizedSearch || item.name.toLowerCase().includes(normalizedSearch))
        )
      })).filter(section => section.items.length > 0),
    [hasModulePermission, normalizedSearch]
  );

  if (!mounted || userLoading || (needsPermissions && permissionsLoading && !permissionsReady)) {
    return <SidebarSkeleton isCollapsed={isCollapsed} />;
  }

  const content = (
    <SidebarShell isCollapsed={isCollapsed}>
      <SidebarHeader isCollapsed={isCollapsed} onClose={closeSidebar} />
      {!isCollapsed && (
        <div className='sticky top-0 z-10 border-b border-gray-200/80 bg-white px-7 py-4 dark:border-neutral-800 dark:bg-neutral-900'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-neutral-500 pointer-events-none' />
            <input
              type='text'
              placeholder='Buscar opciones...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className='absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            )}
          </div>
        </div>
      )}
      <nav className='flex-1 overflow-y-auto px-4 py-5 space-y-7'>
        {visibleSections.map(section => (
          <SidebarSectionBlock
            key={section.key}
            title={section.title}
            description={section.description}
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
