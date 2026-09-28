'use client';

import { useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  ShoppingBag,
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
  PackageCheck,
  Wine,
  ArrowRightLeft,
  Calendar as CalendarIcon,
  Trophy
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { BARMAN_ROUTE_ALLOWLIST, findSidebarPermission } from '@/lib/constants/route-permissions';

/**
 * Cada ítem es solo presentación: nombre, destino e ícono. El permiso que lo habilita no
 * se declara acá sino en la tabla compartida (`lib/constants/route-permissions`), la misma
 * que usan el middleware y `RouteGuard`, y se resuelve por `href`. Antes cada ítem repetía
 * su par módulo/acción —alguna vez escrito en español, imposible de satisfacer— y el menú
 * podía contradecir a la guarda de la página: el ítem se ocultaba y la página se abría.
 */
type SidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
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
        icon: Home
      },
      {
        name: 'Reportes',
        href: '/reports',
        icon: FileText
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
        icon: ShoppingCart
      },
      {
        name: 'Ventas',
        href: '/sales',
        icon: TrendingUp
      },
      {
        name: 'Cajas',
        href: '/cash-register',
        icon: CreditCard
      },
      {
        name: 'Cuentas',
        href: '/accounts',
        icon: Calculator
      },
      {
        name: 'Crear Privado',
        href: '/rooms',
        icon: Bed
      },
      {
        name: 'Vender Privado',
        href: '/private-rooms',
        icon: Lock
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
        icon: UserCheck
      },
      {
        name: 'Almacén',
        href: '/products',
        icon: Package
      },
      {
        name: 'Envases devueltos',
        href: '/products/containers',
        icon: PackageCheck
      },
      {
        name: 'Transferencia',
        href: '/transfers',
        icon: ArrowRightLeft
      },
      {
        name: 'Compras',
        href: '/purchases',
        icon: ShoppingBag
      },
      {
        name: 'Bar',
        href: '/bar',
        icon: Wine
      },
      {
        name: 'Categorías',
        href: '/categories',
        icon: Tag
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
        icon: Gift
      },
      {
        name: 'Comisiones',
        href: '/commissions',
        icon: Percent
      },
      {
        name: 'Pagos a Trabajadores',
        href: '/payroll',
        icon: DollarSign
      },
      {
        name: 'Detalle Planillas',
        href: '/payroll/calendar',
        icon: CalendarIcon
      },
      {
        name: 'Anticipos',
        href: '/advances',
        icon: DollarSign
      },
      {
        name: 'Gratificaciones',
        href: '/gratificaciones',
        icon: Trophy
      },
      {
        name: 'Devoluciones',
        href: '/returns',
        icon: RotateCcw
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
        icon: Users
      },
      {
        name: 'Roles',
        href: '/roles',
        icon: Shield
      },
      {
        name: 'Asistencias',
        href: '/attendance',
        icon: Clock
      },
      {
        name: 'Horas Extras',
        href: '/overtime',
        icon: Clock
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
        icon: Settings
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

export function useSidebarNavigation(
  options?: UseSidebarNavigationOptions
): UseSidebarNavigationReturn {
  const pathname = usePathname();
  const { user, loading: userLoading } = useCurrentUser();
  const {
    userPermissions: permissions,
    isLoading: permissionsLoading,
    hasPermission
  } = useUserPermissions();

  const isAdmin = user?.role?.toLowerCase() === 'administrador';
  const isBarman = user?.role?.toLowerCase() === 'barman';
  const needsPermissions = Boolean(user) && !isAdmin;
  const permissionsReady = !needsPermissions || permissions.length > 0;
  const loading = userLoading || (needsPermissions && permissionsLoading && !permissionsReady);

  const hasModulePermission = useCallback(
    (item: SidebarItem) => {
      if (isBarman && !BARMAN_ROUTE_ALLOWLIST.includes(item.href)) return false;
      if (isAdmin) return true;
      if (!permissions.length) return false;

      // El par sale de la tabla compartida con el middleware y `RouteGuard`, así el
      // menú no puede ofrecer un destino que la guarda de esa página rechace.
      const permission = findSidebarPermission(item.href);
      // Sin par no hay forma de concederlo desde el panel de Roles: el ítem queda
      // oculto para los no-administradores en lugar de mostrarse a ciegas.
      if (!permission) return false;
      return hasPermission(permission.module, permission.action);
    },
    [hasPermission, isAdmin, isBarman, permissions.length]
  );

  const normalizedSearch = (options?.searchTerm || '').toLowerCase().trim();

  const sections = useMemo(
    () =>
      SIDEBAR_SECTIONS.map(section => ({
        ...section,
        items: section.items
          .map(item =>
            isBarman && item.href === '/dashboard'
              ? { ...item, name: 'Inicio de barra' }
              : isBarman && item.href === '/private-rooms'
                ? { ...item, name: 'Servicios / Privados' }
                : item
          )
          .filter(
            item =>
              hasModulePermission(item) &&
              (!normalizedSearch || item.name.toLowerCase().includes(normalizedSearch))
          )
      })).filter(section => section.items.length > 0),
    [hasModulePermission, normalizedSearch, isBarman]
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
