'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Tags,
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
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Usuarios', href: '/users', icon: Users },
  { name: 'Clientes', href: '/clients', icon: UserCheck },
  { name: 'Productos', href: '/products', icon: Package },
  { name: 'Categorías', href: '/categories', icon: Tags },
  { name: 'Pedidos', href: '/orders', icon: ShoppingCart },
  { name: 'Reportes', href: '/reports', icon: FileText },
  { name: 'Ventas', href: '/sales', icon: TrendingUp }
];

const hrNavigation = [
  { name: 'Roles', href: '/roles', icon: Shield },
  // Mantenemos los enlaces pero los marcamos como en desarrollo
  { name: 'Asistencias', href: '/attendance', icon: Clock },
  { name: 'Horas Extras', href: '/overtime', icon: Clock },
  { name: 'Planillas (En desarrollo)', href: '#', icon: ClipboardList }
];

const financeNavigation = [
  { name: 'Cajas', href: '/cash-register', icon: CreditCard },
  { name: 'Cuentas', href: '/accounts', icon: Calculator },
  { name: 'Propinas', href: '/tips', icon: Gift },
  { name: 'Comisiones', href: '/commissions', icon: Percent },
  { name: 'Anticipos', href: '/advances', icon: DollarSign },
  { name: 'Devoluciones', href: '/returns', icon: RotateCcw }
];

const serviceNavigation = [
  { name: 'Habitaciones', href: '/rooms', icon: Bed },
  { name: 'Privados', href: '/private-rooms', icon: Lock }
];

const secondaryNavigation = [
  { name: 'Configuración', href: '/settings', icon: Settings },
  { name: 'Notificaciones', href: '/notifications', icon: Bell },
  { name: 'Ayuda', href: '/help', icon: HelpCircle },
  { name: 'API Docs', href: '/api-docs', icon: FileText }
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const { isSidebarOpen, closeSidebar } = useSidebar();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Evitar renderizado durante SSR para prevenir errores de hidratación
  if (!mounted) {
    return (
      <div className='hidden lg:flex h-full w-64 flex-col bg-white border-r border-gray-200'>
        <div className='flex h-16 items-center px-6 border-b border-gray-200'>
          <div className='flex items-center gap-2'>
            <div className='h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600'></div>
            <span className='text-xl font-bold text-gray-900'>AdminPro</span>
          </div>
        </div>
        <nav className='flex-1 px-4 py-6 space-y-8 overflow-y-auto'>
          {/* Skeleton del sidebar */}
        </nav>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className='flex h-full w-64 flex-col bg-white border-r border-gray-200 mobile-sidebar'>
      <div className='flex h-16 items-center px-6 border-b border-gray-200'>
        <div className='flex items-center gap-2'>
          <div className='h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600'></div>
          <span className='text-xl font-bold text-gray-900'>AdminPro</span>
        </div>
        {/* Botón de cerrar para móviles */}
        <button
          onClick={closeSidebar}
          className='lg:hidden ml-auto p-2 rounded-md hover:bg-gray-100 transition-colors'
        >
          <X className='h-5 w-5 text-gray-500' />
        </button>
      </div>

      <nav className='flex-1 px-4 py-6 space-y-8 overflow-y-auto'>
        <div>
          <h3 className='px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
            Principal
          </h3>
          <ul className='space-y-1'>
            {navigation.map(item => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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

        <div>
          <h3 className='px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
            Recursos Humanos
          </h3>
          <ul className='space-y-1'>
            {hrNavigation.map(item => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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

        <div>
          <h3 className='px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
            Finanzas
          </h3>
          <ul className='space-y-1'>
            {financeNavigation.map(item => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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

        <div>
          <h3 className='px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
            Servicios
          </h3>
          <ul className='space-y-1'>
            {serviceNavigation.map(item => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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

        <div>
          <h3 className='px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
            Configuración
          </h3>
          <ul className='space-y-1'>
            {secondaryNavigation.map(item => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={closeSidebar} // Cerrar sidebar al hacer clic en un enlace en móviles
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
