'use client';

import { getEmployeeModules } from '@/lib/constants/employee-modules';
import { useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightLeft,
  Banknote,
  Bed,
  Calculator,
  Calendar as CalendarIcon,
  CalendarRange,
  Clock,
  DollarSign,
  FileText,
  Gift,
  HandCoins,
  Home,
  Lock,
  Package,
  PackageCheck,
  Percent,
  RotateCcw,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  SprayCan,
  Tag,
  Ticket,
  Timer,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wine
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { BARMAN_ROUTE_ALLOWLIST, findSidebarPermission } from '@/lib/constants/route-permissions';
import { accesoLimpieza } from '@/lib/business/limpieza';

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

/**
 * Orden pensado para el uso diario: primero el resumen, luego el servicio en
 * piso, los canales de venta, el catálogo, los clientes, el dinero y por último
 * la administración del sistema. Cada destino mantiene un ícono propio para que
 * la barra se lea de un vistazo.
 */
const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    key: 'overview',
    title: 'Vista general',
    description: 'Resumen y reportes.',
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
    description: 'Servicio, caja y privados.',
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
        name: 'Cuentas',
        href: '/accounts',
        icon: Calculator
      },
      {
        name: 'Cajas',
        href: '/cash-register',
        icon: Banknote
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
    key: 'sales-points',
    title: 'Puntos de venta',
    description: 'Barra y canales de venta.',
    items: [
      {
        name: 'Bar',
        href: '/bar',
        icon: Wine
      },
      {
        name: 'Colaciones',
        href: '/meals',
        icon: UtensilsCrossed
      },
      {
        name: 'Entradas',
        href: '/tickets',
        icon: Ticket
      }
    ]
  },
  {
    key: 'inventory',
    title: 'Inventario',
    description: 'Bodega y abastecimiento.',
    items: [
      {
        name: 'Bodega',
        href: '/products',
        icon: Package
      },
      {
        name: 'Categorías',
        href: '/categories',
        icon: Tag
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
        name: 'Envases devueltos',
        href: '/products/containers',
        icon: PackageCheck
      },
      {
        name: 'Insumos de limpieza',
        href: '/cleaning',
        icon: SprayCan
      }
    ]
  },
  {
    key: 'clients',
    title: 'Clientes',
    description: 'Fichas y devoluciones.',
    items: [
      {
        name: 'Clientes',
        href: '/clients',
        icon: UserCheck
      },
      {
        name: 'Devoluciones',
        href: '/returns',
        icon: RotateCcw
      }
    ]
  },
  {
    key: 'finance',
    title: 'Finanzas',
    description: 'Pagos e incentivos.',
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
        icon: CalendarRange
      },
      {
        name: 'Anticipos',
        href: '/advances',
        icon: HandCoins
      },
      {
        name: 'Gratificaciones',
        href: '/gratifications',
        icon: Trophy
      }
    ]
  },
  {
    key: 'team',
    title: 'Equipo',
    description: 'Usuarios y jornada.',
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
        icon: Timer
      }
    ]
  },
  {
    key: 'settings',
    title: 'Configuración',
    description: 'Ajustes de la plataforma.',
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
  role: string | null;
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
      const personal = getEmployeeModules(user?.role).some(module => module.href === item.href);
      if (personal) return true;
      if (isBarman && !BARMAN_ROUTE_ALLOWLIST.includes(item.href)) return false;
      if (item.href === '/cleaning') return accesoLimpieza(user?.role || '').ubicaciones.length > 0;
      if (isAdmin) return true;
      if (!permissions.length) return false;
      const permission = findSidebarPermission(item.href);
      if (!permission) return false;
      return hasPermission(permission.module, permission.action);
    },
    [hasPermission, isAdmin, isBarman, permissions.length, user?.role]
  );

  const normalizedSearch = (options?.searchTerm || '').toLowerCase().trim();

  const sections = useMemo(() => {
    const personalSection: SidebarSection = {
      key: 'personal',
      title: 'Mi actividad',
      description: 'Tu jornada y tus pagos.',
      items: getEmployeeModules(user?.role).map(item => ({
        ...item,
        icon:
          item.key === 'calendar' || item.key === 'asistencias'
            ? CalendarIcon
            : item.key === 'horas-extras'
              ? Clock
              : DollarSign
      }))
    };
    return [...SIDEBAR_SECTIONS.slice(0, 1), personalSection, ...SIDEBAR_SECTIONS.slice(1)]
      .map(section => ({
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
      }))
      .filter(section => section.items.length > 0);
  }, [hasModulePermission, normalizedSearch, isBarman, user?.role]);

  return {
    sections,
    isAdmin,
    role: user?.role ?? null,
    loading,
    hasModulePermission,
    SIDEBAR_SECTIONS
  };
}

export type { SidebarItem, SidebarSection, VisibleSection, UseSidebarNavigationReturn };
