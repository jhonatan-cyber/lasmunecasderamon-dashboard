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
  { name: 'Usuarios', href: '/users', icon: Users, module: 'usuarios', action: 'listar' },
  { name: 'Clientes', href: '/clients', icon: UserCheck, module: 'clientes', action: 'listar' },
  { name: 'Productos', href: '/products', icon: Package, module: 'productos', action: 'ver_categorias' },
  { name: 'Categorías', href: '/categories', icon: Tag, module: 'categorias', action: 'listar' },
  { name: 'Pedidos', href: '/orders', icon: ShoppingCart, module: 'pedidos', action: 'listar' },
  { name: 'Reportes', href: '/reports', icon: FileText, module: 'reportes', action: 'listar' },
  { name: 'Ventas', href: '/sales', icon: TrendingUp, module: 'ventas', action: 'listar' }
];

const hrNavigation = [
  { name: 'Roles', href: '/roles', icon: Shield, module: 'roles', action: 'listar' },
  { name: 'Asistencias', href: '/attendance', icon: Clock, module: 'asistencias', action: 'listar' },
  { name: 'Horas Extras', href: '/overtime', icon: Clock, module: 'horas_extras', action: 'listar' }
];

const financeNavigation = [
  {
    name: 'Cajas',
    href: '/cash-register',
    icon: CreditCard,
    module: 'caja',
    action: 'listar'
  },
  {
    name: 'Cuentas',
    href: '/accounts',
    icon: Calculator,
    module: 'cuentas',
    action: 'listar'
  },
  { name: 'Propinas', href: '/tips', icon: Gift, module: 'propinas', action: 'listar' },
  {
    name: 'Comisiones',
    href: '/commissions',
    icon: Percent,
    module: 'comisiones',
    action: 'listar'
  },
  {
    name: 'Pagos a Trabajadores',
    href: '/payroll',
    icon: DollarSign,
    module: 'payroll',
    action: 'listar'
  },
  {
    name: 'Detalle Planillas',
    href: '/payroll/calendar',
    icon: CalendarIcon,
    module: 'detalle_planilla',
    action: 'listar'
  },
  {
    name: 'Anticipos',
    href: '/advances',
    icon: DollarSign,
    module: 'anticipos',
    action: 'listar'
  },
  {
    name: 'Devoluciones',
    href: '/returns',
    icon: RotateCcw,
    module: 'devoluciones',
    action: 'listar'
  }
];

const serviceNavigation = [
  { name: 'Crear Privado', href: '/rooms', icon: Bed, module: 'habitaciones', action: 'crear' },
  { name: 'Vender Privado', href: '/private-rooms', icon: Lock, module: 'privados', action: 'listar' }
];

const secondaryNavigation = [
  { name: 'Configuración', href: '/settings', icon: Settings, module: 'configuraciones', action: 'listar' }
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const { isSidebarOpen, isCollapsed, closeSidebar, toggleCollapse } = useSidebar();
  const { user, loading: userLoading } = useCurrentUser();
  const { userPermissions: permissions, isLoading: permissionsLoading } = useUserPermissions();

  // Log inicial para debugging
  React.useEffect(() => {
    console.log('[Sidebar] Estado actual:', {
      user: user?.role,
      userLoading,
      permissionsLoading,
      permissionsCount: permissions.length,
      permissions: permissions.map(p => `${p.module}.${p.action}`)
    });
  }, [user, userLoading, permissionsLoading, permissions]);

  // Log del usuario y su rol
  React.useEffect(() => {
    if (user && !userLoading) {
      console.log('[Sidebar] Usuario logueado:', {
        id: user.id,
        nombre: user.name,
        apellido: user.lastName,
        rol: user.role
      });
    }
  }, [user, userLoading]);

  // Verificar si el usuario es anfitriona o garzón
  const isAnfitriona = user?.role?.toLowerCase() === 'anfitriona';
  const isGarzon = user?.role?.toLowerCase() === 'garzon';

  const hasModulePermission = (module: string, action: string = 'listar') => {
    // Dashboard siempre accesible
    if (module === 'dashboard') return true;

    // Administrador tiene acceso a todo
    const isAdminFromStorage =
      typeof window !== 'undefined'
        ? localStorage.getItem('userRole')?.toLowerCase() === 'administrador'
        : false;

    if (user?.role?.toLowerCase() === 'administrador' || isAdminFromStorage) return true;
    
    // Si no hay permisos cargados, no tiene acceso
    if (!permissions.length) {
      console.log(`[Sidebar] No hay permisos para verificar ${module}.${action}`);
      return false;
    }

    const hasPermission = permissions.some(
      permission => permission.module === module && permission.action === action
    );
    
    console.log(`[Sidebar] Verificando ${module}.${action} = ${hasPermission}`);
    
    return hasPermission;
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Mostrar skeleton mientras carga el usuario O mientras carga permisos por primera vez
  // Solo si no es administrador (admin no necesita permisos)
  const isAdmin = user?.role?.toLowerCase() === 'administrador';
  const needsPermissions = user && !isAdmin;
  const permissionsReady = !needsPermissions || permissions.length > 0;
  
  console.log('[Sidebar] Estado de carga:', {
    mounted,
    userLoading,
    needsPermissions,
    permissionsLoading,
    permissionsReady,
    permissionsCount: permissions.length
  });
  
  if (!mounted || userLoading || (needsPermissions && permissionsLoading && !permissionsReady)) {
    return (
      <div
        className={cn(
          'hidden lg:flex h-full flex-col bg-white border-r border-gray-200 transition-all duration-300 floating-sidebar',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center border-b border-gray-200 transition-all duration-300',
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
              alt='Las Muñecas de Ramón'
              className={cn('w-auto transition-all duration-300', isCollapsed ? 'h-8' : 'h-10')}
            />
            {!isCollapsed && (
              <span className='text-sm font-bold text-gray-900'>Panel Administrativo</span>
            )}
          </div>
        </div>
        <nav className='flex-1 px-4 py-6 space-y-2 overflow-y-auto'>
          {/* Skeleton del sidebar */}
          {!isCollapsed && (
            <>
              <div className='h-4 bg-gray-200 rounded w-20 mb-4 animate-pulse'></div>
              {[1, 2, 3].map(i => (
                <div key={i} className='h-10 bg-gray-100 rounded animate-pulse mb-2'></div>
              ))}
            </>
          )}
        </nav>
      </div>
    );
  }

  // Log para debugging
  console.log('[Sidebar] Renderizando con permisos:', {
    permissionsCount: permissions.length,
    userRole: user?.role,
    isAdmin,
    permissionsReady
  });

  // Filtrar listas por permisos
  const allowedPrincipal = navigation.filter(item => hasModulePermission(item.module, item.action));
  const allowedHR = hrNavigation.filter(item => hasModulePermission(item.module, item.action));
  const allowedFinance = financeNavigation.filter(item => hasModulePermission(item.module, item.action));
  const allowedService = serviceNavigation.filter(item => hasModulePermission(item.module, item.action));
  const allowedSecondary = secondaryNavigation.filter(item => hasModulePermission(item.module, item.action));

  // Log específico para productos
  console.log('[Sidebar] Verificando módulo productos:', {
    hasProductosVer: hasModulePermission('productos', 'ver'),
    productosPermissions: permissions.filter(p => p.module === 'productos'),
    allPermissions: permissions.map(p => `${p.module}.${p.action}`)
  });

  // Log para debugging
  console.log('[Sidebar] Items permitidos:', {
    principal: allowedPrincipal.length,
    hr: allowedHR.length,
    finance: allowedFinance.length,
    service: allowedService.length,
    secondary: allowedSecondary.length
  });

  const SidebarContent = () => (
    <div
      className={cn(
        'flex h-full flex-col bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 mobile-sidebar transition-all duration-300 floating-sidebar',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
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
          <Image
            src='/img/system/logo1.png'
            alt='Las Muñecas de Ramón'
            width={isCollapsed ? 32 : 180}
            height={isCollapsed ? 32 : 44}
            className={cn('w-auto transition-all duration-300', isCollapsed ? 'h-8' : 'h-11')}
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
                      onClick={() => {
                        if (item.name === 'Dashboard') {
                          console.log('[Sidebar] Click en Dashboard - Usuario:', {
                            nombre: user?.name,
                            apellido: user?.lastName,
                            rol: user?.role
                          });
                        }
                        closeSidebar();
                      }}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg group nav-item',
                        isActive ? 'nav-item-active' : 'text-gray-700 dark:text-neutral-300'
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
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg group nav-item',
                        isActive ? 'nav-item-active' : 'text-gray-700 dark:text-neutral-300'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className='h-5 w-5 flex-shrink-0 nav-icon' />
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
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg group nav-item',
                        isActive ? 'nav-item-active' : 'text-gray-700 dark:text-neutral-300'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className='h-5 w-5 flex-shrink-0 nav-icon' />
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
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg group nav-item',
                        isActive ? 'nav-item-active' : 'text-gray-700 dark:text-neutral-300'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className='h-5 w-5 flex-shrink-0 nav-icon' />
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
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg group nav-item',
                        isActive ? 'nav-item-active' : 'text-gray-700 dark:text-neutral-300'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className='h-5 w-5 flex-shrink-0 nav-icon' />
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
