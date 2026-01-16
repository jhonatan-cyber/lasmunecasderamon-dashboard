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
  X,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, module: 'dashboard', action: 'view' },
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
  const { isSidebarOpen, isCollapsed, closeSidebar, toggleCollapse } = useSidebar();
  const { user, loading: userLoading } = useCurrentUser();
  const { userPermissions: permissions, isLoading: permissionsLoading } = useUserPermissions();

  // Verificar si el usuario es anfitriona o garzón
  const isAnfitriona = user?.role?.toLowerCase() === 'anfitriona';
  const isGarzon = user?.role?.toLowerCase() === 'garzon';

  const hasModulePermission = (module: string, action: string = 'view') => {
    if (module === 'dashboard') return true;

    const isAdminFromStorage =
      typeof window !== 'undefined'
        ? localStorage.getItem('userRole')?.toLowerCase() === 'administrador'
        : false;

    if (user?.role?.toLowerCase() === 'administrador' || isAdminFromStorage) return true;
    if (userLoading) return true;
    if (!permissions.length && !permissionsLoading) return true;

    let mappedModule = module;
    let mappedAction = action;

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

    if (action === 'view') mappedAction = 'ver';
    if (action === 'create') mappedAction = 'crear';
    if (action === 'edit') mappedAction = 'editar';
    if (action === 'delete') mappedAction = 'eliminar';
    if (action === 'process') mappedAction = 'procesar';
    if (action === 'close') mappedAction = 'cerrar';
    if (action === 'details') mappedAction = 'detalles';

    return permissions.some(
      permission => permission.module === mappedModule && permission.action === mappedAction
    );
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn(
        'hidden lg:flex h-full flex-col bg-white border-r border-gray-200 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}>
        <div className={cn(
          'flex h-16 items-center border-b border-gray-200 transition-all duration-300',
          isCollapsed ? 'px-2 justify-center' : 'px-6'
        )}>
          <div className={cn(
            'flex items-center gap-2 transition-all duration-300',
            isCollapsed ? 'justify-center' : 'flex-1 justify-center'
          )}>
            <img 
              src='/img/system/logo1.png' 
              alt='Las Muñecas de Ramón' 
              className={cn(
                'w-auto transition-all duration-300',
                isCollapsed ? 'h-8' : 'h-10'
              )}
            />
            {!isCollapsed && (
              <span className='text-sm font-bold text-gray-900'>Panel Administrativo</span>
            )}
          </div>
        </div>
        <nav className='flex-1 px-4 py-6 space-y-8 overflow-y-auto'>
          {/* Skeleton del sidebar */}
        </nav>
      </div>
    );
  }

  // Filtrar listas por permisos
  const allowedPrincipal = navigation.filter(item => {
    if (isAnfitriona && item.name !== 'Dashboard') return false;
    if (isGarzon && item.name !== 'Dashboard' && item.name !== 'Pedidos') return false;
    return hasModulePermission(item.module, item.action);
  });

  const allowedHR = hrNavigation.filter(item => hasModulePermission(item.module, item.action));
  const allowedFinance = financeNavigation.filter(item => hasModulePermission(item.module, item.action));
  const allowedService = serviceNavigation.filter(item => hasModulePermission(item.module, item.action));
  const allowedSecondary = secondaryNavigation.filter(item => hasModulePermission(item.module, item.action));

  const SidebarContent = () => (
    <div className={cn(
      'flex h-full flex-col bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 mobile-sidebar transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className={cn(
        'flex h-16 items-center border-b border-gray-200 dark:border-neutral-800 transition-all duration-300',
        isCollapsed ? 'px-2 justify-center' : 'px-6'
      )}>
        <div className={cn(
          'flex items-center gap-2 transition-all duration-300',
          isCollapsed ? 'justify-center' : 'flex-1 justify-center'
        )}>
          <Image
            src='/img/system/logo1.png'
            alt='Las Muñecas de Ramón'
            width={isCollapsed ? 32 : 180}
            height={isCollapsed ? 32 : 44}
            className={cn(
              'w-auto transition-all duration-300',
              isCollapsed ? 'h-8' : 'h-11'
            )}
            priority
          />
          {!isCollapsed && (
            <span className='text-sm font-bold text-gray-900 dark:text-neutral-100 transition-opacity duration-300'>
              Panel Administrativo
            </span>
          )}
        </div>
        <button
          onClick={closeSidebar}
          className='lg:hidden ml-auto p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors'
        >
          <X className='h-5 w-5 text-gray-500 dark:text-neutral-400' />
        </button>
      </div>

      {/* Botón de colapsar/expandir - movido al navbar */}

      <nav className='flex-1 px-4 py-6 space-y-8 overflow-y-auto'>
        {allowedPrincipal.length > 0 && (
          <div>
            {!isCollapsed && (
              <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
                Principal
              </h3>
            )}
            <ul className='space-y-1'>
              {allowedPrincipal.map(item => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 group',
                        isActive
                          ? isCollapsed 
                            ? 'text-blue-700 dark:text-blue-300' // Solo color del icono cuando está colapsado
                            : 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500' // Fondo completo cuando está expandido
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className='h-5 w-5 flex-shrink-0' />
                      {!isCollapsed && <span className='truncate'>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {allowedHR.length > 0 && (
          <div>
            {!isCollapsed && (
              <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
                Recursos Humanos
              </h3>
            )}
            <ul className='space-y-1'>
              {allowedHR.map(item => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                        isActive
                          ? isCollapsed 
                            ? 'text-blue-700 dark:text-blue-300' // Solo color del icono cuando está colapsado
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' // Fondo completo cuando está expandido
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className='h-5 w-5 flex-shrink-0' />
                      {!isCollapsed && <span className='truncate'>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {allowedFinance.length > 0 && (
          <div>
            {!isCollapsed && (
              <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
                Finanzas
              </h3>
            )}
            <ul className='space-y-1'>
              {allowedFinance.map(item => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                        isActive
                          ? isCollapsed 
                            ? 'text-blue-700 dark:text-blue-300' // Solo color del icono cuando está colapsado
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' // Fondo completo cuando está expandido
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className='h-5 w-5 flex-shrink-0' />
                      {!isCollapsed && <span className='truncate'>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {allowedService.length > 0 && (
          <div>
            {!isCollapsed && (
              <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
                Servicios
              </h3>
            )}
            <ul className='space-y-1'>
              {allowedService.map(item => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                        isActive
                          ? isCollapsed 
                            ? 'text-blue-700 dark:text-blue-300' // Solo color del icono cuando está colapsado
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' // Fondo completo cuando está expandido
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className='h-5 w-5 flex-shrink-0' />
                      {!isCollapsed && <span className='truncate'>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {allowedSecondary.length > 0 && (
          <div>
            {!isCollapsed && (
              <h3 className='px-3 text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3'>
                Configuración
              </h3>
            )}
            <ul className='space-y-1'>
              {allowedSecondary.map(item => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                        isActive
                          ? isCollapsed 
                            ? 'text-blue-700 dark:text-blue-300' // Solo color del icono cuando está colapsado
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' // Fondo completo cuando está expandido
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className='h-5 w-5 flex-shrink-0' />
                      {!isCollapsed && <span className='truncate'>{item.name}</span>}
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
      <div className='hidden lg:block'>
        <SidebarContent />
      </div>
      {isSidebarOpen && (
        <div className='lg:hidden fixed inset-0 z-50'>
          <div
            className='fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 sidebar-overlay'
            onClick={closeSidebar}
          />
          <div className='fixed inset-y-0 left-0 z-50 sidebar-enter'>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
