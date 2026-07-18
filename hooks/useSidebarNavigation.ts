'use client';

import { useMemo, useCallback } from 'react';
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
  Trophy
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

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

type UseSidebarNavigationOptions = {
  searchTerm?: string;
};

type VisibleSection = SidebarSection & {
  items: SidebarItem[];
};

type UseSidebarNavigationReturn = {
  sections: VisibleSection[];
  isAdmin: boolean;
  loading: boolean;
  hasModulePermission: (item: SidebarItem) => boolean;
  SIDEBAR_SECTIONS: SidebarSection[];
};

export function useSidebarNavigation(options?: UseSidebarNavigationOptions): UseSidebarNavigationReturn {
  const pathname = usePathname();
  const { user, loading: userLoading } = useCurrentUser();
  const {
    userPermissions: permissions,
    isLoading: permissionsLoading,
    hasPermission
  } = useUserPermissions();

  const isAdmin = user?.role?.toLowerCase() === 'administrador';
  const needsPermissions = Boolean(user) && !isAdmin;
  const permissionsReady = !needsPermissions || permissions.length > 0;
  const loading = userLoading || (needsPermissions && permissionsLoading && !permissionsReady);

  const hasModulePermission = useCallback(
    (item: SidebarItem) => {
      if (isAdmin) return true;
      if (!permissions.length) return false;
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

  const normalizedSearch = (options?.searchTerm || '').toLowerCase().trim();

  const sections = useMemo(
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

  return {
    sections,
    isAdmin,
    loading,
    hasModulePermission,
    SIDEBAR_SECTIONS
  };
}

export type { SidebarItem, SidebarSection, VisibleSection, UseSidebarNavigationReturn };
