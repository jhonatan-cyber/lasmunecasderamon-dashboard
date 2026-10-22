import { expect } from 'vitest';

/**
 * Contrato público de los barriles de hooks (`hooks/<dominio>/index.ts`).
 *
 * Cada barril es la única puerta de entrada de su dominio para el resto de la
 * app, así que se fijan tres cosas a la vez:
 *
 *  1. El conjunto EXACTO de exports de valor: no puede faltar ninguno (un
 *     refactor que rompa un re-export lo atrapa) ni sobrar ninguno (un helper
 *     interno que se cuele en el barril ensucia la API pública).
 *  2. La forma de cada export: todo `use*` debe ser función; los que no siguen
 *     la convención se declaran aparte y también se verifican.
 *  3. Los exports de tipo: se importan más abajo y se referencian en
 *     `ContratoDeTiposPublicos`, de modo que `pnpm typecheck` falla si alguno
 *     desaparece del barril.
 *
 * El contrato se reparte en `TRAMOS` (varios archivos de test) porque importar
 * el barril `accounts` arrastra el grafo de módulos más pesado del paquete y un
 * único archivo lo pagaba todo junto: superaba el presupuesto de 30 s por
 * archivo que vigila `DurationBudgetReporter` y rozaba el timeout de RPC de
 * Vitest. Un tramo por archivo mantiene cada archivo muy por debajo (el tramo
 * más caro es el propio `accounts`).
 */

/** Convención React: un hook es `use` + Mayúscula (`userFormSchema` no lo es). */
export const ES_HOOK = /^use[A-Z0-9]/;

export type ContratoBarril = {
  /** Thunk estático para que Vite resuelva cada import en tiempo de build. */
  cargar: () => Promise<unknown>;
  /** Exportados de valor exactos que debe exponer el barril. */
  valores: readonly string[];
  /** Exportados sin convención `use*` que sí deben ser funciones. */
  funciones: readonly string[];
};

export const BARRILES = {
  accounts: {
    cargar: () => import('@/hooks/accounts/index'),
    valores: [
      'useAccountForm',
      'useCuentaAnulacion',
      'useCuentaCobro',
      'useCuentaDetail',
      'useCuentaDetailModal',
      'useCuentaFormLogic',
      'useCuentaStatsCalculations',
      'useCuentaTableLogic',
      'useProductCart',
      'useProductSearch'
    ],
    funciones: []
  },
  'api-docs': {
    cargar: () => import('@/hooks/api-docs/index'),
    valores: ['useSwaggerWarnings'],
    funciones: []
  },
  attendance: {
    cargar: () => import('@/hooks/attendance/index'),
    valores: ['useAttendanceDetail', 'useBiometricPreview'],
    funciones: []
  },
  auth: {
    cargar: () => import('@/hooks/auth/index'),
    valores: [
      'useCurrentUser',
      'useLoginForm',
      'usePermissions',
      'useSessionCheck',
      'useUserPermissions'
    ],
    funciones: []
  },
  calendar: {
    cargar: () => import('@/hooks/calendar/index'),
    valores: ['useCalendarActions', 'useRoleCalendar'],
    funciones: []
  },
  'cash-register': {
    cargar: () => import('@/hooks/cash-register/index'),
    valores: [
      'useCashRegister',
      'useCashRegisterStatus',
      'useCuentas',
      'useReabrirCierre',
      'useReenviarAvisoCierre',
      'useSales'
    ],
    funciones: []
  },
  clients: {
    cargar: () => import('@/hooks/clients/index'),
    valores: ['useClientForm', 'useClientModals', 'useClients', 'useClientTable', 'usePrepagoForm'],
    funciones: []
  },
  hostess: {
    cargar: () => import('@/hooks/hostess/index'),
    valores: ['useAnfitrionaServicios'],
    funciones: []
  },
  notifications: {
    cargar: () => import('@/hooks/notifications/index'),
    valores: ['useNotifications'],
    funciones: []
  },
  orders: {
    cargar: () => import('@/hooks/orders/index'),
    valores: [
      'useOrderDetail',
      'useOrderDetailModal',
      'useOrderDetailModalState',
      'useOrderForm',
      'useOrders',
      'useOrdersList',
      'useOrdersSSE'
    ],
    funciones: []
  },
  'private-rooms': {
    cargar: () => import('@/hooks/private-rooms/index'),
    valores: ['usePrivateRoomSummary', 'useServicioForm'],
    funciones: []
  },
  products: {
    cargar: () => import('@/hooks/products/index'),
    valores: [
      'claveColaDeEscaneos',
      'MOTIVO_ENVASE',
      'useContainerScan',
      'useCategories',
      'useCategoryForm',
      'useCategoryModals',
      'useProductForm',
      'useProducts'
    ],
    funciones: ['claveColaDeEscaneos']
  },
  realtime: {
    cargar: () => import('@/hooks/realtime/index'),
    valores: ['useRealtimeInvalidation', 'useRealtimeRefresh'],
    funciones: []
  },
  rooms: {
    cargar: () => import('@/hooks/rooms/index'),
    valores: ['useAvailableRooms', 'useHabitaciones', 'useRoomForm', 'useRooms'],
    funciones: []
  },
  sales: {
    cargar: () => import('@/hooks/sales/index'),
    valores: [
      'useChampagneRule',
      'useNewSaleForm',
      'useSaleAnulacionForm',
      'useSaleHostessLogic',
      'useSaleProductModal',
      'useSaleProductSearch',
      'useSalesList',
      'useSaleValidation'
    ],
    funciones: []
  },
  services: {
    cargar: () => import('@/hooks/services/index'),
    valores: [
      'SERVICIOS_QUERY_KEY',
      'useAllServicios',
      'useServicios',
      'useDevolucionFilters',
      'useDevolucionLogic',
      'useDevolucionResponse',
      'useDevolucionVentasLogic',
      'useEditServiceForm',
      'useServiceAnulacionForm',
      'useServiceFormValidation',
      'useServiceLogic',
      'useServiceMutations',
      'useServicePricing',
      'useServicioTimerSync'
    ],
    funciones: []
  },
  settings: {
    cargar: () => import('@/hooks/settings/index'),
    valores: ['invalidateSettingsProducts', 'useSettingsProducts', 'useSettingsLogs'],
    funciones: ['invalidateSettingsProducts']
  },
  shared: {
    cargar: () => import('@/hooks/shared/index'),
    valores: [
      'cargarConfiguraciones',
      'refrescarConfiguraciones',
      'useConfig',
      'useConfigValue',
      'valorDeConfig',
      'useConfirmModal',
      'useGenericFetch',
      'useGenericFilters',
      'useGenericMutations',
      'useMasterData',
      'useNumberFormatter',
      'usePersistentTab',
      'useRefreshOnFocus',
      'useSharedSSE',
      'useSingleFlight',
      'useSSE'
    ],
    funciones: ['cargarConfiguraciones', 'refrescarConfiguraciones', 'valorDeConfig']
  },
  shell: {
    cargar: () => import('@/hooks/shell/index'),
    valores: ['useSidebarNavigation'],
    funciones: []
  },
  staff: {
    cargar: () => import('@/hooks/staff/index'),
    valores: [
      'useAdvanceForm',
      'useAdvancesTable',
      'useAnfitrionas',
      'useAnticipos',
      'useAsistencias',
      'useAttendanceStats',
      'useChampagneTiers',
      'useCommissions',
      'useCommissionStats',
      'useEmployees',
      'useGratificaciones',
      'useGratificacionForm',
      'useOvertime',
      'useOvertimeForm',
      'useOvertimeTable',
      'usePayroll',
      'usePayrollSummary',
      'userFormSchema',
      'useUserForm',
      'useRoleForm',
      'useRoles',
      'useTips',
      'useTipsDetalle',
      'useTipsResumen',
      'useUsers'
    ],
    funciones: []
  },
  statistics: {
    cargar: () => import('@/hooks/statistics/index'),
    valores: ['useDashboardComposite', 'useDashboardSummary', 'useLoggedUsersStats', 'useStats'],
    funciones: []
  },
  timers: {
    cargar: () => import('@/hooks/timers/index'),
    valores: [
      'loadTimersFromStorage',
      'saveTimersToStorage',
      'useTimerActions',
      'useTimerAudio',
      'useTimerExpiration',
      'useTimerSync'
    ],
    funciones: ['loadTimersFromStorage', 'saveTimersToStorage']
  },
  transfers: {
    cargar: () => import('@/hooks/transfers/index'),
    valores: ['useTransferForm', 'useTransferPermissions', 'useTransferSubmit'],
    funciones: []
  }
} satisfies Record<string, ContratoBarril>;

/**
 * Reparto del contrato por archivo de test. `accounts` va solo porque su
 * import paga el grafo compartido más grande; el resto se reparte por familia
 * para que ningún archivo vuelva a acercarse al presupuesto.
 */
export const TRAMOS = {
  cuentas: ['accounts'],
  ventas: ['cash-register', 'clients', 'orders', 'private-rooms', 'products', 'sales'],
  operacion: [
    'api-docs',
    'attendance',
    'auth',
    'calendar',
    'hostess',
    'notifications',
    'realtime',
    'rooms',
    'settings',
    'shell',
    'statistics',
    'timers',
    'transfers'
  ],
  nucleo: ['services', 'shared', 'staff']
} as const satisfies Record<string, readonly (keyof typeof BARRILES)[]>;

/** Pares `[dominio, contrato]` listos para `it.each`. */
export function barrilesDelTramo(
  tramo: readonly (keyof typeof BARRILES)[]
): (readonly [string, ContratoBarril])[] {
  return tramo.map(nombre => [nombre as string, BARRILES[nombre]] as const);
}

/** Verifica el conjunto exacto de exports y la forma de cada uno. */
export async function verificarContrato(dominio: string, contrato: ContratoBarril): Promise<void> {
  const modulo = (await contrato.cargar()) as Record<string, unknown>;

  expect(Object.keys(modulo).sort()).toEqual([...contrato.valores].sort());

  for (const nombre of contrato.valores) {
    expect(
      modulo[nombre],
      `el export «${nombre}» de ${dominio} no debe ser undefined`
    ).toBeDefined();
  }

  for (const nombre of contrato.valores) {
    if (ES_HOOK.test(nombre)) {
      expect(typeof modulo[nombre], `«${nombre}» debe ser un hook (función)`).toBe('function');
    }
  }

  for (const nombre of contrato.funciones) {
    expect(contrato.valores).toContain(nombre);
    expect(ES_HOOK.test(nombre)).toBe(false);
    expect(typeof modulo[nombre], `«${nombre}» debe ser una función`).toBe('function');
  }
}

/**
 * Contrato de tipos: si un barril deja de exportar uno de estos tipos,
 * `pnpm typecheck` falla aquí. Los nombres son únicos entre barriles, por eso
 * se importan en una sola lista.
 */
export type ContratoDeTiposPublicos = [
  // attendance
  AsistenciaDetalle,
  // auth
  LoginFormData,
  UserTemp,
  Permission,
  UserPermission,
  // calendar
  CalendarData,
  DataType,
  RoleType,
  UseRoleCalendarProps,
  UseRoleCalendarReturn,
  // cash-register
  CierreCajaResultado,
  ReabrirCierreResultado,
  ReenvioAvisoResultado,
  // clients
  ClientFormValues,
  // hostess
  Service,
  SortDirection,
  StatusFilter,
  UseAnfitrionaServiciosReturn,
  // orders
  Order,
  SolicitudServicio,
  OrderCategory,
  OrderProducto,
  OrderProductoPayload,
  // private-rooms
  ServicioFormState,
  // products
  Category,
  EscaneoEnvase,
  PresentacionFormItem,
  ProductFormValues,
  UnidadCodigoItem,
  // rooms
  RoomFormValues,
  // sales
  HostessSelections,
  SaleProductModalState,
  SaleProductViewMode,
  UseSaleProductModalOptions,
  SaleFormState,
  // services
  DevolucionFilters,
  UseServiceFormValidationReturn,
  UseServiceMutationsReturn,
  // settings
  AuditLog,
  ErrorLog,
  SettingsProduct,
  // shell
  SidebarItem,
  SidebarSection,
  UseSidebarNavigationReturn,
  VisibleSection,
  // staff
  AltaEquipoInfo,
  LectorSyncInfo,
  Anticipo,
  ChampagneTier,
  GratificacionFormValues,
  OvertimeDetail,
  PayrollRow,
  RoleFilter,
  Role,
  RoleFormValues,
  UpdateGratificacionRequest,
  UserFormValues,
  // statistics
  DashboardBusinessStats,
  DashboardCompositeResponse,
  DashboardInsightsResponse,
  DashboardPendingItem,
  DashboardPendingItemsResponse,
  DashboardRankingItem,
  DashboardTrend,
  RecentActivityItem,
  DashboardSummary,
  LoggedRoleStats,
  LoggedUsersStatsResponse,
  // transfers
  TransferForm
];

import type { AsistenciaDetalle } from '@/hooks/attendance';
import type { LoginFormData, Permission, UserPermission, UserTemp } from '@/hooks/auth';
import type {
  CalendarData,
  DataType,
  RoleType,
  UseRoleCalendarProps,
  UseRoleCalendarReturn
} from '@/hooks/calendar';
import type {
  CierreCajaResultado,
  ReabrirCierreResultado,
  ReenvioAvisoResultado
} from '@/hooks/cash-register';
import type { ClientFormValues } from '@/hooks/clients';
import type {
  Service,
  SortDirection,
  StatusFilter,
  UseAnfitrionaServiciosReturn
} from '@/hooks/hostess';
import type {
  Order,
  OrderCategory,
  OrderProducto,
  OrderProductoPayload,
  SolicitudServicio
} from '@/hooks/orders';
import type { ServicioFormState } from '@/hooks/private-rooms';
import type {
  Category,
  EscaneoEnvase,
  PresentacionFormItem,
  ProductFormValues,
  UnidadCodigoItem
} from '@/hooks/products';
import type { RoomFormValues } from '@/hooks/rooms';
import type {
  HostessSelections,
  SaleFormState,
  SaleProductModalState,
  SaleProductViewMode,
  UseSaleProductModalOptions
} from '@/hooks/sales';
import type {
  DevolucionFilters,
  UseServiceFormValidationReturn,
  UseServiceMutationsReturn
} from '@/hooks/services';
import type { AuditLog, ErrorLog, SettingsProduct } from '@/hooks/settings';
import type {
  SidebarItem,
  SidebarSection,
  UseSidebarNavigationReturn,
  VisibleSection
} from '@/hooks/shell';
import type {
  AltaEquipoInfo,
  Anticipo,
  ChampagneTier,
  GratificacionFormValues,
  LectorSyncInfo,
  OvertimeDetail,
  PayrollRow,
  Role,
  RoleFilter,
  RoleFormValues,
  UpdateGratificacionRequest,
  UserFormValues
} from '@/hooks/staff';
import type {
  DashboardBusinessStats,
  DashboardCompositeResponse,
  DashboardInsightsResponse,
  DashboardPendingItem,
  DashboardPendingItemsResponse,
  DashboardRankingItem,
  DashboardSummary,
  DashboardTrend,
  LoggedRoleStats,
  LoggedUsersStatsResponse,
  RecentActivityItem
} from '@/hooks/statistics';
import type { TransferForm } from '@/hooks/transfers';
