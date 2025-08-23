'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  BarChart3,
  Users,
  ShoppingCart,
  Package,
  Settings,
  Home,
  FileText,
  TrendingUp,
  Bell,
  HelpCircle,
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
  ClipboardList,
  Calendar as CalendarIcon,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, module: 'dashboard', action: 'view' },
  { name: 'Usuarios', href: '/users', icon: Users, module: 'users', action: 'view' },
  { name: 'Clientes', href: '/clients', icon: UserCheck, module: 'clients', action: 'view' },
  { name: 'Productos', href: '/products', icon: Package, module: 'products', action: 'view' },
  { name: 'Categorías', href: '/categories', icon: Tag, module: 'categories', action: 'view' },
  { name: 'Pedidos', href: '/orders', icon: ShoppingCart, module: 'orders', action: 'view' },
  { name: 'Reportes', href: '/reports', icon: FileText, module: 'reports', action: 'view' },
  { name: 'Ventas', href: '/sales', icon: TrendingUp, module: 'sales', action: 'view' }
];

const hrNavigation = [
  { name: 'Roles', href: '/roles', icon: Shield, module: 'roles', action: 'view' },
  { name: 'Asistencias', href: '/attendance', icon: Clock, module: 'attendance', action: 'view' },
  { name: 'Horas Extras', href: '/overtime', icon: Clock, module: 'overtime', action: 'view' }
];

const financeNavigation = [
  {
    name: 'Cajas',
    href: '/cash-register',
    icon: CreditCard,
    module: 'cash_register',
    action: 'view'
  },
  { name: 'Cuentas', href: '/accounts', icon: Calculator, module: 'accounts', action: 'view' },
  { name: 'Propinas', href: '/tips', icon: Gift, module: 'tips', action: 'view' },
  {
    name: 'Comisiones',
    href: '/commissions',
    icon: Percent,
    module: 'commissions',
    action: 'view'
  },
  {
    name: 'Pagos a Trabajadores',
    href: '/payroll',
    icon: DollarSign,
    module: 'payroll',
    action: 'view'
  },
  {
    name: 'Detalle Planillas',
    href: '/payroll/calendar',
    icon: CalendarIcon,
    module: 'payroll',
    action: 'view'
  },
  { name: 'Anticipos', href: '/advances', icon: DollarSign, module: 'advances', action: 'view' },
  { name: 'Devoluciones', href: '/returns', icon: RotateCcw, module: 'returns', action: 'view' }
];

const serviceNavigation = [
  { name: 'Habitaciones', href: '/rooms', icon: Bed, module: 'rooms', action: 'view' },
  { name: 'Privados', href: '/private-rooms', icon: Lock, module: 'rooms', action: 'view' }
];

const secondaryNavigation = [
  { name: 'Configuración', href: '/settings', icon: Settings, module: 'settings', action: 'view' }
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { user, loading: userLoading } = useCurrentUser();
  const { userPermissions: permissions, isLoading: permissionsLoading } = useUserPermissions();

  // Verificar si el usuario es anfitriona
  const isAnfitriona = user?.role?.toLowerCase() === 'anfitriona';
  const isGarzon = user?.role?.toLowerCase() === 'garzon';

  // Función para verificar si el usuario tiene permisos para un módulo específico
  const hasModulePermission = (module: string, action: string = 'view') => {
    // Dashboard siempre está disponible
    if (module === 'dashboard') return true;

    // Verificar si es administrador desde localStorage inmediatamente
    const isAdminFromStorage =
      typeof window !== 'undefined'
        ? localStorage.getItem('userRole')?.toLowerCase() === 'administrador'
        : false;

    // El administrador siempre tiene acceso a todo
    if (user?.role?.toLowerCase() === 'administrador' || isAdminFromStorage) return true;

    // Si está cargando el usuario o los permisos, mostrar todo (fallback)
    if (userLoading || permissionsLoading) return true;

    // Si no hay permisos cargados, mostrar todo (fallback)
    if (!permissions.length) return true;

    // Mapear módulos y acciones del frontend a los de la base de datos
    let mappedModule = module;
    let mappedAction = action;

    // Mapear módulos
    if (module === 'orders') mappedModule = 'pedidos';
    if (module === 'users') mappedModule = 'usuarios';
    if (module === 'clients') mappedModule = 'clientes';
    if (module === 'products') mappedModule = 'productos';
    if (module === 'categories') mappedModule = 'categorias';
    if (module === 'sales') mappedModule = 'ventas';
    if (module === 'roles') mappedModule = 'roles';
    if (module === 'attendance') mappedModule = 'asistencias';
    if (module === 'overtime') mappedModule = 'horas_extras';
    if (module === 'cash_register') mappedModule = 'caja';
    if (module === 'payroll') mappedModule = 'pagos_trabajadores';
    if (module === 'payroll_details') mappedModule = 'detalle_planillas';
    if (module === 'private_rooms') mappedModule = 'privados';
    if (module === 'reports') mappedModule = 'reportes';

    // Mapear acciones
    if (action === 'view') mappedAction = 'ver';
    if (action === 'create') mappedAction = 'crear';
    if (action === 'edit') mappedAction = 'editar';
    if (action === 'delete') mappedAction = 'eliminar';
    if (action === 'process') mappedAction = 'procesar';
    if (action === 'close') mappedAction = 'cerrar';
    if (action === 'details') mappedAction = 'detalles';

    const hasPermission = permissions.some(
      permission => permission.module === mappedModule && permission.action === mappedAction
    );

    return hasPermission;
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Evitar renderizado durante SSR para prevenir errores de hidratación
  if (!mounted) {
    return (
      <div className='hidden lg:flex h-full w-64 flex-col bg-white border-r border-gray-200'>
        <div className='flex h-16 items-center px-6 border-b border-gray-200 justify-center'>
          <div className='flex items-center gap-2'>
            <img src='/img/system/logo1.png' alt='Las Muñecas de Ramón' className='h-10 w-auto' />
            <span className='text-sm font-bold text-gray-900'>Panel Administrativo</span>
          </div>
        </div>
        <nav className='flex-1 px-4 py-6 space-y-8 overflow-y-auto'>
          {/* Skeleton del sidebar */}
        </nav>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className='flex h-full w-64 flex-col bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 mobile-sidebar'>
      <div className='flex h-16 items-center px-6 border-b border-gray-200 dark:border-neutral-800'>
        <div className='flex-1 flex items-center justify-center gap-2'>
          <Image
            src='/img/system/logo1.png'
            alt='Las Muñecas de Ramón'
            width={180}
            height={44}
            className='h-11 w-auto'
            priority
          />
          <span className='text-sm font-bold text-gray-900 dark:text-neutral-100'>
            Panel Administrativo
          </span>
        </div>
        {/* Botón de cerrar para móviles */}
        <button
          onClick={closeSidebar}
          className='lg:hidden ml-auto p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors'
        >
          <X className='h-5 w-5 text-gray-500 dark:text-neutral-400' />
        </button>
      </div>

      <nav className='flex-1 px-4 py-6 space-y-8 overflow-y-auto'>
        {/* Sección de Permisos del Rol */}
        {userLoading || permissionsLoading ? (
          <div className='mb-6'>
            <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
              Cargando permisos...
            </h3>
            <div className='px-3'>
              <div className='animate-pulse bg-gray-100 dark:bg-neutral-800 rounded-lg p-3'>
                <div className='h-4 bg-gray-200 dark:bg-neutral-700 rounded mb-2'></div>
                <div className='h-3 bg-gray-200 dark:bg-neutral-700 rounded w-3/4'></div>
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
            Principal
          </h3>
          <ul className='space-y-1'>
            {navigation
              .filter(item => {
                // Si es anfitriona, solo mostrar el dashboard
                if (isAnfitriona && item.name !== 'Dashboard') {
                  return false;
                }
                // Si es garzon, solo mostrar dashboard y pedidos
                if (isGarzon && item.name !== 'Dashboard' && item.name !== 'Pedidos') {
                  return false;
                }
                // Verificar permisos
                return hasModulePermission(item.module, item.action);
              })
              .map(item => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                      )}
                    >
                      <item.icon className='h-5 w-5' />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>

        {!isAnfitriona && !isGarzon && (
          <div>
            <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
              Recursos Humanos
            </h3>
            <ul className='space-y-1'>
              {hrNavigation
                .filter(item => hasModulePermission(item.module, item.action))
                .map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                        )}
                      >
                        <item.icon className='h-5 w-5' />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}

        {!isAnfitriona && !isGarzon && (
          <div>
            <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
              Finanzas
            </h3>
            <ul className='space-y-1'>
              {financeNavigation
                .filter(item => hasModulePermission(item.module, item.action))
                .map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                        )}
                      >
                        <item.icon className='h-5 w-5' />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}

        {!isAnfitriona && !isGarzon && (
          <div>
            <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
              Servicios
            </h3>
            <ul className='space-y-1'>
              {serviceNavigation
                .filter(item => hasModulePermission(item.module, item.action))
                .map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                        )}
                      >
                        <item.icon className='h-5 w-5' />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}

        {!isAnfitriona && !isGarzon && (
          <div>
            <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
              Configuración
            </h3>
            <ul className='space-y-1'>
              {secondaryNavigation
                .filter(item => hasModulePermission(item.module, item.action))
                .map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                        )}
                      >
                        <item.icon className='h-5 w-5' />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </nav>
    </div>
  );

  return (
    <>
      {/* Sidebar para desktop - siempre visible */}
      <div className='hidden lg:block'>
        <SidebarContent />
      </div>

      {/* Sidebar para móviles - con overlay */}
      {isSidebarOpen && (
        <div className='lg:hidden fixed inset-0 z-50'>
          {/* Overlay */}
          <div
            className='fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 sidebar-overlay'
            onClick={closeSidebar}
          />

          {/* Sidebar */}
          <div className='fixed inset-y-0 left-0 z-50 sidebar-enter'>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
